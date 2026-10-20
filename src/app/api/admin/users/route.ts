import { createUserSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const users = await getDb().user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, profile: true, active: true, maxLevelId: true, bossId: true },
  });
  return Response.json({ users });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const body: unknown = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const db = getDb();

  const level = await db.level.findUnique({ where: { id: data.maxLevelId } });
  if (!level || !level.active) {
    return Response.json({ error: "nivel_invalido" }, { status: 400 });
  }

  if (data.bossId) {
    const boss = await db.user.findUnique({ where: { id: data.bossId } });
    if (!boss || !boss.active || boss.profile !== "DIRECTOR") {
      return Response.json({ error: "directivo_invalido" }, { status: 400 });
    }
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return Response.json({ error: "correo_ya_registrado" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      profile: data.profile,
      maxLevelId: data.maxLevelId,
      bossId: data.bossId ?? null,
    },
    select: { id: true, name: true, email: true, profile: true, active: true, maxLevelId: true, bossId: true },
  });
  await db.auditLog.create({
    data: { userId: admin.id, kind: "CHANGE", entity: "User", entityId: user.id },
  });

  return Response.json({ user }, { status: 201 });
}
