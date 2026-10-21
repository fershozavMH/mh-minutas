import { getCurrentUser } from "@/lib/current-user";
import { decideReview } from "@/lib/data/reviews";
import { decisionSchema } from "@/lib/review-schemas";

const statuses = {
  sin_permiso: 403,
  no_existe: 404,
  ya_decidido: 409,
  valor_invalido: 400,
  fecha_obligatoria: 400,
  sin_estado: 503,
  persona_invalida: 400,
} as const;

export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { itemId } = await params;
  const result = await decideReview(user, itemId, parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ ok: true, actionId: result.actionId ?? null });
}
