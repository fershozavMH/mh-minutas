import { describe, expect, it } from "vitest";
import { findSimilar, similarity } from "./similar-actions";

describe("similar-actions", () => {
  it("ignora acentos, mayúsculas y palabras vacías", () => {
    expect(
      similarity("Enviar cotización al cliente", "enviar cotizacion cliente"),
    ).toBe(1);
  });
  it("no relaciona acciones distintas", () => {
    expect(
      similarity("Enviar cotización al cliente", "Reservar sala de juntas"),
    ).toBe(0);
  });
  it("devuelve las parecidas ordenadas y como máximo tres", () => {
    const found = findSimilar("Enviar cotización del equipo", [
      { title: "Enviar cotización del equipo" },
      { title: "Enviar cotización equipo nuevo" },
      { title: "Pagar renta" },
    ]);
    expect(found.map((f) => f.title)).toEqual([
      "Enviar cotización del equipo",
      "Enviar cotización equipo nuevo",
    ]);
  });
  it("texto vacío no coincide", () => {
    expect(similarity("", "algo")).toBe(0);
  });
});
