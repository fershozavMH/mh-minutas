"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HelpTip } from "../../help-tip";

const errors: Record<string, string> = {
  duplicado: "Ese mismo texto ya está cargado en esta reunión.",
  texto_vacio: "El texto está vacío.",
  datos_invalidos: "El texto es demasiado grande o le falta el origen.",
  no_existe: "Esa reunión ya no está disponible.",
  sin_permiso: "Tu perfil no puede cargar transcripts.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

export function SourceForm({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [origin, setOrigin] = useState("Texto pegado");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
      router.refresh();
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
      <button type="submit" disabled={busy || text.trim() === ""} aria-busy={busy}>
        Guardar transcript
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
