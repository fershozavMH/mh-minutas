export const dueFilters = ["overdue", "week", "none"] as const;
export type DueFilter = (typeof dueFilters)[number];

export type ActionFilters = {
  statusId?: string;
  owner?: string;
  meetingId?: string;
  due?: DueFilter;
  // Por defecto las cerradas hace más de 7 días no salen; con esto salen todas.
  showClosed?: true;
  typeId?: string;
  // Solo urgentes.
  urgent?: true;
  // Solo lo que ya le toca verse (fecha de aparición hoy o pasada).
  appeared?: true;
};

export const CLOSED_VISIBLE_DAYS = 7;

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim();

// Lee los filtros de la dirección; lo que no se reconoce se ignora.
export function parseActionFilters(params: Params): ActionFilters {
  const statusId = first(params.status);
  const owner = first(params.owner);
  const meetingId = first(params.meeting);
  const due = first(params.due);
  const closed = first(params.closed);
  const typeId = first(params.type);
  const urgent = first(params.urgent);
  const appeared = first(params.appeared);
  return {
    ...(statusId ? { statusId } : {}),
    ...(owner ? { owner: owner.slice(0, 120) } : {}),
    ...(meetingId ? { meetingId } : {}),
    ...(due && (dueFilters as readonly string[]).includes(due) ? { due: due as DueFilter } : {}),
    ...(closed === "1" ? { showClosed: true as const } : {}),
    ...(typeId ? { typeId } : {}),
    ...(urgent === "1" ? { urgent: true as const } : {}),
    ...(appeared === "1" ? { appeared: true as const } : {}),
  };
}

// El día de hoy en Hermosillo (AAAA-MM-DD), que es donde se trabaja.
export function todayInHermosillo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Hermosillo",
  }).format(now);
}

// Las fechas de compromiso se guardan a mediodía UTC; el día empieza a las 00:00 UTC de ese día.
export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, days: number): string {
  const date = dayStart(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
