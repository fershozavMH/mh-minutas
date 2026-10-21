"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  title: string;
  ownerName: string;
  dueDate: string;
  statusId: string;
  statuses: { id: string; name: string }[];
};

const errors: Record<string, string> = {
  fecha_obligatoria: "Toda acción necesita una fecha de compromiso.",
  sin_cambios: "No hay nada que cambiar.",
  datos_invalidos: "Revisa el título y la fecha.",
  retirada: "Esta acción ya está retirada.",
  estado_invalido: "Ese estado ya no está disponible.",
  no_existe: "Esta acción ya no está disponible.",
  sin_permiso: "Tu perfil no puede cambiar acciones.",
  sin_estado: "No hay estados activos; avisa a Administración.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

async function call(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return { ok: true as const, data: (await response.json()) as { id?: string | null } };
  const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
  return { ok: false as const, message: errors[data?.error ?? ""] ?? "No se pudo guardar." };
}

export function ActionEditor(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.title);
  const [owner, setOwner] = useState(props.ownerName);
  const [due, setDue] = useState(props.dueDate);
  const [statusId, setStatusId] = useState(props.statusId);
  const [mode, setMode] = useState<"retire" | "replace" | null>(null);
  const [reason, setReason] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDue, setNewDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(task: () => ReturnType<typeof call>, done: (id?: string | null) => void) {
    setBusy(true);
    setMessage("");
    const result = await task();
    setBusy(false);
    if (result.ok) done(result.data.id);
    else setMessage(result.message);
  }

  const save = () =>
    run(
      () => call(`/api/actions/${props.id}`, "PATCH", { title, ownerName: owner || null, dueDate: due || "", statusId }),
      () => {
        setMessage("Cambios guardados.");
        router.refresh();
      },
    );

  const retire = () =>
    run(
      () => call(`/api/actions/${props.id}/retire`, "POST", { reason }),
      () => router.refresh(),
    );

  const replace = () =>
    run(
      () => call(`/api/actions/${props.id}/replace`, "POST", { title: newTitle, ownerName: newOwner || null, dueDate: newDue || null }),
      (id) => router.push(id ? `/acciones/${id}` : "/acciones"),
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
          Responsable <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Sin responsable" />
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
      <p>
        <button type="button" disabled={busy} onClick={save}>
          Guardar cambios
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
          <button type="button" disabled={busy || reason.trim() === ""} onClick={retire}>
            Confirmar retiro
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
              Responsable <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} placeholder="Sin responsable" />
            </label>
          </div>
          <div className="field">
            <label>
              Fecha de compromiso <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} required />
            </label>
          </div>
          <button type="button" disabled={busy || newTitle.trim() === "" || newDue === ""} onClick={replace}>
            Confirmar reemplazo
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
