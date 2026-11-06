import { describe, expect, it } from "vitest";
import { dailyAiLimit } from "./proposals";

describe("tope diario de la IA", () => {
  it("usa 30 por defecto", () => {
    expect(dailyAiLimit({})).toBe(30);
  });
  it("acepta un entero positivo", () => {
    expect(dailyAiLimit({ AI_DAILY_LIMIT: "5" })).toBe(5);
  });
  it("ignora valores inválidos", () => {
    for (const value of ["0", "-3", "abc", "2.5", ""]) {
      expect(dailyAiLimit({ AI_DAILY_LIMIT: value })).toBe(30);
    }
  });
});
