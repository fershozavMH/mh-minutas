// Prueba de permisos (H-06): recorre la capa de datos con un usuario de cada perfil
// contra una rama de pruebas de Neon. Se salta si no existe TEST_DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const testUrl = process.env.TEST_DATABASE_URL;
const realUrl = process.env.DATABASE_URL;
const enabled = Boolean(testUrl) && testUrl !== realUrl;

describe.skipIf(!enabled)("permisos por perfil y nivel", () => {
  const run = `t07${Date.now().toString(36)}`;
  type Db = ReturnType<typeof import("../db").getDb>;
  let db: Db;
  let lists: typeof import("./meetings");
  let actionsApi: typeof import("./actions");
  const ids: Record<string, string> = {};
  const viewers: Record<string, import("../access").Viewer> = {};

  beforeAll(async () => {
    // Nunca se toca la base real: el cliente se crea ya apuntando a la rama de pruebas.
    process.env.DATABASE_URL = testUrl;
    db = (await import("../db")).getDb();
    lists = await import("./meetings");
    actionsApi = await import("./actions");

    const low = await db.level.create({ data: { name: `${run}-bajo`, rank: 9001 + Math.floor(Math.random() * 500) * 3 } });
    const high = await db.level.create({
      data: { name: `${run}-alto`, rank: low.rank + 1, isSensitive: true },
    });
    const status = await db.actionStatus.create({ data: { name: `${run}-estado`, position: 1 } });

    const mk = (key: string, profile: "ASSISTANT" | "DIRECTOR" | "ADMIN", maxLevelId: string, bossId?: string) =>
      db.user.create({
        data: { name: `${run}-${key}`, email: `${run}-${key}@machineryhunters.com`, profile, maxLevelId, bossId },
        include: { maxLevel: true },
      });

    const d1 = await mk("d1", "DIRECTOR", high.id);
    const d2 = await mk("d2", "DIRECTOR", high.id);
    const a1 = await mk("a1", "ASSISTANT", high.id, d1.id);
    const a2 = await mk("a2", "ASSISTANT", low.id, d2.id);
    const admin = await mk("admin", "ADMIN", high.id);
    for (const [key, user] of Object.entries({ d1, d2, a1, a2, admin })) {
      ids[key] = user.id;
      viewers[key] = { id: user.id, profile: user.profile, maxLevel: { rank: user.maxLevel.rank } };
    }

    const meeting = (key: string, createdById: string, levelId: string) =>
      db.meeting.create({ data: { title: `${run}-${key}`, heldAt: new Date(), levelId, createdById } });
    ids.m1 = (await meeting("m1", a1.id, low.id)).id;
    ids.m2 = (await meeting("m2", a1.id, high.id)).id;
    ids.m3 = (await meeting("m3", a2.id, low.id)).id;
    ids.m4 = (await meeting("m4", a2.id, high.id)).id;

    const action = (key: string, createdById: string, levelId: string, meetingId: string) =>
      db.action.create({
        data: { title: `${run}-${key}`, statusId: status.id, levelId, createdById, meetingId },
      });
    ids.x1 = (await action("x1", a1.id, low.id, ids.m1)).id;
    ids.x2 = (await action("x2", a1.id, high.id, ids.m2)).id;
    ids.x3 = (await action("x3", a2.id, low.id, ids.m3)).id;
    await db.changeLog.create({
      data: { actionId: ids.x2, field: "title", oldValue: "a", newValue: "b", authorId: a1.id },
    });
    ids.low = low.id;
    ids.high = high.id;
    ids.status = status.id;
  });

  afterAll(async () => {
    if (!db) return;
    const userIds = ["d1", "d2", "a1", "a2", "admin"].map((key) => ids[key]).filter(Boolean);
    await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await db.changeLog.deleteMany({ where: { authorId: { in: userIds } } });
    await db.action.deleteMany({ where: { createdById: { in: userIds } } });
    await db.meeting.deleteMany({ where: { createdById: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds.filter((id) => id !== ids.d1 && id !== ids.d2) } } });
    await db.user.deleteMany({ where: { id: { in: [ids.d1, ids.d2] } } });
    await db.actionStatus.deleteMany({ where: { id: ids.status } });
    await db.level.deleteMany({ where: { id: { in: [ids.low, ids.high] } } });
    await db.$disconnect();
  });

  const meetingIds = async (key: string) =>
    (await lists.listMeetings(viewers[key])).map((m) => m.id).sort();

  it("la asistente ve solo lo suyo y hasta su nivel", async () => {
    expect(await meetingIds("a1")).toEqual([ids.m1, ids.m2].sort());
    expect(await meetingIds("a2")).toEqual([ids.m3]);
  });

  it("el directivo ve lo que capturan sus asistentes, hasta su nivel", async () => {
    expect(await meetingIds("d1")).toEqual([ids.m1, ids.m2].sort());
    expect(await meetingIds("d2")).toEqual([ids.m3, ids.m4].sort());
  });

  it("Administración no recibe contenido", async () => {
    expect(await meetingIds("admin")).toEqual([]);
    expect(await actionsApi.listActions(viewers.admin)).toEqual([]);
  });

  it("nadie obtiene por id una reunión que no le toca", async () => {
    expect(await lists.getMeeting(viewers.a1, ids.m3)).toBeNull();
    expect(await lists.getMeeting(viewers.a2, ids.m4)).toBeNull();
    expect(await lists.getMeeting(viewers.d1, ids.m3)).toBeNull();
    expect(await lists.getMeeting(viewers.admin, ids.m1)).toBeNull();
    expect(await lists.getMeeting(viewers.a1, ids.m1)).not.toBeNull();
  });

  it("las acciones y su historial siguen la misma regla", async () => {
    const own = (await actionsApi.listActions(viewers.a1)).map((a) => a.id).sort();
    expect(own).toEqual([ids.x1, ids.x2].sort());
    expect((await actionsApi.listActions(viewers.a2)).map((a) => a.id)).toEqual([ids.x3]);
    expect(await actionsApi.getAction(viewers.a2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.a2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.d2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.a1, ids.x2)).toHaveLength(1);
    expect(await actionsApi.getActionHistory(viewers.d1, ids.x2)).toHaveLength(1);
  });

  it("leer un nivel sensible queda en la auditoría y uno normal no", async () => {
    const before = await db.auditLog.count({ where: { userId: ids.a1, kind: "READ" } });
    await lists.getMeeting(viewers.a1, ids.m1);
    expect(await db.auditLog.count({ where: { userId: ids.a1, kind: "READ" } })).toBe(before);
    await lists.getMeeting(viewers.a1, ids.m2);
    expect(await db.auditLog.count({ where: { userId: ids.a1, kind: "READ" } })).toBe(before + 1);
  });
});
