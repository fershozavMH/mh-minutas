import { meetingWhere, type Viewer } from "../access";
import { getDb } from "../db";
import { hashText, normalizeTranscript } from "../transcript";

export type AddSourceResult =
  | { ok: true; id: string }
  | { ok: false; error: "sin_permiso" | "no_existe" | "texto_vacio" | "duplicado" };

// Guarda el texto normalizado y su huella, no el archivo original.
// Solo la asistente dueña de la reunión puede agregar transcripts.
export async function addSource(
  viewer: Viewer,
  meetingId: string,
  input: { origin: string; text: string },
): Promise<AddSourceResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const meeting = await db.meeting.findFirst({
    where: { AND: [{ id: meetingId }, meetingWhere(viewer)] },
    select: { id: true },
  });
  if (!meeting) return { ok: false, error: "no_existe" };

  const normalizedText = normalizeTranscript(input.text);
  if (!normalizedText) return { ok: false, error: "texto_vacio" };
  const textHash = hashText(normalizedText);

  try {
    const source = await db.source.create({
      data: { meetingId: meeting.id, origin: input.origin, normalizedText, textHash, uploadedById: viewer.id },
    });
    await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Source", entityId: source.id } });
    return { ok: true, id: source.id };
  } catch (error) {
    // Mismo texto ya cargado en esta reunión (índice único reunión + huella).
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return { ok: false, error: "duplicado" };
    }
    throw error;
  }
}
