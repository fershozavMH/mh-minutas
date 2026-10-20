import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getMeeting } from "@/lib/data/meetings";
import { HelpTip } from "../../help-tip";
import { SignOutButton } from "../../sign-out-button";
import { ProposeButton } from "./propose-button";
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
  const sensitive = meeting.level.isSensitive;
  const proposed = new Set(meeting.reviewItems.map((item) => item.sourceId));
  const pending = meeting.reviewItems.filter((item) => item.status === "PENDING").length;
  const nextStep = !canUpload
    ? null
    : meeting.sources.length === 0
      ? "Siguiente paso: carga el transcript de la reunión."
      : sensitive
        ? "Reunión sensible: no se envía a la IA; su ficha se captura a mano."
        : meeting.sources.some((s) => !proposed.has(s.id))
          ? "Siguiente paso: pide la propuesta de la IA para el transcript."
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
      <h2>
        Transcripts <HelpTip topic="proposal" label="Propuesta de la IA" />
      </h2>
      {meeting.sources.length === 0 ? (
        <p>Aún no hay transcripts.</p>
      ) : (
        <ul>
          {meeting.sources.map((s) => (
            <li key={s.id}>
              {s.origin} · {dateTimeFormat.format(s.createdAt)}{" "}
              {canUpload && !sensitive && !proposed.has(s.id) && (
                <ProposeButton meetingId={meeting.id} sourceId={s.id} />
              )}
              {proposed.has(s.id) && "· Propuesta generada"}
            </li>
          ))}
        </ul>
      )}
      {pending > 0 && (
        <p>
          {pending} propuestas pendientes de revisión. La pantalla de revisión llega en la siguiente tarea.
        </p>
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
