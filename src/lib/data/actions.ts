import type { Prisma } from "../../generated/prisma/client";
import type { UpdateActionInput } from "../action-schemas";
import { addDays, type ActionFilters, dayStart, todayInHermosillo } from "../action-filters";
import { actionWhere, type Viewer } from "../access";
import { getDb } from "../db";
import { recordSensitiveReads } from "./audit";
import { resolveOwner } from "./owner";

// Los filtros se suman al filtro de visibilidad; nunca lo reemplazan.
function filterWhere(filters: ActionFilters): Prisma.ActionWhereInput {
  const today = dayStart(todayInHermosillo());
  const conditions: Prisma.ActionWhereInput[] = [];
  if (filters.statusId) conditions.push({ statusId: filters.statusId });
  if (filters.meetingId) conditions.push({ meetingId: filters.meetingId });
  if (filters.owner) conditions.push({ ownerName: { contains: filters.owner, mode: "insensitive" } });
  if (filters.due === "none") conditions.push({ dueDate: null });
  if (filters.due === "overdue") conditions.push({ dueDate: { lt: today }, status: { isClosed: false } });
  if (filters.due === "week") {
    conditions.push({ dueDate: { gte: today, lt: dayStart(addDays(todayInHermosillo(), 7)) } });
  }
  return { AND: conditions };
}

export async function listActions(viewer: Viewer, filters: ActionFilters = {}) {
  const actions = await getDb().action.findMany({
    where: { AND: [actionWhere(viewer), { retiredAt: null }, filterWhere(filters)] },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { level: true, status: true, meeting: { select: { id: true, title: true } } },
  });
  await recordSensitiveReads(viewer.id, "Action", actions);
  return actions;
}

export async function getAction(viewer: Viewer, id: string) {
  const action = await getDb().action.findFirst({
    where: { AND: [{ id }, actionWhere(viewer)] },
    include: {
      level: true,
      status: true,
      meeting: { select: { id: true, title: true } },
      replacedBy: { select: { id: true, title: true } },
      replaces: { select: { id: true, title: true } },
    },
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
    include: { author: { select: { name: true } } },
  });
}

// Las retiradas no salen en la lista principal; se consultan aparte, con el mismo filtro.
export async function listRetiredActions(viewer: Viewer) {
  const actions = await getDb().action.findMany({
    where: { AND: [actionWhere(viewer), { retiredAt: { not: null } }] },
    orderBy: { retiredAt: "desc" },
    include: { level: true, status: true, meeting: { select: { id: true, title: true } } },
  });
  await recordSensitiveReads(viewer.id, "Action", actions);
  return actions;
}

export type ActionChangeResult =
  | { ok: true; id?: string }
  | { ok: false; error: "sin_permiso" | "no_existe" | "retirada" | "sin_cambios" | "estado_invalido" | "sin_estado" | "persona_invalida" | "nota_obligatoria" };

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

