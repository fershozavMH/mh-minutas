"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HelpTip } from "../help-tip";

type Level = { id: string; name: string; isSensitive: boolean };

const errors: Record<string, string> = {
  datos_invalidos: "Revisa el título, la fecha y el nivel.",
  nivel_no_permitido: "Ese nivel es superior al tuyo.",
  nivel_no_valido: "Ese nivel ya no existe.",
  sin_permiso: "Tu perfil no puede crear reuniones.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

export function MeetingForm({ levels }: { levels: Level[] }) {
  const router = useRouter();
  const [levelId, setLevelId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = levels.find((level) => level.id === levelId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), heldAt: form.get("heldAt"), levelId }),
    }).catch(() => null);
    setBusy(false);

    if (response?.ok) {
      formElement.reset();
      setLevelId("");
      setMessage("Reunión creada.");
      router.refresh();
    } else {
      const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      setMessage(errors[data?.error ?? ""] ?? "No se pudo crear la reunión.");
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Nueva reunión</h2>
      <div className="field">
        <label>
          Título <input name="title" required maxLength={200} />
        </label>
      </div>
      <div className="field">
        <label>
          Fecha <input name="heldAt" type="date" required />
        </label>
      </div>
      <div className="field">
        <label>
          Nivel
          <select value={levelId} onChange={(event) => setLevelId(event.target.value)} required>
            <option value="" disabled>
              Elige un nivel
            </option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </label>
        <HelpTip topic="meetingLevel" label="Nivel de la reunión" />
      </div>
      {selected?.isSensitive && <p className="hint">Nivel sensible: esta reunión nunca se envía a la IA.</p>}
      <button type="submit" disabled={busy} aria-busy={busy}>
        Crear reunión
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
