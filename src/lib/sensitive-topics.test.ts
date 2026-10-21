import { describe, expect, it } from "vitest";
import { detectSensitiveTopics } from "./sensitive-topics";

describe("detectSensitiveTopics", () => {
  it("detecta cada tema, con y sin acentos", () => {
    expect(detectSensitiveTopics("Hablamos de la contratación de un nuevo analista")).toEqual(["Contrataciones"]);
    expect(detectSensitiveTopics("Se revisó el aumento de sueldo y el bono trimestral")).toEqual(["Sueldos", "Bonos y comisiones"]);
    expect(detectSensitiveTopics("La renuncia de un colaborador y su finiquito")).toEqual(["Bajas de colaboradores"]);
    expect(detectSensitiveTopics("Crédito para el taller")).toEqual(["Créditos"]);
    expect(detectSensitiveTopics("Un conflicto entre dos áreas")).toEqual(["Conflictos internos"]);
  });
  it("no se confunde con palabras parecidas", () => {
    expect(detectSensitiveTopics("El contrato con el proveedor y la baja prioridad del ticket")).toEqual([]);
    expect(detectSensitiveTopics("Presentar el cronograma del sistema de minutas")).toEqual([]);
  });
  it("devuelve vacío sin texto", () => {
    expect(detectSensitiveTopics("")).toEqual([]);
  });
});
