import type { ActionChangeResult } from "./data/actions";

const statuses = {
  sin_permiso: 403,
  no_existe: 404,
  retirada: 409,
  sin_cambios: 400,
  estado_invalido: 400,
  sin_estado: 503,
  persona_invalida: 400,
  nota_obligatoria: 400,
} as const;

export function actionResponse(result: ActionChangeResult) {
  if (!result.ok) return Response.json({ error: result.error }, { status: statuses[result.error] });
  return Response.json({ ok: true, id: result.id ?? null });
}