// Solo la asistente dueña cambia una acción oficial; cada cambio guarda autor, fecha y valor anterior.
export async function updateAction(viewer: Viewer, id: string, input: UpdateActionInput): Promise<ActionChangeResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const action = await db.action.findFirst({
    where: { AND: [{ id }, actionWhere(viewer)] },
    include: { status: true },
  });
  if (!action) return { ok: false, error: "no_existe" };
  if (action.retiredAt) return { ok: false, error: "retirada" };

  const data: Prisma.ActionUncheckedUpdateInput = {};
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (input.title !== undefined && input.title !== action.title) {
    data.title = input.title;
    changes.push({ field: "title", oldValue: action.title, newValue: input.title });
  }
  if (input.ownerId !== undefined || input.ownerName !== undefined) {
    // Con persona del registro manda su nombre; sin ella queda el texto libre.
    const owner = await resolveOwner(input.ownerId, input.ownerName, action.ownerId);
    if (!owner.ok) return { ok: false, error: "persona_invalida" };
    if (owner.ownerName !== action.ownerName) {
      data.ownerName = owner.ownerName;
      changes.push({ field: "ownerName", oldValue: action.ownerName, newValue: owner.ownerName });
    }
    if (owner.ownerId !== action.ownerId) data.ownerId = owner.ownerId;
  }
  if (input.dueDate !== undefined && input.dueDate !== day(action.dueDate)) {
    const due = new Date(`${input.dueDate}T12:00:00.000Z`);
    data.dueDate = due;
    // La fecha de aparición sigue a la de compromiso mientras no se haya movido por separado.
    if (day(action.actionDate) === day(action.dueDate)) data.actionDate = due;
    changes.push({ field: "dueDate", oldValue: day(action.dueDate), newValue: input.dueDate });
  }
  let target = action.status;
  const statusChanged = input.statusId !== undefined && input.statusId !== action.statusId;
  if (statusChanged) {
    const status = await db.actionStatus.findFirst({ where: { id: input.statusId, active: true } });
    if (!status) return { ok: false, error: "estado_invalido" };
    data.statusId = status.id;
    target = status;
    changes.push({ field: "status", oldValue: action.status.name, newValue: status.name });
  }
  // Los estados que piden nota (En espera, Cancelado) no se pueden fijar sin ella.
  // Una acción que ya estaba en ese estado sin nota (de antes) no obliga a ponerla al editar otra cosa.
  if (target.requiresNote) {
    if (statusChanged || input.statusNote !== undefined) {
      const note = input.statusNote ?? "";
      if (note === "") return { ok: false, error: "nota_obligatoria" };
      if (note !== (action.statusNote ?? "")) {
        data.statusNote = note;
        changes.push({ field: "statusNote", oldValue: action.statusNote, newValue: note });
      }
    }
  } else if (statusChanged && action.statusNote) {
    data.statusNote = null;
    changes.push({ field: "statusNote", oldValue: action.statusNote, newValue: null });
  }
  if (changes.length === 0) return { ok: false, error: "sin_cambios" };

  await db.action.update({ where: { id }, data });
  await db.changeLog.createMany({
    data: changes.map((change) => ({ actionId: id, authorId: viewer.id, ...change })),
  });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Action", entityId: id } });
  return { ok: true };
}

// Nunca se borra: se retira con un motivo.
export async function retireAction(viewer: Viewer, id: string, reason: string): Promise<ActionChangeResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const action = await db.action.findFirst({ where: { AND: [{ id }, actionWhere(viewer)] }, select: { id: true } });
  if (!action) return { ok: false, error: "no_existe" };

  const claimed = await db.action.updateMany({
    where: { id, retiredAt: null },
    data: { retiredAt: new Date(), retiredReason: reason },
  });
  if (claimed.count === 0) return { ok: false, error: "retirada" };

  await db.changeLog.create({ data: { actionId: id, authorId: viewer.id, field: "retired", oldValue: null, newValue: reason } });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Action", entityId: id } });
  return { ok: true };
}

// Reemplazar: la acción anterior se retira y apunta a la nueva, que hereda reunión y nivel.
export async function replaceAction(
  viewer: Viewer,
  id: string,
  value: { title: string; ownerName: string | null; ownerId?: string | null; dueDate: string },
): Promise<ActionChangeResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const old = await db.action.findFirst({ where: { AND: [{ id }, actionWhere(viewer)] } });
  if (!old) return { ok: false, error: "no_existe" };

  const owner = await resolveOwner(value.ownerId, value.ownerName);
  if (!owner.ok) return { ok: false, error: "persona_invalida" };

  const status = await db.actionStatus.findFirst({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  if (!status) return { ok: false, error: "sin_estado" };

  const claimed = await db.action.updateMany({
    where: { id, retiredAt: null },
    data: { retiredAt: new Date(), retiredReason: "Reemplazada por otra acción" },
  });
  if (claimed.count === 0) return { ok: false, error: "retirada" };

  try {
    const due = new Date(`${value.dueDate}T12:00:00.000Z`);
    const created = await db.action.create({
      data: {
        title: value.title,
        ownerName: owner.ownerName,
        ownerId: owner.ownerId,
        dueDate: due,
        actionDate: due,
        statusId: status.id,
        levelId: old.levelId,
        meetingId: old.meetingId,
        createdById: viewer.id,
      },
    });
    await db.action.update({ where: { id }, data: { replacedById: created.id } });
    await db.changeLog.createMany({
      data: [
        { actionId: id, authorId: viewer.id, field: "replaced", oldValue: null, newValue: created.title },
        { actionId: created.id, authorId: viewer.id, field: "replaces", oldValue: null, newValue: old.title },
      ],
    });
    await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Action", entityId: id } });
    return { ok: true, id: created.id };
  } catch (error) {
    // Si no se pudo crear la nueva, la anterior vuelve a quedar vigente.
    await db.action.updateMany({ where: { id, replacedById: null }, data: { retiredAt: null, retiredReason: null } });
    throw error;
  }
}
