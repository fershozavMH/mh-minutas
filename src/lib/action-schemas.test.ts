import { describe, expect, it } from "vitest";
import { replaceActionSchema, retireActionSchema, updateActionSchema } from "./action-schemas";

describe("updateActionSchema", () => {
  it("exige al menos un cambio", () => {
    expect(updateActionSchema.safeParse({}).success).toBe(false);
    expect(updateActionSchema.safeParse({ title: "Nuevo" }).success).toBe(true);
  });

  it("la fecha, si viene, debe existir; no se puede vaciar", () => {
    expect(updateActionSchema.safeParse({ dueDate: "2026-10-23" }).success).toBe(true);
    expect(updateActionSchema.safeParse({ dueDate: "" }).success).toBe(false);
    expect(updateActionSchema.safeParse({ dueDate: "2026-02-31" }).success).toBe(false);
  });

  it("el responsable se puede quitar", () => {
    expect(updateActionSchema.parse({ ownerName: "  " }).ownerName).toBeNull();
  });
});

describe("retireActionSchema y replaceActionSchema", () => {
  it("retirar exige motivo y reemplazar exige fecha", () => {
    expect(retireActionSchema.safeParse({ reason: " " }).success).toBe(false);
    expect(retireActionSchema.safeParse({ reason: "Ya no aplica" }).success).toBe(true);
    expect(replaceActionSchema.safeParse({ title: "x", dueDate: null }).success).toBe(false);
    expect(replaceActionSchema.safeParse({ title: "x", dueDate: "2026-11-02" }).success).toBe(true);
  });
});
