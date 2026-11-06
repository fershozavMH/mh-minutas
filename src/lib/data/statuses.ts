import { getDb } from "../db";

// Estados de acción activos, en su orden. El primero es el inicial.
export async function listActiveStatuses() {
  return getDb().actionStatus.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}
