import { createHash } from "node:crypto";
import { z } from "zod";

// Límite del texto guardado; el cuerpo de una petición en Vercel admite 4.5 MB.
export const MAX_TRANSCRIPT_CHARS = 1_500_000;

export const addSourceSchema = z.object({
  origin: z.string().trim().min(1).max(200),
  text: z.string().max(MAX_TRANSCRIPT_CHARS),
});

// Deja el texto en una forma estable: el mismo transcript da siempre la misma huella,
// venga con saltos de Windows, BOM o espacios sobrantes.
export function normalizeTranscript(raw: string): string {
  return raw
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
