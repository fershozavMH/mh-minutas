import { meetingWhere, type Viewer } from "../access";
import { type AiClient, AiOutputError, createAiClient, proposeFromTranscript } from "../ai/propose";
import { getDb } from "../db";

export type ProposalResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: "sin_permiso" | "no_existe" | "nivel_sensible" | "ya_propuesto" | "ia_no_configurada" | "ia_fallo";
    };

// La IA solo propone: cada resultado queda como ReviewItem pendiente hasta que una persona lo apruebe.
// Un nivel sensible nunca llega a la IA: se corta aquí, antes de crear el cliente o enviar texto alguno.
export async function requestProposal(
  viewer: Viewer,
  meetingId: string,
  sourceId: string,
  deps: { client?: AiClient } = {},
): Promise<ProposalResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const source = await db.source.findFirst({
    where: { id: sourceId, meetingId, meeting: meetingWhere(viewer) },
    include: { meeting: { select: { id: true, heldAt: true, level: { select: { isSensitive: true } } } } },
  });
  if (!source) return { ok: false, error: "no_existe" };
  if (source.meeting.level.isSensitive) {
    // El intento queda registrado (sin contenido) para poder revisarlo en la auditoría.
    await db.auditLog.create({ data: { userId: viewer.id, kind: "READ", entity: "AiBlocked", entityId: sourceId } });
    return { ok: false, error: "nivel_sensible" };
  }
  if ((await db.reviewItem.count({ where: { sourceId } })) > 0) return { ok: false, error: "ya_propuesto" };

  let client: AiClient;
  try {
    client = deps.client ?? createAiClient();
  } catch {
    return { ok: false, error: "ia_no_configurada" };
  }

  let proposal;
  try {
    proposal = await proposeFromTranscript(client, source.normalizedText, {
      meetingDate: source.meeting.heldAt.toISOString().slice(0, 10),
    });
  } catch (error) {
    if (!(error instanceof AiOutputError)) console.error("Error al llamar a la IA", error);
    return { ok: false, error: "ia_fallo" };
  }

  const rows = [
    { kind: "SUMMARY" as const, aiValue: { text: proposal.summary } },
    ...proposal.decisions.map((text) => ({ kind: "DECISION" as const, aiValue: { text } })),
    ...proposal.risks.map((text) => ({ kind: "RISK" as const, aiValue: { text } })),
    ...proposal.nextSteps.map((text) => ({ kind: "NEXT_STEP" as const, aiValue: { text } })),
    ...proposal.actions.map((action) => ({ kind: "ACTION" as const, aiValue: action })),
  ];
  await db.reviewItem.createMany({
    data: rows.map((row) => ({ meetingId, sourceId, kind: row.kind, aiValue: row.aiValue })),
  });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Source", entityId: sourceId } });
  return { ok: true, count: rows.length };
}
