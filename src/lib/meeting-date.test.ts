import { describe, expect, it } from "vitest";
import { detectMeetingDate } from "./meeting-date";

describe("detectMeetingDate", () => {
  it("lee la fecha del encabezado de una minuta", () => {
    expect(detectMeetingDate("Tecnología y Sistemas MH (20 de octubre de 2026)\nYuri Ramírez / Justin")).toBe("2026-10-20");
  });
  it("acepta otros formatos", () => {
    expect(detectMeetingDate("Reunión 2026-10-20")).toBe("2026-10-20");
    expect(detectMeetingDate("Notas del 20/10/2026")).toBe("2026-10-20");
    expect(detectMeetingDate("20 oct 2026 - Semanal")).toBe("2026-10-20");
    expect(detectMeetingDate("Oct 20, 2026 - Notes by Gemini")).toBe("2026-10-20");
    expect(detectMeetingDate("Sábado 3 de enero de 2026")).toBe("2026-01-03");
  });
  it("ignora fechas sin año, como los compromisos (22-oct, próxima semana)", () => {
    expect(detectMeetingDate("Presentar el cronograma | Fernando | 22-oct")).toBeNull();
  });
  it("no mira más allá del encabezado", () => {
    expect(detectMeetingDate(`${"x ".repeat(400)} 20 de octubre de 2026`)).toBeNull();
  });
  it("descarta fechas imposibles", () => {
    expect(detectMeetingDate("31 de febrero de 2026")).toBeNull();
    expect(detectMeetingDate("45/10/2026")).toBeNull();
  });
  it("con año supuesto, lee mes y día del título", () => {
    expect(detectMeetingDate("Proyectos Tec-Semanal 6 - October 15", 2026)).toBe("2026-10-15");
    expect(detectMeetingDate("Semanal del 15 de octubre", 2026)).toBe("2026-10-15");
    expect(detectMeetingDate("Semanal 15 oct", 2026)).toBe("2026-10-15");
  });
  it("sin año supuesto no adivina, y fuera del título tampoco", () => {
    expect(detectMeetingDate("Proyectos Tec-Semanal 6 - October 15")).toBeNull();
    expect(detectMeetingDate(`${"x ".repeat(150)} October 15`, 2026)).toBeNull();
  });
  it("una fecha completa gana sobre la supuesta", () => {
    expect(detectMeetingDate("Semanal 15 oct - 20 de octubre de 2025", 2026)).toBe("2025-10-20");
  });
  it("devuelve null si no hay fecha", () => {
    expect(detectMeetingDate("Sin fecha aquí")).toBeNull();
  });
});
