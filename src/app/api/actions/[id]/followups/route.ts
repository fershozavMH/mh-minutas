import { followUpSchema } from "@/lib/action-schemas";
import { actionResponse } from "@/lib/action-http";
import { getCurrentUser } from "@/lib/current-user";
import { addFollowUp } from "@/lib/data/actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = followUpSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "datos_invalidos", issues: parsed.error.issues },
      { status: 400 },
    );

  const { id } = await params;
  return actionResponse(await addFollowUp(user, id, parsed.data));
}
