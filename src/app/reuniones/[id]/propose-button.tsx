"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  ya_propuesto: "Este transcript ya tiene propuesta.",
  limite_diario: "Llegaste al límite diario de propuestas de la IA. Intenta mañana o pide a Fernando que lo suba.",
  nivel_sensible: "Una reunión sensible no se envía a la IA.",
  ia_no_configurada: "La IA aún no está configurada en este entorno.",
  ia_fallo: "La IA no pudo responder. Intenta de nuevo en un momento.",
  no_existe: "Ese transcript ya no está disponible.",
  sin_permiso: "Tu perfil no puede pedir propuestas.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

export function ProposeButton({ meetingId, sourceId }: { meetingId: string; sourceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function ask() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/meetings/${meetingId}/sources/${sourceId}/propose`, { method: "POST" }).catch(
      () => null,
    );
    setBusy(false);
    if (response?.ok) {
      router.refresh();
      return;
    }
    const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    setMessage(errors[data?.error ?? ""] ?? "No se pudo pedir la propuesta.");
  }

  return (
    <>
      <button type="button" onClick={ask} disabled={busy} aria-busy={busy}>
        {busy ? "Pidiendo propuesta…" : "Pedir propuesta a la IA"}
      </button>
      {busy && <span role="status"> La IA puede tardar hasta un minuto; no cierres esta página.</span>}
      {message && <span role="status"> {message}</span>}
    </>
  );
}
