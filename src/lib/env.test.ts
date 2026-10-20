import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

describe("readEnv", () => {
  it("falla si falta DATABASE_URL", () => {
    expect(() => readEnv({})).toThrow();
  });

  it("acepta una configuración mínima", () => {
    expect(readEnv({ DATABASE_URL: "postgresql://x" }).DATABASE_URL).toBe("postgresql://x");
  });
});
