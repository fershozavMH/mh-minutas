// Frontera de la IA: solo la capa de datos de propuestas puede hablar con ella, y esa capa
// corta los niveles sensibles antes. Si alguien importa la IA desde otro lugar, esta prueba falla.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("frontera de la IA", () => {
  const sources = files(root).filter((f) => !/\.test\.tsx?$/.test(f));

  it("solo data/proposals.ts importa el módulo de la IA", () => {
    const importers = sources
      .filter((f) => /from\s+["'][^"']*\/ai\/propose["']|from\s+["']\.\/propose["']/.test(readFileSync(f, "utf8")))
      .map((f) => relative(root, f).replaceAll("\\", "/"))
      .filter((f) => f !== "lib/ai/propose.ts");
    expect(importers).toEqual(["lib/data/proposals.ts"]);
  });

  it("nadie más usa el SDK de Anthropic", () => {
    const users = sources
      .filter((f) => readFileSync(f, "utf8").includes("@anthropic-ai/sdk"))
      .map((f) => relative(root, f).replaceAll("\\", "/"));
    expect(users).toEqual(["lib/ai/propose.ts"]);
  });

  it("la capa de propuestas corta el nivel sensible antes de crear el cliente", () => {
    const code = readFileSync(join(root, "lib/data/proposals.ts"), "utf8");
    expect(code.indexOf("isSensitive")).toBeGreaterThan(-1);
    expect(code.indexOf("isSensitive")).toBeLessThan(code.indexOf("createAiClient()"));
    expect(code.indexOf("isSensitive")).toBeLessThan(code.indexOf("proposeFromTranscript("));
  });
});
