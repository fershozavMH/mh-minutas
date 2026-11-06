import { canUseLevel, meetingWhere, type Viewer } from "../access";
import { getDb } from "../db";
import type { CreateMeetingInput } from "../meeting-schemas";
import { recordSensitiveReads } from "./audit";

// Única puerta de lectura de reuniones: todo pasa por el filtro de nivel.
export async function listMeetings(viewer: Viewer) {
  const meetings = await getDb().meeting.findMany({
    where: meetingWhere(viewer),
    orderBy: { heldAt: "desc" },
    include: { level: true },
  });
  await recordSensitiveReads(viewer.id, "Meeting", meetings);
  return meetings;
}

export async function getMeeting(viewer: Viewer, id: string) {
  const meeting = await getDb().meeting.findFirst({
    where: { AND: [{ id }, meetingWhere(viewer)] },
    include: { level: true, sources: { select: { id: true, origin: true, createdAt: true } }, reviewItems: true },
  });
  if (meeting) await recordSensitiveReads(viewer.id, "Meeting", [meeting]);
  return meeting;
}

export type CreateMeetingResult =
  | { ok: true; id: string }
  | { ok: false; error: "sin_permiso" | "nivel_no_valido" | "nivel_no_permitido" };

// Solo las asistentes capturan reuniones, y nunca en un nivel superior al suyo.
export async function createMeeting(viewer: Viewer, input: CreateMeetingInput): Promise<CreateMeetingResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const level = await db.level.findUnique({ where: { id: input.levelId } });
  if (!level) return { ok: false, error: "nivel_no_valido" };
  if (!canUseLevel(viewer, level)) return { ok: false, error: "nivel_no_permitido" };

  const meeting = await db.meeting.create({
    data: { title: input.title, heldAt: input.heldAt, levelId: level.id, createdById: viewer.id },
  });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Meeting", entityId: meeting.id } });
  return { ok: true, id: meeting.id };
}

export type UpdateMeetingResult =
  | { ok: true }
  | { ok: false; error: "sin_permiso" | "no_existe" | "nivel_no_valido" | "nivel_no_permitido" | "solo_subir_nivel" };

// Corrige la fecha de la reunión o le sube el nivel (por ejemplo, a sensible). Solo la asistente dueña.
// Bajar un nivel no se permite aquí: expondría contenido que ya se capturó con más reserva.
export async function updateMeeting(
  viewer: Viewer,
  id: string,
  changes: { heldAt?: Date; levelId?: string },
): Promise<UpdateMeetingResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const meeting = await db.meeting.findFirst({
    where: { AND: [{ id }, meetingWhere(viewer)] },
    include: { level: true },
  });
  if (!meeting) return { ok: false, error: "no_existe" };

  const data: { heldAt?: Date; levelId?: string } = {};
  if (changes.heldAt) data.heldAt = changes.heldAt;
  if (changes.levelId && changes.levelId !== meeting.levelId) {
    const level = await db.level.findUnique({ where: { id: changes.levelId } });
    if (!level || !level.active) return { ok: false, error: "nivel_no_valido" };
    if (!canUseLevel(viewer, level)) return { ok: false, error: "nivel_no_permitido" };
    if (level.rank < meeting.level.rank) return { ok: false, error: "solo_subir_nivel" };
    data.levelId = level.id;
  }
  if (Object.keys(data).length > 0) await db.meeting.update({ where: { id }, data });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Meeting", entityId: id } });
  return { ok: true };
}

export type UpdateMeetingDateResult = { ok: true } | { ok: false; error: "sin_permiso" | "no_existe" };

export async function updateMeetingDate(viewer: Viewer, id: string, heldAt: Date): Promise<UpdateMeetingDateResult> {
  const result = await updateMeeting(viewer, id, { heldAt });
  if (result.ok) return result;
  return { ok: false, error: result.error === "sin_permiso" ? "sin_permiso" : "no_existe" };
}
