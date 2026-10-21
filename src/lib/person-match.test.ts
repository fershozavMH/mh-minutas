import { describe, expect, it } from "vitest";
import { matchPerson } from "./person-match";

const people = [
  { id: "1", name: "Daray Arellano" },
  { id: "2", name: "Justin Pérez" },
  { id: "3", name: "Justin López" },
  { id: "4", name: "María José" },
];

describe("matchPerson", () => {
  it("encuentra por nombre de pila si es único", () => {
    expect(matchPerson("Daray", people)).toBe("1");
  });

  it("no adivina si hay dos candidatos", () => {
    expect(matchPerson("Justin", people)).toBeNull();
  });

  it("ignora acentos y mayúsculas", () => {
    expect(matchPerson("maria jose", people)).toBe("4");
    expect(matchPerson("JUSTIN PEREZ", people)).toBe("2");
  });

  it("sin nombre o sin coincidencia devuelve null", () => {
    expect(matchPerson("", people)).toBeNull();
    expect(matchPerson(null, people)).toBeNull();
    expect(matchPerson("Fernando", people)).toBeNull();
  });
});
