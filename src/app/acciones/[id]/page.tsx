import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getAction, getActionHistory } from "@/lib/data/actions";
import { listPeople } from "@/lib/data/people";
import { listActiveStatuses } from "@/lib/data/statuses";
import { HelpTip } from "../../help-tip";
import { SignOutButton } from "../../sign-out-button";
import { ActionEditor } from "./action-editor";

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });
const stampFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Hermosillo",
});

const fieldLabel: Record<string, string> = {
  title: "Acción",
  ownerName: "Responsable",
  dueDate: "Fecha de compromiso",
  status: "Estado",
  statusNote: "Nota del estado",
  retired: "Retirada",
  replaced: "Reemplazada por",
  replaces: "Reemplaza a",
};

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile === "ADMIN") redirect("/");

  const { id } = await params;
  const action = await getAction(user, id);
  if (!action) notFound();
  const [rawHistory, statuses, people] = await Promise.all([getActionHistory(user, id), listActiveStatuses(), listPeople()]);
  const history = rawHistory ?? [];

  const canEdit = user.profile === "ASSISTANT" && !action.retiredAt;
  const statusOptions = statuses.some((s) => s.id === action.statusId)
    ? statuses
    : [{ id: action.statusId, name: action.status.name, requiresNote: action.status.requiresNote }, ...statuses];

  return (
    <>
      <h1>{action.title}</h1>
      <p>
        <Link href="/acciones">Acciones</Link> <SignOutButton />
      </p>
      {action.retiredAt && (
        <p className="hint">
          Acción retirada: {action.retiredReason}.{" "}
          {action.replacedBy && <Link href={`/acciones/${action.replacedBy.id}`}>Ver la acción nueva</Link>}
        </p>
      )}
      {canEdit ? (
        <ActionEditor
          id={action.id}
          title={action.title}
          ownerName={action.ownerName ?? ""}
          ownerId={action.ownerId ?? ""}
          people={people.map((p) => ({ id: p.id, name: p.name }))}
          dueDate={action.dueDate ? action.dueDate.toISOString().slice(0, 10) : ""}
          statusId={action.statusId}
          statusNote={action.statusNote ?? ""}
          statuses={statusOptions.map((s) => ({ id: s.id, name: s.name, requiresNote: s.requiresNote }))}
        />
      ) : (
        <ul>
          <li>Responsable: {action.ownerName ?? "Sin responsable"}</li>
          <li>Compromiso: {action.dueDate ? dateFormat.format(action.dueDate) : "Sin fecha"}</li>
          <li>
            Estado: {action.status.name}
            {action.statusNote ? ` (${action.statusNote})` : ""}
          </li>
          <li>Nivel: {action.level.name}</li>
          {action.meeting && <li>Reunión: {action.meeting.title}</li>}
        </ul>
      )}
      <h2>
        Historial <HelpTip topic="history" label="Historial de cambios" />
      </h2>
      {history.length === 0 ? (
        <p>Sin cambios desde que se aprobó.</p>
      ) : (
        <ul>
          {history.map((h) => (
            <li key={h.id}>
              {stampFormat.format(h.createdAt)} · {h.author.name} · {fieldLabel[h.field] ?? h.field}:{" "}
              {h.oldValue ? `${h.oldValue} → ` : ""}
              {h.newValue}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ActionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main>
      <Suspense fallback={<p>Cargando…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
