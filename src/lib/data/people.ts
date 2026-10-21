import type { Viewer } from "../access";
import { getDb } from "../db";
import type { CreatePersonInput, UpdatePersonInput } from "../people-schemas";

// Personas que pueden ser responsables. No es contenido de reuniones: la ven todos los perfiles.
export async function listPeople(options: { includeInactive?: boolean } = {}) {
  return getDb().person.findMany({
    where: options.includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
  });
}

export type PersonResult =
  | { ok: true; id: string }
  | { ok: false; error: "sin_permiso" | "no_existe" | "correo_repetido" | "sin_cambios" };

// Asistentes y Administración dan de alta y editan; el directivo solo consulta.
const canManage = (viewer: Viewer) => viewer.profile === "ASSISTANT" || viewer.profile === "ADMIN";

const isUniqueError = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";

export async function createPerson(viewer: Viewer, input: CreatePersonInput): Promise<PersonResult> {
  if (!canManage(viewer)) return { ok: false, error: "sin_permiso" };
  const db = getDb();
  try {
    const person = await db.person.create({ data: { name: input.name, email: input.email } });
    await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Person", entityId: person.id } });
    return { ok: true, id: person.id };
  } catch (error) {
    if (isUniqueError(error)) return { ok: false, error: "correo_repetido" };
    throw error;
  }
}

// Nunca se borra: se desactiva.
export async function updatePerson(viewer: Viewer, id: string, input: UpdatePersonInput): Promise<PersonResult> {
  if (!canManage(viewer)) return { ok: false, error: "sin_permiso" };
  const db = getDb();
  const current = await db.person.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "no_existe" };

  const data: { name?: string; email?: string | null; active?: boolean } = {};
  if (input.name !== undefined && input.name !== current.name) data.name = input.name;
  if (input.email !== undefined && input.email !== current.email) data.email = input.email;
  if (input.active !== undefined && input.active !== current.active) data.active = input.active;
  if (Object.keys(data).length === 0) return { ok: false, error: "sin_cambios" };

  try {
    await db.person.update({ where: { id }, data });
  } catch (error) {
    if (isUniqueError(error)) return { ok: false, error: "correo_repetido" };
    throw error;
  }
  // El nombre visible de sus acciones sigue al del registro.
  if (data.name) await db.action.updateMany({ where: { ownerId: id }, data: { ownerName: data.name } });
  await db.auditLog.create({ data: { userId: viewer.id, kind: "CHANGE", entity: "Person", entityId: id } });
  return { ok: true, id };
}
