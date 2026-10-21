// Prueba de permisos (H-06): recorre la capa de datos con un usuario de cada perfil
// contra una rama de pruebas de Neon. Se salta si no existe TEST_DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

    const low = await db.level.create({
      data: {
        name: `${run}-bajo`,
        rank: 9001 + Math.floor(Math.random() * 500) * 3,
      },
    });
    const high = await db.level.create({
      data: { name: `${run}-alto`, rank: low.rank + 1, isSensitive: true },
    });
    const status = await db.actionStatus.create({
      data: { name: `${run}-estado`, position: 1 },
    });

    const mk = (
      key: string,
      profile: "ASSISTANT" | "DIRECTOR" | "ADMIN",
      maxLevelId: string,
      bossId?: string,
    ) =>
      db.user.create({
        data: {
          name: `${run}-${key}`,
          email: `${run}-${key}@machineryhunters.com`,
          profile,
          maxLevelId,
          bossId,
        },
        include: { maxLevel: true },
      });

    const d1 = await mk("d1", "DIRECTOR", high.id);
    const d2 = await mk("d2", "DIRECTOR", high.id);
    const a1 = await mk("a1", "ASSISTANT", high.id, d1.id);
    const a2 = await mk("a2", "ASSISTANT", low.id, d2.id);
    const admin = await mk("admin", "ADMIN", high.id);
    for (const [key, user] of Object.entries({ d1, d2, a1, a2, admin })) {
      ids[key] = user.id;
      viewers[key] = {
        id: user.id,
        profile: user.profile,
        maxLevel: { rank: user.maxLevel.rank },
      };
    }

    const meeting = (key: string, createdById: string, levelId: string) =>
      db.meeting.create({
        data: {
          title: `${run}-${key}`,
          heldAt: new Date(),
          levelId,
          createdById,
        },
      });
    ids.m1 = (await meeting("m1", a1.id, low.id)).id;
    ids.m2 = (await meeting("m2", a1.id, high.id)).id;
    ids.m3 = (await meeting("m3", a2.id, low.id)).id;
    ids.m4 = (await meeting("m4", a2.id, high.id)).id;

    const action = (
      key: string,
      createdById: string,
      levelId: string,
      meetingId: string,
    ) =>
      db.action.create({
        data: {
          title: `${run}-${key}`,
          statusId: status.id,
          levelId,
          createdById,
          meetingId,
        },
      });
    ids.x1 = (await action("x1", a1.id, low.id, ids.m1)).id;
    ids.x2 = (await action("x2", a1.id, high.id, ids.m2)).id;
    ids.x3 = (await action("x3", a2.id, low.id, ids.m3)).id;
    await db.changeLog.create({
      data: {
        actionId: ids.x2,
        field: "title",
        oldValue: "a",
        newValue: "b",
        authorId: a1.id,
      },
    });
    ids.low = low.id;
    ids.high = high.id;
    ids.status = status.id;
  });

  afterAll(async () => {
    if (!db) return;
    const userIds = ["d1", "d2", "a1", "a2", "admin"]
      .map((key) => ids[key])
      .filter(Boolean);
    await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await db.changeLog.deleteMany({ where: { authorId: { in: userIds } } });
    await db.reviewItem.deleteMany({
      where: { meeting: { createdById: { in: userIds } } },
    });
    await db.source.deleteMany({ where: { uploadedById: { in: userIds } } });
    await db.action.deleteMany({ where: { createdById: { in: userIds } } });
    await db.meeting.deleteMany({ where: { createdById: { in: userIds } } });
    await db.user.deleteMany({
      where: {
        id: { in: userIds.filter((id) => id !== ids.d1 && id !== ids.d2) },
      },
    });
    await db.user.deleteMany({ where: { id: { in: [ids.d1, ids.d2] } } });
    await db.person.deleteMany({ where: { name: { startsWith: run } } });
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
    const own = (await actionsApi.listActions(viewers.a1))
      .map((a) => a.id)
      .sort();
    expect(own).toEqual([ids.x1, ids.x2].sort());
    expect((await actionsApi.listActions(viewers.a2)).map((a) => a.id)).toEqual(
      [ids.x3],
    );
    expect(await actionsApi.getAction(viewers.a2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.a2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.d2, ids.x2)).toBeNull();
    expect(await actionsApi.getActionHistory(viewers.a1, ids.x2)).toHaveLength(
      1,
    );
    expect(await actionsApi.getActionHistory(viewers.d1, ids.x2)).toHaveLength(
      1,
    );
  });

  it("leer un nivel sensible queda en la auditoría y uno normal no", async () => {
    const before = await db.auditLog.count({
      where: { userId: ids.a1, kind: "READ" },
    });
    await lists.getMeeting(viewers.a1, ids.m1);
    expect(
      await db.auditLog.count({ where: { userId: ids.a1, kind: "READ" } }),
    ).toBe(before);
    await lists.getMeeting(viewers.a1, ids.m2);
    expect(
      await db.auditLog.count({ where: { userId: ids.a1, kind: "READ" } }),
    ).toBe(before + 1);
  });
  it("solo las asistentes crean reuniones, y nunca en un nivel superior al suyo", async () => {
    const input = (levelId: string) => ({
      title: `${run}-nueva`,
      heldAt: new Date("2026-10-21T12:00:00Z"),
      levelId,
    });
    expect(await lists.createMeeting(viewers.a2, input(ids.high))).toEqual({
      ok: false,
      error: "nivel_no_permitido",
    });
    expect(await lists.createMeeting(viewers.d1, input(ids.low))).toEqual({
      ok: false,
      error: "sin_permiso",
    });
    expect(await lists.createMeeting(viewers.admin, input(ids.low))).toEqual({
      ok: false,
      error: "sin_permiso",
    });
    expect(await lists.createMeeting(viewers.a1, input("no-existe"))).toEqual({
      ok: false,
      error: "nivel_no_valido",
    });

    const created = await lists.createMeeting(viewers.a2, input(ids.low));
    expect(created.ok).toBe(true);
    expect(
      await db.auditLog.count({
        where: { userId: ids.a2, kind: "CHANGE", entity: "Meeting" },
      }),
    ).toBe(1);
    expect(
      (await lists.listMeetings(viewers.d2)).some(
        (m) => created.ok && m.id === created.id,
      ),
    ).toBe(true);
  });
  it("solo la asistente dueña carga transcripts, sin duplicados", async () => {
    const sources = await import("./sources");
    const text = `${run} línea uno\r\nlínea dos  \r\n`;
    const first = await sources.addSource(viewers.a1, ids.m1, {
      origin: "Texto pegado",
      text,
    });
    expect(first.ok).toBe(true);
    const saved = await db.source.findFirst({ where: { meetingId: ids.m1 } });
    expect(saved?.normalizedText).toBe(`${run} línea uno\nlínea dos`);
    expect(saved?.textHash).toHaveLength(64);

    expect(
      await sources.addSource(viewers.a1, ids.m1, {
        origin: "Archivo: x.txt",
        text: `${run} línea uno\nlínea dos`,
      }),
    ).toEqual({
      ok: false,
      error: "duplicado",
    });
    expect(
      await sources.addSource(viewers.a1, ids.m1, {
        origin: "x",
        text: "  \n ",
      }),
    ).toEqual({ ok: false, error: "texto_vacio" });
    expect(
      await sources.addSource(viewers.a2, ids.m1, {
        origin: "x",
        text: "otro",
      }),
    ).toEqual({ ok: false, error: "no_existe" });
    expect(
      await sources.addSource(viewers.d1, ids.m1, {
        origin: "x",
        text: "otro",
      }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await sources.addSource(viewers.admin, ids.m1, {
        origin: "x",
        text: "otro",
      }),
    ).toEqual({ ok: false, error: "sin_permiso" });
  });
  it("fecha de la reunión: solo la asistente dueña la corrige y queda en la auditoría", async () => {
    const day = new Date("2026-10-20T12:00:00.000Z");
    expect(await lists.updateMeetingDate(viewers.a2, ids.m3, day)).toEqual({
      ok: true,
    });
    expect(
      (
        await db.meeting.findUnique({ where: { id: ids.m3 } })
      )?.heldAt.toISOString(),
    ).toBe(day.toISOString());
    expect(
      await db.auditLog.count({
        where: {
          userId: ids.a2,
          entity: "Meeting",
          entityId: ids.m3,
          kind: "CHANGE",
        },
      }),
    ).toBeGreaterThan(0);

    // Otra asistente no la ve; directivo y Administración no la cambian.
    expect(await lists.updateMeetingDate(viewers.a1, ids.m3, day)).toEqual({
      ok: false,
      error: "no_existe",
    });
    expect(await lists.updateMeetingDate(viewers.d2, ids.m3, day)).toEqual({
      ok: false,
      error: "sin_permiso",
    });
    expect(await lists.updateMeetingDate(viewers.admin, ids.m3, day)).toEqual({
      ok: false,
      error: "sin_permiso",
    });
  });
  it("la IA solo propone: crea pendientes y nunca recibe un nivel sensible", async () => {
    const { addSource } = await import("./sources");
    const { requestProposal } = await import("./proposals");
    const proposal = {
      summary: "Resumen",
      decisions: ["D1"],
      risks: [],
      nextSteps: ["N1"],
      actions: [{ title: "A1", ownerName: null, dueDate: null }],
    };
    const create = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(proposal) }],
      });
    const client = {
      messages: { create },
    } as unknown as import("../ai/propose").AiClient;

    const ok = await addSource(viewers.a2, ids.m3, {
      origin: "t",
      text: `${run} para la IA`,
    });
    const sourceId = ok.ok ? ok.id : "";
    expect(
      await requestProposal(viewers.a2, ids.m3, sourceId, { client }),
    ).toEqual({ ok: true, count: 4 });
    const items = await db.reviewItem.findMany({ where: { sourceId } });
    expect(items.map((i) => i.kind).sort()).toEqual([
      "ACTION",
      "DECISION",
      "NEXT_STEP",
      "SUMMARY",
    ]);
    expect(items.every((i) => i.status === "PENDING")).toBe(true);
    expect(
      await requestProposal(viewers.a2, ids.m3, sourceId, { client }),
    ).toEqual({ ok: false, error: "ya_propuesto" });
    expect(create).toHaveBeenCalledTimes(1);

    // Nivel sensible: se corta antes de tocar a la IA.
    const sensitive = await addSource(viewers.a1, ids.m2, {
      origin: "t",
      text: `${run} sensible`,
    });
    const sensitiveId = sensitive.ok ? sensitive.id : "";
    expect(
      await requestProposal(viewers.a1, ids.m2, sensitiveId, { client }),
    ).toEqual({ ok: false, error: "nivel_sensible" });
    expect(create).toHaveBeenCalledTimes(1);
    expect(
      await db.reviewItem.count({ where: { sourceId: sensitiveId } }),
    ).toBe(0);
    // Queda en la auditoría, sin contenido.
    expect(
      await db.auditLog.count({
        where: { userId: ids.a1, entity: "AiBlocked", entityId: sensitiveId },
      }),
    ).toBe(1);

    expect(
      await requestProposal(viewers.a1, ids.m3, sourceId, { client }),
    ).toEqual({ ok: false, error: "no_existe" });
    expect(
      await requestProposal(viewers.d2, ids.m3, sourceId, { client }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await requestProposal(viewers.admin, ids.m3, sourceId, { client }),
    ).toEqual({ ok: false, error: "sin_permiso" });
  });
  it("un nivel sensible no llega a la IA: ni cliente, ni red, ni con clave configurada", async () => {
    const { addSource } = await import("./sources");
    const { requestProposal } = await import("./proposals");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const previousKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "clave-falsa-de-prueba";
    try {
      const saved = await addSource(viewers.a1, ids.m2, {
        origin: "t",
        text: `${run} secreto de nivel sensible`,
      });
      const sourceId = saved.ok ? saved.id : "";
      fetchSpy.mockClear();

      // Sin cliente inyectado: si se llegara a crear uno real, saldría una petición a la red.
      expect(await requestProposal(viewers.a1, ids.m2, sourceId)).toEqual({
        ok: false,
        error: "nivel_sensible",
      });
      expect(
        fetchSpy.mock.calls.filter(([url]) =>
          String(url).includes("anthropic"),
        ),
      ).toHaveLength(0);
      expect(await db.reviewItem.count({ where: { sourceId } })).toBe(0);
    } finally {
      fetchSpy.mockRestore();
      if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previousKey;
    }
  });
  it("revisión: la persona decide, la fecha es obligatoria y nada se decide dos veces", async () => {
    const { decideReview } = await import("./reviews");
    const mk = (kind: "ACTION" | "DECISION" | "SUMMARY", aiValue: object) =>
      db.reviewItem.create({ data: { meetingId: ids.m3, kind, aiValue } });
    const action = await mk("ACTION", {
      title: "Enviar accesos",
      ownerName: "Daray",
      dueDate: null,
    });
    const decision = await mk("DECISION", { text: "Se aprueba el piloto." });
    const summary = await mk("SUMMARY", { text: "Resumen de la junta." });
    const rejected = await mk("DECISION", { text: "Otra cosa" });

    // Permisos
    expect(
      await decideReview(viewers.d2, action.id, { decision: "approve" }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await decideReview(viewers.admin, action.id, { decision: "approve" }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await decideReview(viewers.a1, action.id, { decision: "approve" }),
    ).toEqual({ ok: false, error: "no_existe" });

    // Sin fecha no hay acción oficial
    expect(
      await decideReview(viewers.a2, action.id, { decision: "approve" }),
    ).toEqual({ ok: false, error: "fecha_obligatoria" });
    expect(
      await db.action.count({
        where: { createdById: ids.a2, title: "Enviar accesos" },
      }),
    ).toBe(0);
    expect(
      (await db.reviewItem.findUnique({ where: { id: action.id } }))?.status,
    ).toBe("PENDING");

    // Con fecha editada: se crea la acción oficial y se conserva lo que propuso la IA
    const first = await db.actionStatus.findFirst({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const ok = await decideReview(viewers.a2, action.id, {
      decision: "approve",
      value: {
        title: "Enviar accesos",
        ownerName: "Daray",
        dueDate: "2026-10-23",
      },
    });
    expect(ok.ok).toBe(true);
    const saved = await db.reviewItem.findUnique({
      where: { id: action.id },
      include: { action: true },
    });
    expect(saved?.status).toBe("APPROVED");
    expect(saved?.aiValue).toEqual({
      title: "Enviar accesos",
      ownerName: "Daray",
      dueDate: null,
    });
    expect(saved?.editedValue).toMatchObject({ dueDate: "2026-10-23" });
    expect(saved?.decidedById).toBe(ids.a2);
    expect(saved?.action?.levelId).toBe(ids.low);
    expect(saved?.action?.statusId).toBe(first?.id);
    expect(saved?.action?.dueDate?.toISOString().slice(0, 10)).toBe(
      "2026-10-23",
    );

    // Una sola decisión
    expect(
      await decideReview(viewers.a2, action.id, {
        decision: "reject",
        reason: "x",
      }),
    ).toEqual({ ok: false, error: "ya_decidido" });

    // Resumen y decisión pasan a la ficha oficial
    expect(
      (
        await decideReview(viewers.a2, summary.id, {
          decision: "approve",
          value: { text: "Resumen corregido." },
        })
      ).ok,
    ).toBe(true);
    expect(
      (await decideReview(viewers.a2, decision.id, { decision: "approve" })).ok,
    ).toBe(true);
    const card = (await db.meeting.findUnique({ where: { id: ids.m3 } }))
      ?.officialCard;
    expect(card).toEqual({
      summary: "Resumen corregido.",
      decisions: ["Se aprueba el piloto."],
    });

    // Rechazar guarda el motivo y no crea nada oficial
    expect(
      (
        await decideReview(viewers.a2, rejected.id, {
          decision: "reject",
          reason: "No se dijo en la junta",
        })
      ).ok,
    ).toBe(true);
    const r = await db.reviewItem.findUnique({ where: { id: rejected.id } });
    expect(r).toMatchObject({
      status: "REJECTED",
      rejectionReason: "No se dijo en la junta",
    });
    // Solo existe la acción aprobada de este test; lo rechazado no creó nada oficial.
    expect(
      await db.action.count({
        where: { createdById: ids.a2, title: "Enviar accesos" },
      }),
    ).toBe(1);
    expect(
      await db.action.count({
        where: { createdById: ids.a2, title: "Otra cosa" },
      }),
    ).toBe(0);
  });
  it("acciones: solo la dueña edita, cada cambio guarda el valor anterior y nada se borra", async () => {
    const api = await import("./actions");
    const status2 = await db.actionStatus.create({
      data: { name: `${run}-estado2`, position: 2 },
    });
    const a = await db.action.create({
      data: {
        title: `${run}-editable`,
        ownerName: "Daray",
        dueDate: new Date("2026-10-22T12:00:00Z"),
        actionDate: new Date("2026-10-22T12:00:00Z"),
        statusId: ids.status,
        levelId: ids.low,
        meetingId: ids.m3,
        createdById: ids.a2,
      },
    });

    // Permisos: otra asistente no la ve, el directivo y Administración no editan
    expect(
      await api.updateAction(viewers.a1, a.id, { dueDate: "2026-10-23" }),
    ).toEqual({ ok: false, error: "no_existe" });
    expect(
      await api.updateAction(viewers.d2, a.id, { dueDate: "2026-10-23" }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await api.updateAction(viewers.admin, a.id, { dueDate: "2026-10-23" }),
    ).toEqual({ ok: false, error: "sin_permiso" });

    // Cambiar la fecha y el estado guarda autor y valor anterior
    expect(
      await api.updateAction(viewers.a2, a.id, {
        dueDate: "2026-10-23",
        statusId: status2.id,
      }),
    ).toEqual({ ok: true });
    const changed = await db.action.findUnique({ where: { id: a.id } });
    expect(changed?.dueDate?.toISOString().slice(0, 10)).toBe("2026-10-23");
    expect(changed?.actionDate?.toISOString().slice(0, 10)).toBe("2026-10-23");
    const log = await db.changeLog.findMany({
      where: { actionId: a.id },
      orderBy: { field: "asc" },
    });
    expect(
      log.map((l) => [l.field, l.oldValue, l.newValue, l.authorId]),
    ).toEqual([
      ["dueDate", "2026-10-22", "2026-10-23", ids.a2],
      ["status", `${run}-estado`, `${run}-estado2`, ids.a2],
    ]);
    expect(
      await api.updateAction(viewers.a2, a.id, { dueDate: "2026-10-23" }),
    ).toEqual({ ok: false, error: "sin_cambios" });
    expect(
      await api.updateAction(viewers.a2, a.id, { statusId: "no-existe" }),
    ).toEqual({ ok: false, error: "estado_invalido" });

    // Reemplazar: la anterior se retira y apunta a la nueva
    const replaced = await api.replaceAction(viewers.a2, a.id, {
      title: `${run}-nueva`,
      ownerName: null,
      dueDate: "2026-11-02",
    });
    expect(replaced.ok).toBe(true);
    const old = await db.action.findUnique({ where: { id: a.id } });
    expect(old?.retiredAt).not.toBeNull();
    expect(old?.replacedById).toBe(replaced.ok ? replaced.id : "");
    const fresh = await db.action.findUnique({
      where: { id: replaced.ok ? (replaced.id ?? "") : "" },
    });
    expect(fresh).toMatchObject({
      levelId: ids.low,
      meetingId: ids.m3,
      createdById: ids.a2,
      retiredAt: null,
    });
    expect(await api.updateAction(viewers.a2, a.id, { title: "x" })).toEqual({
      ok: false,
      error: "retirada",
    });
    expect(
      await api.replaceAction(viewers.a2, a.id, {
        title: "y",
        ownerName: null,
        dueDate: "2026-11-02",
      }),
    ).toEqual({ ok: false, error: "retirada" });

    // Retirar exige permiso y no borra
    expect(await api.retireAction(viewers.d2, fresh!.id, "x")).toEqual({
      ok: false,
      error: "sin_permiso",
    });
    expect(
      await api.retireAction(viewers.a2, fresh!.id, "Ya no aplica"),
    ).toEqual({ ok: true });
    expect(await api.retireAction(viewers.a2, fresh!.id, "otra vez")).toEqual({
      ok: false,
      error: "retirada",
    });
    expect(
      (await db.action.findUnique({ where: { id: fresh!.id } }))?.retiredReason,
    ).toBe("Ya no aplica");
    expect((await api.listRetiredActions(viewers.a2)).map((r) => r.id)).toEqual(
      expect.arrayContaining([a.id, fresh!.id]),
    );
    expect((await api.listActions(viewers.a2)).map((r) => r.id)).not.toContain(
      a.id,
    );

    await db.changeLog.deleteMany({
      where: { actionId: { in: [a.id, fresh!.id] } },
    });
    await db.action.update({
      where: { id: a.id },
      data: { replacedById: null },
    });
    await db.action.deleteMany({ where: { id: { in: [a.id, fresh!.id] } } });
    await db.actionStatus.delete({ where: { id: status2.id } });
  });
  it("estados que piden nota: no se fijan sin ella y la nota se limpia al salir", async () => {
    const api = await import("./actions");
    const waiting = await db.actionStatus.create({
      data: { name: `${run}-espera`, position: 3, requiresNote: true },
    });
    const a = await db.action.create({
      data: {
        title: `${run}-con-nota`,
        dueDate: new Date("2026-10-22T12:00:00Z"),
        actionDate: new Date("2026-10-22T12:00:00Z"),
        statusId: ids.status,
        levelId: ids.low,
        meetingId: ids.m3,
        createdById: ids.a2,
      },
    });

    expect(
      await api.updateAction(viewers.a2, a.id, { statusId: waiting.id }),
    ).toEqual({ ok: false, error: "nota_obligatoria" });
    expect(
      await api.updateAction(viewers.a2, a.id, {
        statusId: waiting.id,
        statusNote: "",
      }),
    ).toEqual({ ok: false, error: "nota_obligatoria" });
    expect(
      (await db.action.findUnique({ where: { id: a.id } }))?.statusId,
    ).toBe(ids.status);

    expect(
      await api.updateAction(viewers.a2, a.id, {
        statusId: waiting.id,
        statusNote: "Esperando respuesta de Rubén",
      }),
    ).toEqual({ ok: true });
    const waited = await db.action.findUnique({ where: { id: a.id } });
    expect([waited?.statusId, waited?.statusNote]).toEqual([
      waiting.id,
      "Esperando respuesta de Rubén",
    ]);
    expect(
      (
        await db.changeLog.findMany({
          where: { actionId: a.id, field: "statusNote" },
        })
      ).length,
    ).toBe(1);

    // Al salir del estado, la nota se limpia y queda en el historial.
    expect(
      await api.updateAction(viewers.a2, a.id, { statusId: ids.status }),
    ).toEqual({ ok: true });
    expect(
      (await db.action.findUnique({ where: { id: a.id } }))?.statusNote,
    ).toBeNull();
    expect(
      (
        await db.changeLog.findMany({
          where: { actionId: a.id, field: "statusNote" },
        })
      ).length,
    ).toBe(2);
  });
  it("subir el nivel de una reunión: solo hacia arriba, hasta el máximo de la persona", async () => {
    const mk = (createdById: string) =>
      db.meeting.create({
        data: {
          title: `${run}-nivel`,
          heldAt: new Date(),
          levelId: ids.low,
          createdById,
        },
      });
    const mine = await mk(ids.a1);
    const other = await mk(ids.a2);

    expect(
      await lists.updateMeeting(viewers.a1, mine.id, { levelId: ids.high }),
    ).toEqual({ ok: true });
    expect(
      (await db.meeting.findUnique({ where: { id: mine.id } }))?.levelId,
    ).toBe(ids.high);
    // Bajarlo de nuevo no se permite.
    expect(
      await lists.updateMeeting(viewers.a1, mine.id, { levelId: ids.low }),
    ).toEqual({ ok: false, error: "solo_subir_nivel" });
    // a2 no llega al nivel alto; otra asistente no ve la reunión; directivo y Administración no cambian nada.
    expect(
      await lists.updateMeeting(viewers.a2, other.id, { levelId: ids.high }),
    ).toEqual({ ok: false, error: "nivel_no_permitido" });
    expect(
      await lists.updateMeeting(viewers.a2, mine.id, { levelId: ids.high }),
    ).toEqual({ ok: false, error: "no_existe" });
    expect(
      await lists.updateMeeting(viewers.d1, mine.id, { levelId: ids.high }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await lists.updateMeeting(viewers.admin, mine.id, { levelId: ids.high }),
    ).toEqual({ ok: false, error: "sin_permiso" });
  });
  it("un texto que parece sensible no va a la IA sin confirmación, y la confirmación queda en la auditoría", async () => {
    const { addSource } = await import("./sources");
    const { requestProposal } = await import("./proposals");
    const meeting = await db.meeting.create({
      data: {
        title: `${run}-alerta`,
        heldAt: new Date(),
        levelId: ids.low,
        createdById: ids.a2,
      },
    });
    const added = await addSource(viewers.a2, meeting.id, {
      origin: "t",
      text: `${run} se habló del sueldo de un colaborador`,
    });
    const sourceId = added.ok ? added.id : "";
    const proposal = {
      summary: "Resumen",
      decisions: [],
      risks: [],
      nextSteps: [],
      actions: [],
    };
    const create = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(proposal) }],
      });
    const client = {
      messages: { create },
    } as unknown as import("../ai/propose").AiClient;

    expect(
      await requestProposal(viewers.a2, meeting.id, sourceId, { client }),
    ).toEqual({
      ok: false,
      error: "posible_sensible",
      topics: ["Sueldos"],
    });
    expect(create).not.toHaveBeenCalled();
    expect(await db.reviewItem.count({ where: { sourceId } })).toBe(0);

    expect(
      await requestProposal(viewers.a2, meeting.id, sourceId, {
        client,
        acknowledgeTopics: true,
      }),
    ).toEqual({ ok: true, count: 1 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(
      await db.auditLog.count({
        where: {
          userId: ids.a2,
          entity: "AiSensitiveOverride",
          entityId: sourceId,
        },
      }),
    ).toBe(1);
  });
  it("filtros de acciones: se suman a la visibilidad y no la reemplazan", async () => {
    const api = await import("./actions");
    const mk = (
      title: string,
      ownerName: string | null,
      dueDate: string | null,
      createdById: string,
    ) =>
      db.action.create({
        data: {
          title: `${run}-${title}`,
          ownerName,
          dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`) : null,
          statusId: ids.status,
          levelId: ids.low,
          meetingId: ids.m3,
          createdById,
        },
      });
    const past = await mk("f-pasada", "Daray Filtro", "2020-01-10", ids.a2);
    const future = await mk("f-futura", "Otra Persona", "2099-01-10", ids.a2);
    const none = await mk("f-sinfecha", null, null, ids.a2);
    const others = await mk("f-ajena", "Daray Filtro", "2020-01-10", ids.a1);

    const list = async (
      viewer: keyof typeof viewers,
      filters: Parameters<typeof api.listActions>[1],
    ) => (await api.listActions(viewers[viewer], filters)).map((a) => a.id);

    expect(await list("a2", { owner: "daray filtro" })).toEqual([past.id]);
    expect(await list("a2", { due: "overdue", owner: run })).toEqual([]);
    expect(await list("a2", { due: "overdue" })).toContain(past.id);
    expect(await list("a2", { due: "overdue" })).not.toContain(future.id);
    expect(await list("a2", { due: "none" })).toContain(none.id);
    expect(
      await list("a2", { statusId: ids.status, meetingId: ids.m3 }),
    ).toEqual(expect.arrayContaining([past.id, future.id, none.id]));
    expect(await list("a2", { statusId: "otro" })).toEqual([]);

    // La visibilidad manda: a2 no ve lo de a1 aunque coincida con el filtro; el directivo de a1 sí.
    expect(await list("a2", { owner: "Daray Filtro" })).not.toContain(
      others.id,
    );
    expect(await list("d1", { owner: "Daray Filtro" })).toEqual([others.id]);
    expect(await list("admin", { owner: "Daray Filtro" })).toEqual([]);

    await db.action.deleteMany({
      where: { id: { in: [past.id, future.id, none.id, others.id] } },
    });
  });
  it("personas: se registran sin borrarse y su nombre manda en las acciones", async () => {
    const people = await import("./people");
    const api = await import("./actions");
    const email = `${run}-persona@correo.com`;

    // Permisos
    expect(
      await people.createPerson(viewers.d1, {
        name: `${run} Directivo`,
        email: null,
      }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    const created = await people.createPerson(viewers.a2, {
      name: `${run} Daray`,
      email,
    });
    expect(created.ok).toBe(true);
    const personId = created.ok ? created.id : "";
    expect(
      await people.createPerson(viewers.admin, { name: `${run} Otra`, email }),
    ).toEqual({ ok: false, error: "correo_repetido" });
    // Sin correo se puede, y dos personas sin correo no chocan
    expect(
      (
        await people.createPerson(viewers.admin, {
          name: `${run} Sin correo 1`,
          email: null,
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await people.createPerson(viewers.admin, {
          name: `${run} Sin correo 2`,
          email: null,
        })
      ).ok,
    ).toBe(true);

    // Una acción con responsable del registro toma su nombre
    const action = await db.action.create({
      data: {
        title: `${run}-con-persona`,
        dueDate: new Date("2026-11-02T12:00:00Z"),
        statusId: ids.status,
        levelId: ids.low,
        meetingId: ids.m3,
        createdById: ids.a2,
      },
    });
    expect(
      await api.updateAction(viewers.a2, action.id, { ownerId: personId }),
    ).toEqual({ ok: true });
    let saved = await db.action.findUnique({ where: { id: action.id } });
    expect(saved).toMatchObject({
      ownerId: personId,
      ownerName: `${run} Daray`,
    });
    expect(
      await api.updateAction(viewers.a2, action.id, { ownerId: "no-existe" }),
    ).toEqual({ ok: false, error: "persona_invalida" });

    // Cambiar el nombre en el registro actualiza el de sus acciones
    expect(
      (
        await people.updatePerson(viewers.admin, personId, {
          name: `${run} Daray A.`,
        })
      ).ok,
    ).toBe(true);
    saved = await db.action.findUnique({ where: { id: action.id } });
    expect(saved?.ownerName).toBe(`${run} Daray A.`);
    expect(
      await people.updatePerson(viewers.d1, personId, { name: "x" }),
    ).toEqual({ ok: false, error: "sin_permiso" });
    expect(
      await people.updatePerson(viewers.admin, personId, {
        name: `${run} Daray A.`,
      }),
    ).toEqual({ ok: false, error: "sin_cambios" });

    // Desactivar: ya no se puede asignar a otra acción, pero la que ya lo tiene la conserva
    expect(
      (await people.updatePerson(viewers.admin, personId, { active: false }))
        .ok,
    ).toBe(true);
    expect((await people.listPeople()).some((p) => p.id === personId)).toBe(
      false,
    );
    expect(
      (await people.listPeople({ includeInactive: true })).some(
        (p) => p.id === personId,
      ),
    ).toBe(true);
    const other = await db.action.create({
      data: {
        title: `${run}-otra`,
        dueDate: new Date("2026-11-02T12:00:00Z"),
        statusId: ids.status,
        levelId: ids.low,
        meetingId: ids.m3,
        createdById: ids.a2,
      },
    });
    expect(
      await api.updateAction(viewers.a2, other.id, { ownerId: personId }),
    ).toEqual({ ok: false, error: "persona_invalida" });
    expect(
      await api.updateAction(viewers.a2, action.id, {
        title: `${run}-con-persona-2`,
        ownerId: personId,
      }),
    ).toEqual({ ok: true });

    // Texto libre: quita la persona del registro
    expect(
      await api.updateAction(viewers.a2, action.id, {
        ownerId: null,
        ownerName: "Alguien nuevo",
      }),
    ).toEqual({ ok: true });
    saved = await db.action.findUnique({ where: { id: action.id } });
    expect(saved).toMatchObject({ ownerId: null, ownerName: "Alguien nuevo" });

    await db.changeLog.deleteMany({
      where: { actionId: { in: [action.id, other.id] } },
    });
    await db.action.deleteMany({
      where: { id: { in: [action.id, other.id] } },
    });
  });
});
