import { getCurrentUser } from "@/lib/current-user";
import { createPerson, listPeople } from "@/lib/data/people";
import { createPersonSchema } from "@/lib/people-schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });
  const people = await listPeople();
  return Response.json({ people: people.map((p) => ({ id: p.id, name: p.name, email: p.email })) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = createPersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });

  const result = await createPerson(user, parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "sin_permiso" ? 403 : 409 });
  return Response.json({ id: result.id }, { status: 201 });
}
