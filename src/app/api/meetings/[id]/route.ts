import { getCurrentUser } from "@/lib/current-user";
import { updateMeetingDate } from "@/lib/data/meetings";
import { updateMeetingDateSchema } from "@/lib/meeting-schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = updateMeetingDateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateMeetingDate(user, id, parsed.data.heldAt);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "no_existe" ? 404 : 403 });
  return Response.json({ ok: true });
}
