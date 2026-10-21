import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { listActions, listRetiredActions } from "@/lib/data/actions";
import { HelpTip } from "../help-tip";
import { SignOutButton } from "../sign-out-button";

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" });

async function Actions() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile === "ADMIN") redirect("/");

  const [actions, retired] = await Promise.all([listActions(user), listRetiredActions(user)]);

  return (
    <>
      {actions.length === 0 ? (
        <p className="hint">
          {user.profile === "ASSISTANT"
            ? "Siguiente paso: aprueba las propuestas de una reunión; cada acción aprobada aparece aquí."
            : "Aún no hay acciones de tus asistentes."}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>
                Compromiso <HelpTip topic="actions" label="Acciones oficiales" />
              </th>
              <th>Acción</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Reunión</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td>{a.dueDate ? dateFormat.format(a.dueDate) : "Sin fecha"}</td>
                <td>
                  <Link href={`/acciones/${a.id}`}>{a.title}</Link>
                </td>
                <td>{a.ownerName ?? "Sin responsable"}</td>
                <td>{a.status.name}</td>
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
                <Link href={`/acciones/${a.id}`}>{a.title}</Link> · {a.retiredReason}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function ActionsPage() {
  return (
    <main>
      <h1>Acciones</h1>
      <p>
        <Link href="/">Inicio</Link> <Link href="/reuniones">Reuniones</Link> <SignOutButton />
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <Actions />
      </Suspense>
    </main>
  );
}
