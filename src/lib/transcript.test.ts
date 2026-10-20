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
