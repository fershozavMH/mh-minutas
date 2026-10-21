import { getCurrentUser } from "@/lib/current-user";
import { requestProposal } from "@/lib/data/proposals";

const statuses = {
  sin_permiso: 403,
  nivel_sensible: 403,
  no_existe: 404,
  ya_propuesto: 409,
  posible_sensible: 409,
  limite_diario: 429,
  ia_no_configurada: 503,
  ia_fallo: 502,
} as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const { id, sourceId } = await params;
  // Con { acknowledge: true } la persona confirma que quiere enviar aunque el texto parezca sensible.
  const body = (await request.json().catch(() => null)) as { acknowledge?: unknown } | null;
  const result = await requestProposal(user, id, sourceId, { acknowledgeTopics: body?.acknowledge === true });
  if (!result.ok) {
    const extra = result.error === "posible_sensible" ? { topics: result.topics } : {};
    return Response.json({ error: result.error, ...extra }, { status: statuses[result.error] });
  }
  return Response.json({ count: result.count }, { status: 201 });
}
