"use client";

import { useState } from "react";

type Level = { id: string; name: string; rank: number; isSensitive: boolean; active: boolean };
type Status = { id: string; name: string; position: number; isClosed: boolean; active: boolean };

async function send(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? String(response.status);
}

export function CatalogManager({ levels, statuses }: { levels: Level[]; statuses: Status[] }) {
  const [message, setMessage] = useState("");

  async function run(promise: Promise<string | null>) {
    const error = await promise;
    if (error) setMessage(`No se pudo: ${error}`);
    else window.location.reload();
  }

  function addLevel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      send("/api/admin/levels", "POST", {
        name: form.get("name"),
        rank: Number(form.get("rank")),
        isSensitive: form.get("isSensitive") === "on",
      }),
    );
  }

  function addStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      send("/api/admin/statuses", "POST", {
        name: form.get("name"),
        position: Number(form.get("position")),
        isClosed: form.get("isClosed") === "on",
      }),
    );
  }

  return (
    <>
      {message && <p role="alert">{message}</p>}

      <h2>Niveles de visibilidad</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Rango</th>
            <th scope="col">Nombre</th>
            <th scope="col">Sensible</th>
            <th scope="col">Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l.id}>
              <td>{l.rank}</td>
              <td>{l.name}</td>
              <td>{l.isSensitive ? "Sí" : "No"}</td>
              <td>{l.active ? "Activo" : "Desactivado"}</td>
              <td>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void run(send("/api/admin/levels", "PATCH", { id: l.id, active: !l.active }))}
                >
                  {l.active ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={addLevel}>
        <div className="field">
          <label>
            Nombre <input name="name" required maxLength={60} />
          </label>
        </div>
        <div className="field">
          <label>
            Rango (mayor = más restringido) <input name="rank" type="number" min={1} required />
          </label>
        </div>
        <div className="field">
          <label>
            <input name="isSensitive" type="checkbox" /> Sensible (nunca llega a la IA)
          </label>
        </div>
        <button type="submit">Agregar nivel</button>
      </form>

      <h2>Estados de acción</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Orden</th>
            <th scope="col">Nombre</th>
            <th scope="col">Cierra la acción</th>
            <th scope="col">Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <tr key={s.id}>
              <td>{s.position}</td>
              <td>{s.name}</td>
              <td>{s.isClosed ? "Sí" : "No"}</td>
              <td>{s.active ? "Activo" : "Desactivado"}</td>
              <td>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void run(send("/api/admin/statuses", "PATCH", { id: s.id, active: !s.active }))}
                >
                  {s.active ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={addStatus}>
        <div className="field">
          <label>
            Nombre <input name="name" required maxLength={60} />
          </label>
        </div>
        <div className="field">
          <label>
            Orden (el primero activo es el inicial) <input name="position" type="number" min={1} required />
          </label>
        </div>
        <div className="field">
          <label>
            <input name="isClosed" type="checkbox" /> Cierra la acción
          </label>
        </div>
        <button type="submit">Agregar estado</button>
      </form>
    </>
  );
}
