import { describe, expect, it } from "vitest";
import { testLevels, testStatuses } from "./seed-data";

describe("datos de prueba", () => {
  it("los niveles tienen nombres y rangos únicos", () => {
    expect(new Set(testLevels.map((l) => l.name)).size).toBe(testLevels.length);
    expect(new Set(testLevels.map((l) => l.rank)).size).toBe(testLevels.length);
  });

  it("hay al menos un nivel sensible y es el de mayor rango", () => {
    const sensitive = testLevels.filter((l) => l.isSensitive);
    expect(sensitive.length).toBeGreaterThan(0);
    const top = Math.max(...testLevels.map((l) => l.rank));
    expect(sensitive.every((l) => l.rank === top)).toBe(true);
  });

  it("los estados tienen nombres únicos y hay abiertos y cerrados", () => {
    expect(new Set(testStatuses.map((s) => s.name)).size).toBe(testStatuses.length);
    expect(testStatuses.some((s) => s.isClosed)).toBe(true);
    expect(testStatuses.some((s) => !s.isClosed)).toBe(true);
  });
});
