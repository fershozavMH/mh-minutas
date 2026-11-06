import { getDb } from "../db";

// Cada lectura de un nivel sensible queda registrada, sin guardar el contenido.
export async function recordSensitiveReads(
  viewerId: string,
  entity: "Meeting" | "Action",
  rows: { id: string; level: { isSensitive: boolean } }[],
) {
  const sensitive = rows.filter((row) => row.level.isSensitive);
  if (sensitive.length === 0) return;
  await getDb().auditLog.createMany({
    data: sensitive.map((row) => ({ userId: viewerId, kind: "READ" as const, entity, entityId: row.id })),
  });
}
