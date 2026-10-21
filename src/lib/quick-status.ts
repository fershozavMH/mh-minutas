// Los tres botones rápidos de la lista de acciones, tomados de los estados activos
// (los estados se editan en Administración, así que no se atan a un nombre):
// - pendiente: el estado inicial, el primero de los abiertos;
// - completado: el primer estado que cierra la acción;
// - cancelado: el último estado que cierra la acción, si es distinto del anterior.
export type QuickKind = "pending" | "done" | "cancelled";
export type QuickStatus = {
  id: string;
  name: string;
  kind: QuickKind;
  requiresNote: boolean;
};

type StatusLike = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  requiresNote?: boolean;
};

const pick = (status: StatusLike, kind: QuickKind): QuickStatus => ({
  id: status.id,
  name: status.name,
  kind,
  requiresNote: status.requiresNote ?? false,
});

export function quickStatuses(statuses: StatusLike[]): QuickStatus[] {
  const sorted = [...statuses].sort((a, b) => a.position - b.position);
  const open = sorted.filter((s) => !s.isClosed);
  const closed = sorted.filter((s) => s.isClosed);
  const result: QuickStatus[] = [];
  if (open[0]) result.push(pick(open[0], "pending"));
  if (closed[0]) result.push(pick(closed[0], "done"));
  const last = closed[closed.length - 1];
  if (last && last.id !== closed[0]?.id) result.push(pick(last, "cancelled"));
  return result;
}
