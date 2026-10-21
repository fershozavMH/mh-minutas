// Detecta la fecha de la reunión en el encabezado de un texto (minuta, correo o transcript).
// Solo se mira el principio: más abajo las fechas suelen ser compromisos, no la reunión.
// Es una sugerencia: una persona decide si la usa.

const HEAD_CHARS = 600;

const months: Record<string, number> = {
  enero: 1, ene: 1, january: 1, jan: 1,
  febrero: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  abril: 4, abr: 4, april: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6, june: 6,
  julio: 7, jul: 7, july: 7,
  agosto: 8, ago: 8, august: 8, aug: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, september: 9,
  octubre: 10, oct: 10, october: 10,
  noviembre: 11, nov: 11, november: 11,
  diciembre: 12, dic: 12, december: 12, dec: 12,
};

const monthNames = Object.keys(months).sort((a, b) => b.length - a.length).join("|");

type Candidate = { index: number; year: number; month: number; day: number };

function valid({ year, month, day }: Omit<Candidate, "index">): string | null {
  if (year < 2000 || year > 2100) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

export function detectMeetingDate(text: string): string | null {
  const head = text.slice(0, HEAD_CHARS).toLowerCase();
  const found: Candidate[] = [];

  // 2026-10-20
  for (const m of head.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    found.push({ index: m.index, year: +m[1], month: +m[2], day: +m[3] });
  }
  // 20 de octubre de 2026 · 20 oct 2026 · 20-oct-2026
  for (const m of head.matchAll(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+|-\\s*)?(${monthNames})\\.?\\s*(?:de\\s+|-\\s*|,\\s*)?(\\d{4})\\b`, "g"))) {
    found.push({ index: m.index, year: +m[3], month: months[m[2]], day: +m[1] });
  }
  // Oct 20, 2026 · October 20, 2026
  for (const m of head.matchAll(new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "g"))) {
    found.push({ index: m.index, year: +m[3], month: months[m[1]], day: +m[2] });
  }
  // 20/10/2026 · 20-10-2026 (día primero, como se escribe en México)
  for (const m of head.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g)) {
    found.push({ index: m.index, year: +m[3], month: +m[2], day: +m[1] });
  }

  found.sort((a, b) => a.index - b.index);
  for (const candidate of found) {
    const iso = valid(candidate);
    if (iso) return iso;
  }
  return null;
}
