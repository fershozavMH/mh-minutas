import { getDb } from "../db";

export type ResolvedOwner = { ok: true; ownerId: string | null; ownerName: string | null } | { ok: false };

// Si viene una persona del registro, su nombre es el del responsable; si no, queda el texto libre.
// Una persona desactivada no se puede asignar de nuevo, salvo que ya fuera la responsable.
export async function resolveOwner(
  ownerId: string | null | undefined,
  ownerName: string | null | undefined,
  currentOwnerId: string | null = null,
): Promise<ResolvedOwner> {
  if (!ownerId) return { ok: true, ownerId: null, ownerName: ownerName?.trim() || null };
  const person = await getDb().person.findUnique({ where: { id: ownerId } });
  if (!person || (!person.active && person.id !== currentOwnerId)) return { ok: false };
  return { ok: true, ownerId: person.id, ownerName: person.name };
}
