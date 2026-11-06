// Detección de acciones parecidas: compara palabras significativas sin acentos ni mayúsculas.
const STOP = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "y",
  "o",
  "a",
  "en",
  "con",
  "por",
  "para",
  "que",
  "del",
  "al",
  "se",
  "su",
  "sus",
  "lo",
  "le",
  "les",
  "es",
  "e",
]);

export function significantWords(text: string): Set<string> {
  const words = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(words);
}

// Similitud de Jaccard entre las palabras significativas (0 a 1).
export function similarity(a: string, b: string): number {
  const wa = significantWords(a);
  const wb = significantWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / (wa.size + wb.size - shared);
}

export const SIMILARITY_THRESHOLD = 0.6;

export function findSimilar<T extends { title: string }>(
  title: string,
  candidates: T[],
  threshold = SIMILARITY_THRESHOLD,
): (T & { score: number })[] {
  return candidates
    .map((c) => ({ ...c, score: similarity(title, c.title) }))
    .filter((c) => c.score >= threshold)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
}
