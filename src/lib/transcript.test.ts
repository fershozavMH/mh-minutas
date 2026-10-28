import { describe, expect, it } from "vitest";
import { addSourceSchema, hashText, normalizeTranscript } from "./transcript";

describe("normalizeTranscript", () => {
  it("unifica saltos de línea, quita BOM y espacios sobrantes", () => {
    expect(normalizeTranscript("﻿Hola  \r\nMundo\r\n")).toBe("Hola\nMundo");
  });

  it("colapsa líneas en blanco repetidas y quita caracteres de control", () => {
    expect(normalizeTranscript("a\n\n\n\n\nb\u0000")).toBe("a\n\nb");
  });

  it("conserva acentos y el contenido", () => {
    expect(normalizeTranscript("  Acción: revisión  ")).toBe("Acción: revisión");
  });

  it("devuelve vacío si solo hay espacios", () => {
    expect(normalizeTranscript(" \n\t \r\n ")).toBe("");
  });
});

describe("normalizeTranscript: ruido de las herramientas", () => {
  it("quita pies y enlaces de Otter, Gemini y Fathom", () => {
    const raw = [
      "Semanal - October 15",
      "VIEW RECORDING - 36 mins (No highlights)",
      "Ana: Hola",
      "La transcripción finalizó después de 01:07:50",
      "Esta transcripción editable se generó por computadora y puede contener errores.",
      "Revisa las notas de Gemini para asegurarte de que sean precisas.",
      "Cómo es la calidad de estas notas específicas? Responde una breve encuesta.",
      "Transcribed by https://otter.ai",
    ].join("\n");
    expect(normalizeTranscript(raw)).toBe("Semanal - October 15\nAna: Hola");
  });
  it("no toca frases normales que mencionan estas palabras", () => {
    expect(normalizeTranscript("Ana: La transcripción es larga")).toBe("Ana: La transcripción es larga");
  });
});

describe("hashText", () => {
  it("es estable y distingue textos", () => {
    expect(hashText("a")).toBe(hashText("a"));
    expect(hashText("a")).not.toBe(hashText("b"));
    expect(hashText("a")).toHaveLength(64);
  });

  it("el mismo transcript con distintos saltos da la misma huella", () => {
    expect(hashText(normalizeTranscript("x\r\ny\r\n"))).toBe(hashText(normalizeTranscript("x\ny")));
  });
});

describe("addSourceSchema", () => {
  it("exige origen y limita el tamaño", () => {
    expect(addSourceSchema.safeParse({ origin: " ", text: "hola" }).success).toBe(false);
    expect(addSourceSchema.safeParse({ origin: "texto pegado", text: "hola" }).success).toBe(true);
    expect(addSourceSchema.safeParse({ origin: "x", text: "a".repeat(1_500_001) }).success).toBe(false);
  });
});
