"use client";

import { useState } from "react";
import { HelpTip } from "../help-tip";

type Option = { id: string; name: string };

export function UserForm({ levels, directors }: { levels: Option[]; directors: Option[] }) {
  const [profile, setProfile] = useState("ASSISTANT");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bossId = String(form.get("bossId") ?? "");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        profile,
        maxLevelId: form.get("maxLevelId"),
        bossId: profile === "ASSISTANT" && bossId ? bossId : null,
      }),
    });
    if (response.ok) {
      setMessage("Usuario dado de alta.");
      window.location.reload();
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(`No se pudo: ${data.error ?? response.status}`);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Dar de alta</h2>
      <div className="field">
        <label>
          Nombre <input name="name" required />
        </label>
      </div>
      <div className="field">
        <label>
          Correo <input name="email" type="email" required />
        </label>
      </div>
      <div className="field">
        <label>
          Perfil
          <select value={profile} onChange={(event) => setProfile(event.target.value)}>
            <option value="ASSISTANT">Asistente</option>
            <option value="DIRECTOR">Directivo</option>
            <option value="ADMIN">Administración</option>
          </select>
        </label>
        <HelpTip topic="profile" label="Perfil" />
      </div>
      <div className="field">
        <label>
          Nivel máximo
          <select name="maxLevelId" required>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </label>
        <HelpTip topic="maxLevel" label="Nivel máximo" />
      </div>
      {profile === "ASSISTANT" && (
        <div className="field">
          <label>
            Directivo
            <select name="bossId" required>
              {directors.map((director) => (
                <option key={director.id} value={director.id}>
                  {director.name}
                </option>
              ))}
            </select>
          </label>
        <HelpTip topic="boss" label="Directivo" />
        </div>
      )}
      <button type="submit">Dar de alta</button>
      {message && <p>{message}</p>}
    </form>
  );
}
