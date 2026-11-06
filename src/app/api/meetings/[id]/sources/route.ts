import { getCurrentUser } from "@/lib/current-user";
import { addSource } from "@/lib/data/sources";
import { addSourceSchema } from "@/lib/transcript";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = addSourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const result = await addSource(user, id, parsed.data);
  if (!result.ok) {
    const status =
      result.error === "no_existe" ? 404 : result.error === "duplicado" ? 409 : result.error === "texto_vacio" ? 400 : 403;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ id: result.id }, { status: 201 });
}
