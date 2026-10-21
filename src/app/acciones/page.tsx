import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { parseActionFilters } from "@/lib/action-filters";
import { listActions, listRetiredActions } from "@/lib/data/actions";
import { listMeetings } from "@/lib/data/meetings";
import { listActiveStatuses } from "@/lib/data/statuses";
import { HelpTip } from "../help-tip";
import { SignOutButton } from "../sign-out-button";
import { quickStatuses } from "@/lib/quick-status";
import { FiltersForm } from "./filters-form";
import { QuickStatusCell } from "./quick-status";

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeZone: "UTC",
});

async function Actions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile === "ADMIN") redirect("/");

  const filters = parseActionFilters(await searchParams);
  const filtered = Object.keys(filters).length > 0;
  const canEdit = user.profile === "ASSISTANT";
  const [actions, retired, statuses, meetings] = await Promise.all([
    listActions(user, filters),
    listRetiredActions(user),
    listActiveStatuses(),
    listMeetings(user),
  ]);

  const quick = quickStatuses(statuses);

  return (
    <>
      <FiltersForm
        statuses={statuses.map((x) => ({ id: x.id, name: x.name }))}
        meetings={meetings.map((m) => ({ id: m.id, name: m.title }))}
        initial={{
          status: filters.statusId ?? "",
          due: filters.due ?? "",
          meeting: filters.meetingId ?? "",
          owner: filters.owner ?? "",
        }}
      >
        {actions.length === 0 ? (
          <p className="hint">
            {filtered
              ? "Ninguna acción coincide con esos filtros."
              : user.profile === "ASSISTANT"
                ? "Siguiente paso: aprueba las propuestas de una reunión; cada acción aprobada aparece aquí."
                : "Aún no hay acciones de tus asistentes."}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">
                  Compromiso{" "}
                  <HelpTip topic="actions" label="Acciones oficiales" />
                </th>
                <th scope="col">Acción</th>
                <th scope="col">Responsable</th>
                <th scope="col">Estado</th>
                <th scope="col">Reunión</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.dueDate ? dateFormat.format(a.dueDate) : "Sin fecha"}
                  </td>
                  <td>
                    <Link href={`/acciones/${a.id}`}>{a.title}</Link>
                  </td>
                  <td>{a.ownerName ?? "Sin responsable"}</td>
                  <td>
                    {canEdit ? (
                      <QuickStatusCell actionId={a.id} current={{ id: a.status.id, name: a.status.name }} options={quick} />
                    ) : (
                      a.status.name
                    )}
                  </td>
                  <td>{a.meeting?.title ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {retired.length > 0 && (
          <>
            <h2>Retiradas o reemplazadas</h2>
            <ul>
              {retired.map((a) => (
                <li key={a.id}>
                  <Link href={`/acciones/${a.id}`}>{a.title}</Link> ·{" "}
                  {a.retiredReason}
                </li>
              ))}
            </ul>
          </>
        )}
      </FiltersForm>
    </>
  );
}

export default function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main>
      <h1>Acciones</h1>
      <p>
        <Link href="/">Inicio</Link> <Link href="/reuniones">Reuniones</Link>{" "}
        <Link href="/personas">Personas</Link> <SignOutButton />
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <Actions searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
