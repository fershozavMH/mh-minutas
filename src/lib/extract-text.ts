import { unzipSync } from "fflate";

// Lectura de texto de archivos .docx y .pdf. Solo extrae texto: no ejecuta nada del archivo ni sigue enlaces.
// El texto vuelve a la pantalla para que una persona lo revise antes de cargarlo.

// Vercel acepta como máximo ~4,5 MB por petición.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Contra archivos-bomba: lo que el .docx ocupa descomprimido.
const MAX_UNZIPPED_BYTES = 40 * 1024 * 1024;
const MAX_PDF_PAGES = 300;

export type ExtractError = "tipo_no_admitido" | "archivo_grande" | "archivo_danado" | "sin_texto";
export type ExtractResult = { ok: true; text: string } | { ok: false; error: ExtractError };

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((b, i) => bytes[i] === b);
const isZip = (bytes: Uint8Array) => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
const isPdf = (bytes: Uint8Array) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (value: string) =>
  value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] !== "#") return entities[e.toLowerCase()] ?? "";
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  });

// Texto de word/document.xml: un párrafo por línea; tabuladores y saltos se respetan.
export function textFromWordXml(xml: string): string {
  const paragraphs = xml.split(/<\/w:p>/);
  const lines = paragraphs.map((paragraph) => {
    // Los elementos de lista conservan su marca.
    let line = /<w:numPr[\s>]/.test(paragraph) ? "- " : "";
    for (const token of paragraph.matchAll(
      /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab(?:\s[^>]*)?\/>|<w:(?:br|cr)(?:\s[^>]*)?\/?>/g,
    )) {
      if (token[1] !== undefined) line += decode(token[1]);
      else if (token[0].startsWith("<w:tab")) line += "\t";
      else line += "\n";
    }
    return line;
  });
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fromDocx(bytes: Uint8Array): Promise<ExtractResult> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => file.name === "word/document.xml" && file.originalSize <= MAX_UNZIPPED_BYTES,
    });
  } catch {
    return { ok: false, error: "archivo_danado" };
  }
  const document = files["word/document.xml"];
  if (!document) return { ok: false, error: "archivo_danado" };
  const text = textFromWordXml(new TextDecoder("utf-8").decode(document));
  return text ? { ok: true, text } : { ok: false, error: "sin_texto" };
}

async function fromPdf(bytes: Uint8Array): Promise<ExtractResult> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > MAX_PDF_PAGES) return { ok: false, error: "archivo_grande" };
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = (Array.isArray(text) ? text.join("\n") : text).trim();
    // Un PDF escaneado (solo imagen) no trae texto: no se hace OCR.
    return clean ? { ok: true, text: clean } : { ok: false, error: "sin_texto" };
  } catch {
    return { ok: false, error: "archivo_danado" };
  }
}

// El tipo se decide por la firma del archivo, no por su nombre ni su tipo declarado.
export async function extractText(bytes: Uint8Array, fileName: string): Promise<ExtractResult> {
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: "archivo_grande" };
  const name = fileName.toLowerCase();
  if (name.endsWith(".docx") && isZip(bytes)) return fromDocx(bytes);
  if (name.endsWith(".pdf") && isPdf(bytes)) return fromPdf(bytes);
  return { ok: false, error: "tipo_no_admitido" };
}
