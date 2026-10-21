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

export type UpdateMeetingDateResult = { ok: true } | { ok: false; error: "sin_permiso" | "no_existe" };

// Corrige la fecha de la reunión (por ejemplo, la que dice el texto cargado). Solo la asistente dueña.
export async function updateMeetingDate(viewer: Viewer, id: string, heldAt: Date): Promise<UpdateMeetingDateResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const found = await db.meeting.updateMany({ where: { AND: [{ id }, meetingWhere(viewer)] }, data: { heldAt } });
  if (found.count === 0) return { ok: false, error: "no_existe" };
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Meeting", entityId: id } });
  return { ok: true };
}
