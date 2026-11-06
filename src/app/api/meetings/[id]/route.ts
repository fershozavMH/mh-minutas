import { getCurrentUser } from "@/lib/current-user";
import { updateMeeting } from "@/lib/data/meetings";
import { updateMeetingSchema } from "@/lib/meeting-schemas";

const statuses = {
  sin_permiso: 403,
  no_existe: 404,
  nivel_no_valido: 400,
  nivel_no_permitido: 403,
  solo_subir_nivel: 409,
} as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = updateMeetingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateMeeting(user, id, parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ ok: true });
}
