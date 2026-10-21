import { createStatusSchema, updateStatusSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const statuses = await getDb().actionStatus.findMany({ orderBy: { position: "asc" } });
  return Response.json({ statuses });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = createStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }
  const db = getDb();

  const clash = await db.actionStatus.findUnique({ where: { name: parsed.data.name } });
  if (clash) return Response.json({ error: "nombre_repetido" }, { status: 409 });

  const status = await db.actionStatus.create({ data: parsed.data });
  await db.auditLog.create({ data: { userId: admin.id, kind: "CHANGE", entity: "ActionStatus", entityId: status.id } });
  return Response.json({ status }, { status: 201 });
}

// Los estados no se borran: se desactivan. Siempre debe quedar al menos un estado abierto activo.
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = updateStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }
  const { id, ...changes } = parsed.data;
  const db = getDb();

  const current = await db.actionStatus.findUnique({ where: { id } });
  if (!current) return Response.json({ error: "no_existe" }, { status: 404 });

  if (changes.name) {
    const clash = await db.actionStatus.findFirst({ where: { id: { not: id }, name: changes.name } });
    if (clash) return Response.json({ error: "nombre_repetido" }, { status: 409 });
  }

  const willBeOpenAndActive =
    (changes.active ?? current.active) && !(changes.isClosed ?? current.isClosed);
  if (!willBeOpenAndActive && current.active && !current.isClosed) {
    const otherOpen = await db.actionStatus.count({
      where: { id: { not: id }, active: true, isClosed: false },
    });
    if (otherOpen === 0) return Response.json({ error: "debe_quedar_un_estado_abierto" }, { status: 409 });
  }

  const status = await db.actionStatus.update({ where: { id }, data: changes });
  await db.auditLog.create({ data: { userId: admin.id, kind: "CHANGE", entity: "ActionStatus", entityId: id } });
  return Response.json({ status });
}
