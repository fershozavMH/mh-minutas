import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getMeeting } from "@/lib/data/meetings";
import { SignOutButton } from "../../sign-out-button";
import { SourceForm } from "./source-form";

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Hermosillo",
});

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile === "ADMIN") redirect("/");

  const { id } = await params;
  const meeting = await getMeeting(user, id);
  if (!meeting) notFound();

  const canUpload = user.profile === "ASSISTANT";
  // Un solo siguiente paso a la vez, para no saturar la pantalla.
  const nextStep =
    meeting.sources.length === 0 && canUpload
      ? "Siguiente paso: carga el transcript de la reunión."
      : null;

  return (
    <>
      <h1>{meeting.title}</h1>
      <p>
        {dateFormat.format(meeting.heldAt)} · Nivel: {meeting.level.name}
      </p>
      <p>
        <Link href="/reuniones">Reuniones</Link> <SignOutButton />
      </p>
      {nextStep && <p className="hint">{nextStep}</p>}
      <h2>Transcripts</h2>
      {meeting.sources.length === 0 ? (
        <p>Aún no hay transcripts.</p>
      ) : (
        <ul>
          {meeting.sources.map((s) => (
            <li key={s.id}>
              {s.origin} · {dateTimeFormat.format(s.createdAt)}
            </li>
          ))}
        </ul>
      )}
      {canUpload && <SourceForm meetingId={meeting.id} />}
    </>
  );
}

export default function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main>
      <Suspense fallback={<p>Cargando…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
