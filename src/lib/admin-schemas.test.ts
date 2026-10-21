import { describe, expect, it } from "vitest";
import { createLevelSchema, createStatusSchema, createUserSchema, updateLevelSchema, updateStatusSchema } from "./admin-schemas";

const base = { name: "Daray", email: "Daray@MachineryHunters.com", profile: "ASSISTANT", maxLevelId: "l1", bossId: "u1" };

describe("createUserSchema", () => {
  it("normaliza el correo y acepta una asistente con directivo", () => {
    const parsed = createUserSchema.parse(base);
    expect(parsed.email).toBe("daray@machineryhunters.com");
  });

  it("rechaza dominios no permitidos", () => {
    expect(createUserSchema.safeParse({ ...base, email: "x@gmail.com" }).success).toBe(false);
  });

  it("exige directivo a las asistentes", () => {
    expect(createUserSchema.safeParse({ ...base, bossId: undefined }).success).toBe(false);
  });

  it("no permite directivo en otros perfiles", () => {
    expect(createUserSchema.safeParse({ ...base, profile: "DIRECTOR" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, profile: "DIRECTOR", bossId: null }).success).toBe(true);
  });

  it("rechaza perfiles desconocidos", () => {
    expect(createUserSchema.safeParse({ ...base, profile: "ROOT" }).success).toBe(false);
  });
});

describe("niveles", () => {
  it("crea un nivel con rango entero positivo", () => {
    expect(createLevelSchema.parse({ name: "Interno", rank: 2 }).isSensitive).toBe(false);
    expect(createLevelSchema.safeParse({ name: "X", rank: 0 }).success).toBe(false);
  });

  it("una edición necesita al menos un cambio", () => {
    expect(updateLevelSchema.safeParse({ id: "l1" }).success).toBe(false);
    expect(updateLevelSchema.safeParse({ id: "l1", active: false }).success).toBe(true);
  });
});

describe("esquemas de estados", () => {
  it("acepta un estado válido y por defecto no cierra", () => {
    const parsed = createStatusSchema.parse({ name: " En revisión ", position: 3 });
    expect(parsed).toEqual({ name: "En revisión", position: 3, isClosed: false });
  });
  it("rechaza orden menor a 1 y nombre vacío", () => {
    expect(createStatusSchema.safeParse({ name: "x", position: 0 }).success).toBe(false);
    expect(createStatusSchema.safeParse({ name: " ", position: 1 }).success).toBe(false);
  });
  it("la actualización exige al menos un cambio", () => {
    expect(updateStatusSchema.safeParse({ id: "a" }).success).toBe(false);
    expect(updateStatusSchema.safeParse({ id: "a", active: false }).success).toBe(true);
  });
});
