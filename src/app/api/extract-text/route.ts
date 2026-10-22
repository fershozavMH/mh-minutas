import { getCurrentUser } from "@/lib/current-user";
import { extractText, MAX_FILE_BYTES } from "@/lib/extract-text";

export const maxDuration = 30;

const statuses = { tipo_no_admitido: 415, archivo_grande: 413, archivo_danado: 422, sin_texto: 422 } as const;

// Devuelve el texto de un .docx o .pdf para revisarlo antes de cargarlo; no guarda nada.
// Solo las asistentes cargan transcripts.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });
  if (user.profile !== "ASSISTANT") return Response.json({ error: "sin_permiso" }, { status: 403 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 64 * 1024) return Response.json({ error: "archivo_grande" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "datos_invalidos" }, { status: 400 });

  const result = await extractText(new Uint8Array(await file.arrayBuffer()), file.name);
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ text: result.text });
}
