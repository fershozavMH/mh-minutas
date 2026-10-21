import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { listLevelsFor } from "@/lib/data/levels";
import { getMeeting } from "@/lib/data/meetings";
import { listPeople } from "@/lib/data/people";
import { matchPerson } from "@/lib/person-match";
import { HelpTip } from "../../help-tip";
import { SignOutButton } from "../../sign-out-button";
import { ProposeButton } from "./propose-button";
import { ReviewList, type ReviewRow } from "./review-list";
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
  const [meeting, people] = await Promise.all([getMeeting(user, id), listPeople()]);
  if (!meeting) notFound();

  const canUpload = user.profile === "ASSISTANT";
  // Un solo siguiente paso a la vez, para no saturar la pantalla.
  const sensitive = meeting.level.isSensitive;
  // Nivel sensible al que la asistente puede pasar esta reunión, para el aviso de temas sensibles.
  const usableLevels = canUpload ? await listLevelsFor(user) : [];
  const sensitiveLevelFull = usableLevels.find((l) => l.isSensitive && l.rank >= meeting.level.rank);
  const sensitiveLevel = sensitiveLevelFull ? { id: sensitiveLevelFull.id, name: sensitiveLevelFull.name } : null;
  const proposed = new Set(meeting.reviewItems.map((item) => item.sourceId));
  const asRow = (item: (typeof meeting.reviewItems)[number]): ReviewRow => {
    const value = (item.editedValue ?? item.aiValue) as Record<string, string | null>;
    // Si el nombre dicho en la reunión coincide con una sola persona del registro, se sugiere.
    const ownerId = item.kind === "ACTION" ? (value.ownerId ?? matchPerson(value.ownerName, people) ?? "") : "";
    return {
      ownerId,
      id: item.id,
      kind: item.kind,
      text: value.text ?? "",
      title: value.title ?? "",
      ownerName: value.ownerName ?? "",
      dueDate: value.dueDate ?? "",
    };
  };
  const pendingRows = meeting.reviewItems.filter((item) => item.status === "PENDING").map(asRow);
  const decided = meeting.reviewItems.filter((item) => item.status !== "PENDING");
  const pending = pendingRows.length;
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
                <ProposeButton meetingId={meeting.id} sourceId={s.id} sensitiveLevel={sensitiveLevel} />
              )}
              {proposed.has(s.id) && "· Propuesta generada"}
            </li>
          ))}
        </ul>
      )}
      {pending > 0 && (
        <>
          <h2>
            Propuestas por revisar <HelpTip topic="review" label="Revisar propuestas" />
          </h2>
          {canUpload ? <ReviewList rows={pendingRows} people={people.map((p) => ({ id: p.id, name: p.name }))} /> : <p>{pending} propuestas pendientes de revisión.</p>}
        </>
      )}
      {decided.length > 0 && (
        <>
          <h2>Ya revisadas</h2>
          <ul>
            {decided.map((item) => {
              const row = asRow(item);
              const label = row.kind === "ACTION" ? `${row.title} (${row.ownerName || "sin responsable"}, ${row.dueDate})` : row.text;
              return (
                <li key={item.id}>
                  {item.status === "APPROVED" ? "Aprobada" : "Rechazada"} · {label}
                  {item.status === "REJECTED" && item.rejectionReason ? ` — Motivo: ${item.rejectionReason}` : ""}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {canUpload && <SourceForm meetingId={meeting.id} heldAt={meeting.heldAt.toISOString().slice(0, 10)} />}
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
