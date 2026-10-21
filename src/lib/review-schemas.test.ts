import { describe, expect, it } from "vitest";
import { actionValueSchema, decisionSchema, isRealDay, textValueSchema } from "./review-schemas";

describe("isRealDay", () => {
  it("acepta fechas reales y rechaza las que no existen", () => {
    expect(isRealDay("2026-10-23")).toBe(true);
    expect(isRealDay("2026-02-31")).toBe(false);
    expect(isRealDay("23/10/2026")).toBe(false);
    expect(isRealDay("")).toBe(false);
  });
});

describe("actionValueSchema", () => {
  it("exige fecha, y el responsable es opcional", () => {
    expect(actionValueSchema.safeParse({ title: "Enviar accesos", ownerName: null, dueDate: null }).success).toBe(false);
    expect(actionValueSchema.safeParse({ title: "Enviar accesos", dueDate: "2026-10-23" }).success).toBe(true);
    expect(actionValueSchema.parse({ title: "x", ownerName: "  ", dueDate: "2026-10-23" }).ownerName).toBeNull();
  });
});

describe("textValueSchema y decisionSchema", () => {
  it("exige texto y, al rechazar, un motivo", () => {
    expect(textValueSchema.safeParse({ text: " " }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "reject", reason: " " }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "reject", reason: "No aplica" }).success).toBe(true);
    expect(decisionSchema.safeParse({ decision: "approve" }).success).toBe(true);
  });
});
