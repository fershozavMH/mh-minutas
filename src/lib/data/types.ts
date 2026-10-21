import { getDb } from "../db";

// Tipos de pendiente activos, en su orden.
export async function listActiveTypes() {
  return getDb().actionType.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}
