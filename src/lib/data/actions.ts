import { actionWhere, type Viewer } from "../access";
import { getDb } from "../db";
import { recordSensitiveReads } from "./audit";

export async function listActions(viewer: Viewer) {
  const actions = await getDb().action.findMany({
    where: { AND: [actionWhere(viewer), { retiredAt: null }] },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { level: true, status: true },
  });
  await recordSensitiveReads(viewer.id, "Action", actions);
  return actions;
}

export async function getAction(viewer: Viewer, id: string) {
  const action = await getDb().action.findFirst({
    where: { AND: [{ id }, actionWhere(viewer)] },
    include: { level: true, status: true },
  });
  if (action) await recordSensitiveReads(viewer.id, "Action", [action]);
  return action;
}

// El historial usa el mismo filtro: quien no ve la acción no ve su historial.
export async function getActionHistory(viewer: Viewer, id: string) {
  const action = await getDb().action.findFirst({
    where: { AND: [{ id }, actionWhere(viewer)] },
    select: { id: true, level: { select: { isSensitive: true } } },
  });
  if (!action) return null;
  await recordSensitiveReads(viewer.id, "Action", [action]);
  return getDb().changeLog.findMany({
    where: { actionId: id },
    orderBy: { createdAt: "desc" },
  });
}
