import { retireActionSchema } from "@/lib/action-schemas";
import { actionResponse } from "@/lib/action-http";
import { getCurrentUser } from "@/lib/current-user";
import { retireAction } from "@/lib/data/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = retireActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });

  const { id } = await params;
  return actionResponse(await retireAction(user, id, parsed.data.reason));
}
