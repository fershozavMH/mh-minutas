import { describe, expect, it } from "vitest";
import { actionWhere, canUseLevel, meetingWhere, type Viewer } from "./access";

const assistant: Viewer = { id: "a1", profile: "ASSISTANT", maxLevel: { rank: 3 } };
const director: Viewer = { id: "d1", profile: "DIRECTOR", maxLevel: { rank: 3 } };
const admin: Viewer = { id: "x1", profile: "ADMIN", maxLevel: { rank: 4 } };

describe("meetingWhere", () => {
  it("la asistente ve lo suyo y hasta su nivel", () => {
    expect(meetingWhere(assistant)).toEqual({
      level: { rank: { lte: 3 } },
      createdById: "a1",
    });
  });

  it("el directivo ve lo que capturan sus asistentes, hasta su nivel", () => {
    expect(meetingWhere(director)).toEqual({
      level: { rank: { lte: 3 } },
      createdBy: { bossId: "d1" },
    });
  });

  it("Administración no recibe contenido", () => {
    expect(meetingWhere(admin)).toEqual({ id: { in: [] } });
  });

  it("el tope de nivel cambia con el usuario", () => {
    const low = { ...assistant, maxLevel: { rank: 1 } };
    expect(meetingWhere(low)).toMatchObject({ level: { rank: { lte: 1 } } });
  });
});

describe("actionWhere", () => {
  it("aplica las mismas reglas que las reuniones", () => {
    expect(actionWhere(assistant)).toEqual({ level: { rank: { lte: 3 } }, createdById: "a1" });
    expect(actionWhere(director)).toEqual({ level: { rank: { lte: 3 } }, createdBy: { bossId: "d1" } });
    expect(actionWhere(admin)).toEqual({ id: { in: [] } });
  });
});

describe("canUseLevel", () => {
  const viewer = { id: "u1", profile: "ASSISTANT" as const, maxLevel: { rank: 2 } };

  it("permite niveles activos hasta el máximo", () => {
    expect(canUseLevel(viewer, { rank: 1, active: true })).toBe(true);
    expect(canUseLevel(viewer, { rank: 2, active: true })).toBe(true);
  });

  it("rechaza niveles superiores o inactivos", () => {
    expect(canUseLevel(viewer, { rank: 3, active: true })).toBe(false);
    expect(canUseLevel(viewer, { rank: 1, active: false })).toBe(false);
  });
});
