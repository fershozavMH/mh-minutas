import { createTypeSchema, updateTypeSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const types = await getDb().actionType.findMany({
    orderBy: { position: "asc" },
  });
  return Response.json({ types });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = createTypeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "datos_invalidos", issues: parsed.error.issues },
      { status: 400 },
    );
  const db = getDb();
  if (await db.actionType.findUnique({ where: { name: parsed.data.name } })) {
    return Response.json({ error: "nombre_repetido" }, { status: 409 });
  }
  const type = await db.actionType.create({ data: parsed.data });
  await db.auditLog.create({
    data: {
      userId: admin.id,
      kind: "CHANGE",
      entity: "ActionType",
      entityId: type.id,
    },
  });
  return Response.json({ type }, { status: 201 });
}

// Los tipos no se borran: se desactivan (las acciones que ya lo usan lo conservan).
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = updateTypeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "datos_invalidos", issues: parsed.error.issues },
      { status: 400 },
    );
  const { id, ...changes } = parsed.data;
  const db = getDb();
  if (!(await db.actionType.findUnique({ where: { id } })))
    return Response.json({ error: "no_existe" }, { status: 404 });
  if (
    changes.name &&
    (await db.actionType.findFirst({
      where: { id: { not: id }, name: changes.name },
    }))
  ) {
    return Response.json({ error: "nombre_repetido" }, { status: 409 });
  }
  const type = await db.actionType.update({ where: { id }, data: changes });
  await db.auditLog.create({
    data: {
      userId: admin.id,
      kind: "CHANGE",
      entity: "ActionType",
      entityId: id,
    },
  });
  return Response.json({ type });
}
