import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extractText, MAX_FILE_BYTES, textFromWordXml } from "./extract-text";

const docx = (xml: string) =>
  zipSync({ "word/document.xml": strToU8(xml), "[Content_Types].xml": strToU8("<Types/>") });

// PDF mínimo con una línea de texto; el índice de referencias se calcula aquí.
function pdf(text: string): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${`BT /F1 12 Tf 10 50 Td (${text}) Tj ET`.length} >>\nstream\nBT /F1 12 Tf 10 50 Td (${text}) Tj ET\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

describe("extract-text", () => {
  it("lee los párrafos de un .docx, con tabuladores y entidades", async () => {
    const xml = `<w:document><w:body><w:p><w:r><w:t>Resumen &amp; decisiones</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Daray</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>Enviar firmas</w:t></w:r></w:p></w:body></w:document>`;
    const result = await extractText(docx(xml), "notas.docx");
    expect(result).toEqual({ ok: true, text: "Resumen & decisiones\nDaray\tEnviar firmas" });
  });

  it("lee el texto de un .pdf", async () => {
    const result = await extractText(pdf("Acuerdo de la reunion"), "notas.pdf");
    expect(result.ok && result.text).toContain("Acuerdo de la reunion");
  });

  it("decide el tipo por la firma, no por el nombre", async () => {
    expect(await extractText(new TextEncoder().encode("texto plano"), "notas.pdf")).toEqual({
      ok: false,
      error: "tipo_no_admitido",
    });
    expect(await extractText(pdf("x"), "notas.docx")).toEqual({ ok: false, error: "tipo_no_admitido" });
    expect(await extractText(docx("<w:p/>"), "notas.txt")).toEqual({ ok: false, error: "tipo_no_admitido" });
  });

  it("rechaza archivos grandes, dañados o sin texto", async () => {
    expect(await extractText(new Uint8Array(MAX_FILE_BYTES + 1), "a.pdf")).toEqual({
      ok: false,
      error: "archivo_grande",
    });
    expect(await extractText(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), "a.docx")).toEqual({
      ok: false,
      error: "archivo_danado",
    });
    expect(await extractText(zipSync({ "otro.xml": strToU8("x") }), "a.docx")).toEqual({
      ok: false,
      error: "archivo_danado",
    });
    expect(await extractText(docx("<w:p></w:p>"), "a.docx")).toEqual({ ok: false, error: "sin_texto" });
  });

  it("respeta saltos con atributos y marca los elementos de lista", () => {
    const xml = `<w:p><w:r><w:t>Resumen</w:t><w:br w:type="textWrapping"/><w:t>Texto</w:t></w:r></w:p><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Paso uno</w:t></w:r></w:p>`;
    expect(textFromWordXml(xml)).toBe("Resumen\nTexto\n- Paso uno");
  });

  it("textFromWordXml ignora etiquetas desconocidas y colapsa líneas vacías", () => {
    expect(textFromWordXml("<w:p><w:t>A</w:t></w:p><w:p></w:p><w:p></w:p><w:p></w:p><w:p><w:t>B</w:t></w:p>")).toBe(
      "A\n\nB",
    );
  });
});
