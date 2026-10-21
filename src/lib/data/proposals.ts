import { meetingWhere, type Viewer } from "../access";
import { type AiClient, AiOutputError, createAiClient, proposeFromTranscript } from "../ai/propose";
import { getDb } from "../db";
import { detectSensitiveTopics } from "../sensitive-topics";

export type ProposalResult =
  | { ok: true; count: number }
  | { ok: false; error: "posible_sensible"; topics: string[] }
  | {
      ok: false;
      error: "sin_permiso" | "no_existe" | "nivel_sensible" | "ya_propuesto" | "limite_diario" | "ia_no_configurada" | "ia_fallo";
    };

// Tope de llamadas a la IA por persona en 24 h (AI_DAILY_LIMIT; por defecto 30, estimado).
export function dailyAiLimit(env: Record<string, string | undefined> = process.env) {
  const value = Number(env.AI_DAILY_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : 30;
}

// La IA solo propone: cada resultado queda como ReviewItem pendiente hasta que una persona lo apruebe.
// Un nivel sensible nunca llega a la IA: se corta aquí, antes de crear el cliente o enviar texto alguno.
export async function requestProposal(
  viewer: Viewer,
  meetingId: string,
  sourceId: string,
  deps: { client?: AiClient; acknowledgeTopics?: boolean } = {},
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

  // Alerta: el texto parece tocar un tema sensible aunque la reunión no esté marcada así.
  // Solo se envía a la IA si la persona lo confirma, y la confirmación queda en la auditoría.
  const topics = detectSensitiveTopics(source.normalizedText);
  if (topics.length > 0) {
    if (!deps.acknowledgeTopics) return { ok: false, error: "posible_sensible", topics };
    await db.auditLog.create({
      data: { userId: viewer.id, kind: "CHANGE", entity: "AiSensitiveOverride", entityId: sourceId },
    });
  }

  let client: AiClient;
  try {
    client = deps.client ?? createAiClient();
  } catch {
    return { ok: false, error: "ia_no_configurada" };
  }

  // Cada llamada se registra antes de hacerla: así el tope cuenta también las que fallan.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await db.auditLog.count({
    where: { userId: viewer.id, entity: "AiCall", createdAt: { gte: since } },
  });
  if (used >= dailyAiLimit()) return { ok: false, error: "limite_diario" };
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "AiCall", entityId: sourceId } });

  let proposal;
  try {
    proposal = await proposeFromTranscript(client, source.normalizedText, {
      meetingDate: source.meeting.heldAt.toISOString().slice(0, 10),
    });
  } catch (error) {
    if (!(error instanceof AiOutputError)) console.error("Error al llamar a la IA", error);
    return { ok: false, error: "ia_fallo" };
  }

  // Si otra solicitud simultánea ya guardó la propuesta, se descarta esta para no duplicar.
  if ((await db.reviewItem.count({ where: { sourceId } })) > 0) return { ok: false, error: "ya_propuesto" };

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
