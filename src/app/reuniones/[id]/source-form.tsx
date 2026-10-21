"use client";

import { useMemo, useState } from "react";
import { detectMeetingDate } from "@/lib/meeting-date";
import { HelpTip } from "../../help-tip";
import { useBusy } from "../../use-busy";

const errors: Record<string, string> = {
  duplicado: "Ese mismo texto ya está cargado en esta reunión.",
  texto_vacio: "El texto está vacío.",
  datos_invalidos: "El texto es demasiado grande o le falta el origen.",
  no_existe: "Esa reunión ya no está disponible.",
  sin_permiso: "Tu perfil no puede cargar transcripts.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

const dayFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T12:00:00.000Z`));

// heldAt llega como AAAA-MM-DD, la fecha que tiene hoy la reunión.
export function SourceForm({ meetingId, heldAt }: { meetingId: string; heldAt: string }) {
  const [text, setText] = useState("");
  const [origin, setOrigin] = useState("Texto pegado");
  const [message, setMessage] = useState("");
  const { busy, setBusy, refresh } = useBusy();
  const [dismissed, setDismissed] = useState("");
  const detected = useMemo(() => detectMeetingDate(text), [text]);
  const suggestion = detected && detected !== heldAt && detected !== dismissed ? detected : null;

  async function applyDetectedDate(day: string) {
    setBusy(true);
    const response = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heldAt: day }),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      setMessage(`Fecha de la reunión cambiada al ${formatDay(day)}.`);
      refresh();
    } else {
      setMessage("No se pudo cambiar la fecha de la reunión.");
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setOrigin(`Archivo: ${file.name}`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/meetings/${meetingId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, text }),
    }).catch(() => null);
    setBusy(false);

    if (response?.ok) {
      setText("");
      setOrigin("Texto pegado");
      setMessage("Transcript guardado.");
      refresh();
    } else {
      const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      setMessage(errors[data?.error ?? ""] ?? "No se pudo guardar el transcript.");
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>
        Cargar transcript <HelpTip topic="transcript" label="Cargar transcript" />
      </h2>
      <div className="field">
        <label>
          Archivo de texto
          <input type="file" accept=".txt,.md,.vtt,.srt,text/plain" onChange={onFile} />
        </label>
      </div>
      <p>
        <label>
          O pega el texto aquí
          <br />
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOrigin("Texto pegado");
            }}
          />
        </label>
      </p>
      {suggestion && (
        <p className="hint" role="status">
          El texto dice que la reunión fue el {formatDay(suggestion)}; hoy está registrada el {formatDay(heldAt)}.{" "}
          <button type="button" disabled={busy} onClick={() => applyDetectedDate(suggestion)}>
            Usar esa fecha
          </button>{" "}
          <button type="button" className="link-button" onClick={() => setDismissed(suggestion)}>
            Dejar la actual
          </button>
        </p>
      )}
      <button type="submit" disabled={busy || text.trim() === ""} aria-busy={busy}>
        Guardar transcript
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
