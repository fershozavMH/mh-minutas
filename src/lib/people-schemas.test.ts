import { describe, expect, it } from "vitest";
import { createPersonSchema, updatePersonSchema } from "./people-schemas";

describe("createPersonSchema", () => {
  it("acepta nombre sin correo y normaliza el correo", () => {
    expect(createPersonSchema.parse({ name: " Daray " })).toEqual({ name: "Daray", email: null });
    expect(createPersonSchema.parse({ name: "Ana", email: "ANA@Correo.com" }).email).toBe("ana@correo.com");
    expect(createPersonSchema.parse({ name: "Ana", email: "" }).email).toBeNull();
  });

  it("rechaza nombre vacío y correo inválido", () => {
    expect(createPersonSchema.safeParse({ name: " " }).success).toBe(false);
    expect(createPersonSchema.safeParse({ name: "Ana", email: "no-es-correo" }).success).toBe(false);
  });
});

describe("updatePersonSchema", () => {
  it("exige algún cambio y permite quitar el correo", () => {
    expect(updatePersonSchema.safeParse({}).success).toBe(false);
    expect(updatePersonSchema.parse({ email: "" }).email).toBeNull();
    expect(updatePersonSchema.parse({ active: false }).active).toBe(false);
  });
});
