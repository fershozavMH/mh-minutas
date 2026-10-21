"use client";

import { useState } from "react";
import type { QuickStatus } from "@/lib/quick-status";
import { useBusy } from "../use-busy";

const labels = {
  pending: "Pendiente",
  done: "Completado",
  cancelled: "Cancelado",
} as const;
const symbols = { pending: "○", done: "✓", cancelled: "✕" } as const;

const errors: Record<string, string> = {
  retirada: "Esa acción ya está retirada.",
  sin_permiso: "Tu perfil no puede cambiar el estado.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

// Estado de una acción con botones para cambiarlo de un clic. El cambio se ve al instante
// y, si el servidor lo rechaza, vuelve a como estaba.
export function QuickStatusCell({
  actionId,
  current,
  options,
}: {
  actionId: string;
  current: { id: string; name: string };
  options: QuickStatus[];
}) {
  const [status, setStatus] = useState(current);
  const [message, setMessage] = useState("");
  const { busy, setBusy, refresh } = useBusy();

  // Si la lista se actualiza desde el servidor, manda lo que llegó.
  if (!busy && status.id !== current.id && message === "") setStatus(current);

  async function change(option: QuickStatus) {
    const previous = status;
    setStatus({ id: option.id, name: option.name });
    setMessage("");
    setBusy(true);
    const response = await fetch(`/api/actions/${actionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: option.id }),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      refresh();
      return;
    }
    setStatus(previous);
    const data = (await response?.json().catch(() => ({}))) as
      { error?: string } | undefined;
    setMessage(errors[data?.error ?? ""] ?? "No se pudo cambiar el estado.");
  }

  return (
    <div className="quick-status" aria-busy={busy}>
      <span className="quick-status-current">{status.name}</span>
      <span className="quick-status-buttons">
        {options
          .filter((option) => option.id !== status.id)
          .map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              title={`Marcar como ${option.name}`}
              aria-label={`Marcar como ${labels[option.kind].toLowerCase()}`}
              onClick={() => change(option)}
            >
              {symbols[option.kind]} {labels[option.kind]}
            </button>
          ))}
      </span>
      {message && <span role="status"> {message}</span>}
    </div>
  );
}
