import { getCurrentUser } from "@/lib/current-user";
import { updatePerson } from "@/lib/data/people";
import { updatePersonSchema } from "@/lib/people-schemas";

const statuses = { sin_permiso: 403, no_existe: 404, correo_repetido: 409, sin_cambios: 400 } as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = updatePersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });

  const { id } = await params;
  const result = await updatePerson(user, id, parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ ok: true });
}
