// Sugiere la persona del registro que corresponde a un nombre dicho en una reunión («Daray»).
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

type Candidate = { id: string; name: string; aliases?: string[] };

// Solo devuelve una persona si la coincidencia es única (nombre, alias o nombre de pila); con duda, no adivina.
export function matchPerson(name: string | null | undefined, people: Candidate[]): string | null {
  const wanted = normalize(name ?? "");
  if (!wanted) return null;

  const exact = people.filter((p) => normalize(p.name) === wanted);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  // Un alias cuenta igual que un nombre completo: solo si es de una única persona.
  const byAlias = people.filter((p) => (p.aliases ?? []).some((alias) => normalize(alias) === wanted));
  if (byAlias.length === 1) return byAlias[0].id;
  if (byAlias.length > 1) return null;

  const partial = people.filter((p) => {
    const words = normalize(p.name).split(" ");
    return words.includes(wanted) || normalize(p.name).startsWith(`${wanted} `);
  });
  return partial.length === 1 ? partial[0].id : null;
}
