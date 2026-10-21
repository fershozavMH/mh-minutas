"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ReviewRow = {
  id: string;
  kind: "SUMMARY" | "DECISION" | "RISK" | "NEXT_STEP" | "ACTION";
  text: string;
  title: string;
  ownerName: string;
  dueDate: string;
};

const kindLabel: Record<ReviewRow["kind"], string> = {
  SUMMARY: "Resumen",
  DECISION: "Decisión",
  RISK: "Riesgo",
  NEXT_STEP: "Siguiente paso",
  ACTION: "Acción",
};

const errors: Record<string, string> = {
  fecha_obligatoria: "Toda acción necesita una fecha de compromiso.",
  valor_invalido: "Revisa el texto: no puede quedar vacío.",
  ya_decidido: "Esta propuesta ya fue decidida.",
  no_existe: "Esta propuesta ya no está disponible.",
  sin_permiso: "Tu perfil no puede decidir propuestas.",
  sin_estado: "No hay estados de acción activos; avisa a Administración.",
  datos_invalidos: "Revisa los datos.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

function Item({ row }: { row: ReviewRow }) {
  const router = useRouter();
  const [text, setText] = useState(row.text);
  const [title, setTitle] = useState(row.title);
  const [owner, setOwner] = useState(row.ownerName);
  const [due, setDue] = useState(row.dueDate);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send(body: unknown) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/review/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      router.refresh();
      return;
    }
    const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    setMessage(errors[data?.error ?? ""] ?? "No se pudo guardar la decisión.");
  }

  const approve = () =>
    send({
      decision: "approve",
      value: row.kind === "ACTION" ? { title, ownerName: owner || null, dueDate: due || null } : { text },
    });

  return (
    <li className="review-item">
      <strong>{kindLabel[row.kind]}</strong>
      {row.kind === "ACTION" ? (
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
        </div>
      ) : (
        <p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        </p>
      )}
      {rejecting ? (
        <div className="field">
          <label>
            Motivo <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button type="button" disabled={busy || reason.trim() === ""} onClick={() => send({ decision: "reject", reason })}>
            Confirmar rechazo
          </button>
          <button type="button" disabled={busy} onClick={() => setRejecting(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <p>
          <button type="button" disabled={busy} onClick={approve}>
            Aprobar
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => setRejecting(true)}>
            Rechazar
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </li>
  );
}

export function ReviewList({ rows }: { rows: ReviewRow[] }) {
  return (
    <ul className="review-list">
      {rows.map((row) => (
        <Item key={row.id} row={row} />
      ))}
    </ul>
  );
}
