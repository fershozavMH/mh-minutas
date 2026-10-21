import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { listLevelsFor } from "@/lib/data/levels";
import { listMeetings } from "@/lib/data/meetings";
import { SignOutButton } from "../sign-out-button";
import { MeetingForm } from "./meeting-form";

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" });

async function Meetings() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile === "ADMIN") redirect("/");

  const canCreate = user.profile === "ASSISTANT";
  const [meetings, levels] = await Promise.all([listMeetings(user), canCreate ? listLevelsFor(user) : []]);

  // Un solo siguiente paso a la vez, para no saturar la pantalla.
  const nextStep =
    meetings.length === 0
      ? canCreate
        ? "Siguiente paso: crea tu primera reunión con título, fecha y nivel."
        : "Aún no hay reuniones de tus asistentes."
      : null;

  return (
    <>
      {nextStep && <p className="hint">{nextStep}</p>}
      {meetings.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Título</th>
              <th>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td>{dateFormat.format(m.heldAt)}</td>
                <td>
                  <Link href={`/reuniones/${m.id}`}>{m.title}</Link>
                </td>
                <td>{m.level.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canCreate && <MeetingForm levels={levels.map((l) => ({ id: l.id, name: l.name, isSensitive: l.isSensitive }))} />}
    </>
  );
}

export default function MeetingsPage() {
  return (
    <main>
      <h1>Reuniones</h1>
      <p>
        <Link href="/">Inicio</Link> <Link href="/acciones">Acciones</Link> <SignOutButton />
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <Meetings />
      </Suspense>
    </main>
  );
}
