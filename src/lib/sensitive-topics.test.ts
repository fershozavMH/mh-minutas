import { describe, expect, it } from "vitest";
import { detectSensitiveTopics } from "./sensitive-topics";

const detect = detectSensitiveTopics;

describe("detectSensitiveTopics", () => {
  it("detecta cada tema, con y sin acentos", () => {
    expect(detect("Hablamos de la contratación de personal para el taller")).toEqual(["Contrataciones"]);
    expect(detect("Se revisó el aumento de sueldo y el bono trimestral")).toEqual(["Sueldos", "Bonos y comisiones"]);
    expect(detect("La renuncia de un colaborador y su finiquito")).toEqual(["Bajas de colaboradores"]);
    expect(detect("Un crédito para colaboradores del taller")).toEqual(["Créditos"]);
    expect(detect("Un conflicto entre dos áreas")).toEqual(["Conflictos internos"]);
  });
  it("Contrataciones: solo personal", () => {
    expect(detect("Abrimos una vacante de analista")).toEqual(["Contrataciones"]);
    expect(detect("Hay que contratar a un analista nuevo")).toEqual(["Contrataciones"]);
    expect(detect("Vamos a contratar a un proveedor de hosting")).toEqual([]);
    expect(detect("La contratación del servicio de internet")).toEqual([]);
  });
  it("Créditos: solo los de personal", () => {
    expect(detect("El crédito del cliente fue aprobado")).toEqual([]);
    expect(detect("Revisar la línea de crédito con el banco")).toEqual([]);
    expect(detect("Préstamos para empleados")).toEqual(["Créditos"]);
  });
  it("Bonos y comisiones sigue activo", () => {
    expect(detect("Cambiar las reglas de comisiones de ventas")).toEqual(["Bonos y comisiones"]);
  });
  it("Negociaciones con proveedores", () => {
    expect(detect("Negociación con proveedores de refacciones")).toEqual(["Negociaciones con proveedores"]);
    expect(detect("Pedir descuento al proveedor")).toEqual(["Negociaciones con proveedores"]);
    expect(detect("El margen de los proveedores bajó")).toEqual(["Negociaciones con proveedores"]);
    expect(detect("Revisar el proveedor de internet")).toEqual([]);
  });
  it("no se confunde con palabras parecidas", () => {
    expect(detect("El contrato con el proveedor y la baja prioridad del ticket")).toEqual([]);
    expect(detect("Presentar el cronograma del sistema de minutas")).toEqual([]);
  });
  it("devuelve vacío sin texto", () => {
    expect(detect("")).toEqual([]);
  });
});
