"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonPicker, type PersonOption } from "../../person-picker";
import { useBusy } from "../../use-busy";

type Props = {
  id: string;
  title: string;
  ownerName: string;
  ownerId: string;
  dueDate: string;
  statusId: string;
  statusNote: string;
  typeId: string;
  priority: "NORMAL" | "URGENT";
  repeat: "NONE" | "WEEKLY" | "MONTHLY";
  needsScheduling: boolean;
  actionDate: string;
  types: { id: string; name: string }[];
  statuses: { id: string; name: string; requiresNote: boolean }[];
  people: PersonOption[];
};

const errors: Record<string, string> = {
  fecha_obligatoria: "Toda acción necesita una fecha de compromiso.",
  nota_obligatoria: "Ese estado pide una nota: escribe qué se espera o por qué se cancela.",
  sin_cambios: "No hay nada que cambiar.",
  datos_invalidos: "Revisa el título y la fecha.",
  retirada: "Esta acción ya está retirada.",
  estado_invalido: "Ese estado ya no está disponible.",
  no_existe: "Esta acción ya no está disponible.",
  sin_permiso: "Tu perfil no puede cambiar acciones.",
  tipo_invalido: "Ese tipo ya no está disponible.",
  sin_estado: "No hay estados activos; avisa a Administración.",
  persona_invalida: "Esa persona ya no está disponible.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

async function call(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok)
    return {
      ok: true as const,
      data: (await response.json()) as { id?: string | null },
    };
  const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
  return {
    ok: false as const,
    message: errors[data?.error ?? ""] ?? "No se pudo guardar.",
  };
}

export function ActionEditor(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.title);
  const [owner, setOwner] = useState({
    ownerId: props.ownerId,
    ownerName: props.ownerName,
  });
  const [due, setDue] = useState(props.dueDate);
  const [statusId, setStatusId] = useState(props.statusId);
  const [statusNote, setStatusNote] = useState(props.statusNote);
  const [typeId, setTypeId] = useState(props.typeId);
  const [priority, setPriority] = useState(props.priority);
  const [repeat, setRepeat] = useState(props.repeat);
  const [needsScheduling, setNeedsScheduling] = useState(props.needsScheduling);
  const [actionDate, setActionDate] = useState(props.actionDate);
  const [followBody, setFollowBody] = useState("");
  const needsNote = props.statuses.find((s) => s.id === statusId)?.requiresNote ?? false;
  const [mode, setMode] = useState<"retire" | "replace" | null>(null);
  const [reason, setReason] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState({ ownerId: "", ownerName: "" });
  const [newDue, setNewDue] = useState("");
  const { busy, setBusy, refresh } = useBusy();
  const [message, setMessage] = useState("");

  // Si la acción lleva a otra pantalla, el botón sigue ocupado hasta que se abra.
  async function run(task: () => ReturnType<typeof call>, done: (id?: string | null) => void, navigates = false) {
    setBusy(true);
    setMessage("");
    const result = await task();
    if (!result.ok || !navigates) setBusy(false);
    if (result.ok) done(result.data.id);
    else setMessage(result.message);
  }

  const save = () =>
    run(
      () =>
        call(`/api/actions/${props.id}`, "PATCH", {
          title,
          ownerId: owner.ownerId || null,
          ownerName: owner.ownerId ? null : owner.ownerName || null,
          dueDate: due || "",
          statusId,
          typeId: typeId || null,
          priority,
          repeat,
          needsScheduling,
          ...(actionDate ? { actionDate } : {}),
          ...(needsNote ? { statusNote } : {}),
        }),
      () => {
        setMessage("Cambios guardados.");
        refresh();
      },
    );

  const addFollowUp = () =>
    run(
      () =>
        call(`/api/actions/${props.id}/followups`, "POST", {
          body: followBody,
        }),
      () => {
        setFollowBody("");
        setMessage("Avance agregado.");
        refresh();
      },
    );

  const retire = () =>
    run(
      () => call(`/api/actions/${props.id}/retire`, "POST", { reason }),
      () => refresh(),
    );

  const replace = () =>
    run(
      () =>
        call(`/api/actions/${props.id}/replace`, "POST", {
          title: newTitle,
          ownerId: newOwner.ownerId || null,
          ownerName: newOwner.ownerId ? null : newOwner.ownerName || null,
          dueDate: newDue || null,
        }),
      (id) => router.push(id ? `/acciones/${id}` : "/acciones"),
      true,
    );

  return (
    <div>
      <div className="field">
        <label>
          Acción <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>
      <div className="field">
        <label>
          Responsable <PersonPicker people={props.people} value={owner} onChange={setOwner} />
        </label>
      </div>
      <div className="field">
        <label>
          Fecha de compromiso <input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
        </label>
      </div>
      <div className="field">
        <label>
          Estado
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            {props.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <label>
          Tipo de pendiente
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Sin tipo</option>
            {props.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <label>
          Prioridad
          <select value={priority} onChange={(e) => setPriority(e.target.value as Props["priority"])}>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>
      </div>
      <div className="field">
        <label>
          Se repite
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as Props["repeat"])}>
            <option value="NONE">No</option>
            <option value="WEEKLY">Cada semana</option>
            <option value="MONTHLY">Cada mes</option>
          </select>
        </label>
      </div>
      <div className="field">
        <label>
          Aparece en la vista desde{" "}
          <input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={needsScheduling} onChange={(e) => setNeedsScheduling(e.target.checked)} /> Hay
          que agendarla
        </label>
      </div>
      {needsNote && (
        <div className="field">
          <label>
            Nota del estado (qué se espera o por qué se cancela)
            <input value={statusNote} maxLength={500} onChange={(e) => setStatusNote(e.target.value)} required />
          </label>
        </div>
      )}
      <p>
        <button type="button" disabled={busy} aria-busy={busy} onClick={save}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>{" "}
        <button type="button" disabled={busy} onClick={() => setMode(mode === "replace" ? null : "replace")}>
          Reemplazar
        </button>{" "}
        <button type="button" disabled={busy} onClick={() => setMode(mode === "retire" ? null : "retire")}>
          Retirar
        </button>
      </p>

      {mode === "retire" && (
        <div className="field">
          <label>
            Motivo <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button type="button" disabled={busy || reason.trim() === ""} aria-busy={busy} onClick={retire}>
            {busy ? "Retirando…" : "Confirmar retiro"}
          </button>
        </div>
      )}

      {mode === "replace" && (
        <div>
          <p>La acción actual se retira y se crea la nueva en su lugar.</p>
          <div className="field">
            <label>
              Nueva acción <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </label>
          </div>
          <div className="field">
            <label>
              Responsable <PersonPicker people={props.people} value={newOwner} onChange={setNewOwner} />
            </label>
          </div>
          <div className="field">
            <label>
              Fecha de compromiso{" "}
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} required />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || newTitle.trim() === "" || newDue === ""}
            aria-busy={busy}
            onClick={replace}
          >
            {busy ? "Reemplazando…" : "Confirmar reemplazo"}
          </button>
        </div>
      )}
      <h2>Agregar un avance</h2>
      <div className="field stacked">
        <label>
          Avance (se guarda con la fecha de hoy)
          <textarea rows={2} maxLength={1000} value={followBody} onChange={(e) => setFollowBody(e.target.value)} />
        </label>
        <button type="button" disabled={busy || followBody.trim() === ""} aria-busy={busy} onClick={addFollowUp}>
          {busy ? "Guardando…" : "Agregar avance"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
