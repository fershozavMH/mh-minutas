import { describe, expect, it } from "vitest";
import { createMeetingSchema } from "./meeting-schemas";

const base = { title: "  Junta semanal  ", heldAt: "2026-10-21", levelId: "l1" };

describe("createMeetingSchema", () => {
  it("limpia el título y guarda la fecha a mediodía UTC", () => {
    const parsed = createMeetingSchema.parse(base);
    expect(parsed.title).toBe("Junta semanal");
    expect(parsed.heldAt.toISOString()).toBe("2026-10-21T12:00:00.000Z");
  });

  it("exige título, fecha y nivel", () => {
    expect(createMeetingSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ ...base, heldAt: "" }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ ...base, levelId: "" }).success).toBe(false);
  });

  it("rechaza fechas que no existen", () => {
    expect(createMeetingSchema.safeParse({ ...base, heldAt: "2026-02-31" }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ ...base, heldAt: "21/10/2026" }).success).toBe(false);
  });
});
