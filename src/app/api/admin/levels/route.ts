import { createLevelSchema, updateLevelSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const levels = await getDb().level.findMany({ orderBy: { rank: "asc" } });
  return Response.json({ levels });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = createLevelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }
  const db = getDb();

  const clash = await db.level.findFirst({
    where: { OR: [{ name: parsed.data.name }, { rank: parsed.data.rank }] },
  });
  if (clash) return Response.json({ error: "nombre_o_rango_repetido" }, { status: 409 });

  const level = await db.level.create({ data: parsed.data });
  await db.auditLog.create({ data: { userId: admin.id, kind: "CHANGE", entity: "Level", entityId: level.id } });
  return Response.json({ level }, { status: 201 });
}

// Los niveles no se borran: se desactivan.
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = updateLevelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }
  const { id, ...changes } = parsed.data;
  const db = getDb();

  const current = await db.level.findUnique({ where: { id } });
  if (!current) return Response.json({ error: "no_existe" }, { status: 404 });

  const clash = await db.level.findFirst({
    where: {
      id: { not: id },
      OR: [
        ...(changes.name ? [{ name: changes.name }] : []),
        ...(changes.rank ? [{ rank: changes.rank }] : []),
      ],
    },
  });
  if (clash) return Response.json({ error: "nombre_o_rango_repetido" }, { status: 409 });

  const level = await db.level.update({ where: { id }, data: changes });
  await db.auditLog.create({ data: { userId: admin.id, kind: "CHANGE", entity: "Level", entityId: id } });
  return Response.json({ level });
}
