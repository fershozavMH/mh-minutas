"use client";

import { useState } from "react";
import { useBusy } from "../../use-busy";

const errors: Record<string, string> = {
  ya_propuesto: "Este transcript ya tiene propuesta.",
  limite_diario:
    "Llegaste al límite diario de propuestas de la IA. Intenta mañana o pide a Fernando que lo suba.",
  nivel_sensible: "Una reunión sensible no se envía a la IA.",
  ia_no_configurada: "La IA aún no está configurada en este entorno.",
  ia_fallo: "La IA no pudo responder. Intenta de nuevo en un momento.",
  no_existe: "Ese transcript ya no está disponible.",
  sin_permiso: "Tu perfil no puede pedir propuestas.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
  nivel_no_permitido: "Tu nivel máximo no permite ese nivel.",
  solo_subir_nivel: "Un nivel solo se puede subir.",
};

export function ProposeButton({
  meetingId,
  sourceId,
  sensitiveLevel,
}: {
  meetingId: string;
  sourceId: string;
  // Nivel sensible al que esta persona puede pasar la reunión, si existe.
  sensitiveLevel: { id: string; name: string } | null;
}) {
  const [message, setMessage] = useState("");
  const [topics, setTopics] = useState<string[] | null>(null);
  const { busy, setBusy, refresh } = useBusy();

  async function ask(acknowledge = false) {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/meetings/${meetingId}/sources/${sourceId}/propose`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledge }),
      },
    ).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      setTopics(null);
      refresh();
      return;
    }
    const data = (await response?.json().catch(() => ({}))) as
      { error?: string; topics?: string[] } | undefined;
    if (data?.error === "posible_sensible" && data.topics) {
      setTopics(data.topics);
      return;
    }
    setMessage(errors[data?.error ?? ""] ?? "No se pudo pedir la propuesta.");
  }

  async function markSensitive() {
    if (!sensitiveLevel) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId: sensitiveLevel.id }),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      setTopics(null);
      refresh();
      return;
    }
    const data = (await response?.json().catch(() => ({}))) as
      { error?: string } | undefined;
    setMessage(errors[data?.error ?? ""] ?? "No se pudo cambiar el nivel.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ask()}
        disabled={busy || topics !== null}
        aria-busy={busy}
      >
        {busy ? "Trabajando…" : "Pedir propuesta a la IA"}
      </button>
      {busy && (
        <span role="status">
          {" "}
          La IA puede tardar hasta un minuto; no cierres esta página.
        </span>
      )}
      {topics && (
        <div className="hint" role="alert">
          <p>
            Este texto parece tratar temas sensibles ({topics.join(", ")}) y la
            reunión no está marcada como sensible. Si se envía, la IA lo leerá.
          </p>
          {sensitiveLevel && (
            <button type="button" disabled={busy} onClick={markSensitive}>
              Marcar la reunión como {sensitiveLevel.name}
            </button>
          )}{" "}
          <button type="button" disabled={busy} onClick={() => ask(true)}>
            No es sensible: enviar a la IA
          </button>{" "}
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={() => setTopics(null)}
          >
            Cancelar
          </button>
        </div>
      )}
      {message && <span role="status"> {message}</span>}
    </>
  );
}
