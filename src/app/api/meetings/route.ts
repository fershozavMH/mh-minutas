import { getCurrentUser } from "@/lib/current-user";
import { createMeeting, listMeetings } from "@/lib/data/meetings";
import { createMeetingSchema } from "@/lib/meeting-schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const meetings = await listMeetings(user);
  return Response.json({
    meetings: meetings.map((m) => ({ id: m.id, title: m.title, heldAt: m.heldAt, level: m.level.name })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });

  const parsed = createMeetingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "datos_invalidos", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await createMeeting(user, parsed.data);
  if (!result.ok) {
    const status = result.error === "nivel_no_valido" ? 400 : 403;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ id: result.id }, { status: 201 });
}
