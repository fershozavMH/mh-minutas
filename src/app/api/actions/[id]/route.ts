import { updateActionSchema } from "@/lib/action-schemas";
import { actionResponse } from "@/lib/action-http";
import { getCurrentUser } from "@/lib/current-user";
import { updateAction } from "@/lib/data/actions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = updateActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const missingDate = parsed.error.issues.some((i) => i.path[0] === "dueDate");
    return Response.json(
      { error: missingDate ? "fecha_obligatoria" : "datos_invalidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await params;
  return actionResponse(await updateAction(user, id, parsed.data));
}
