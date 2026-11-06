import { describe, expect, it } from "vitest";
import { addDays, parseActionFilters, todayInHermosillo } from "./action-filters";

describe("parseActionFilters", () => {
  it("lee los filtros y limpia espacios", () => {
    expect(
      parseActionFilters({
        status: "s1",
        owner: "  Daray ",
        meeting: "m1",
        due: "overdue",
      }),
    ).toEqual({
      statusId: "s1",
      owner: "Daray",
      meetingId: "m1",
      due: "overdue",
    });
  });

  it("ignora vacíos y valores no reconocidos", () => {
    expect(parseActionFilters({ status: "", owner: " ", due: "algo" })).toEqual({});
    expect(parseActionFilters({})).toEqual({});
  });

  it("si un parámetro viene repetido usa el primero", () => {
    expect(parseActionFilters({ owner: ["Ana", "Luis"] })).toEqual({
      owner: "Ana",
    });
  });
});

describe("fechas", () => {
  it("el día de hoy se calcula en Hermosillo (UTC-7)", () => {
    // 03:00 UTC del 22 es todavía el 21 en Hermosillo
    expect(todayInHermosillo(new Date("2026-10-22T03:00:00Z"))).toBe("2026-10-21");
    expect(todayInHermosillo(new Date("2026-10-22T08:00:00Z"))).toBe("2026-10-22");
  });

  it("suma días sin desbordar mal los meses", () => {
    expect(addDays("2026-10-29", 7)).toBe("2026-11-05");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("cerradas", () => {
  it("closed=1 pide ver todas; otro valor se ignora", () => {
    expect(parseActionFilters({ closed: "1" })).toEqual({ showClosed: true });
    expect(parseActionFilters({ closed: "0" })).toEqual({});
  });
});

describe("filtros de tipo, urgentes y lo que ya toca", () => {
  it("se leen de la dirección y se ignoran valores raros", () => {
    expect(parseActionFilters({ type: "t1", urgent: "1", appeared: "1" })).toEqual({
      typeId: "t1",
      urgent: true,
      appeared: true,
    });
    expect(parseActionFilters({ urgent: "si", appeared: "0" })).toEqual({});
  });
});
