import { getCurrentUser } from "@/lib/current-user";
import { requestProposal } from "@/lib/data/proposals";

const statuses = {
  sin_permiso: 403,
  nivel_sensible: 403,
  no_existe: 404,
  ya_propuesto: 409,
  ia_no_configurada: 503,
  ia_fallo: 502,
} as const;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const { id, sourceId } = await params;
  const result = await requestProposal(user, id, sourceId);
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ count: result.count }, { status: 201 });
}
