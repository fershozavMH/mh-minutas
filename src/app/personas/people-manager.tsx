"use client";

import { useState } from "react";
import { useBusy } from "../use-busy";

type Row = { id: string; name: string; email: string; active: boolean };

const errors: Record<string, string> = {
  correo_repetido: "Ya hay una persona con ese correo.",
  datos_invalidos: "Revisa el nombre y el correo.",
  sin_cambios: "No hay nada que cambiar.",
  sin_permiso: "Tu perfil no puede cambiar el registro.",
  no_existe: "Esa persona ya no está disponible.",
  sin_sesion: "Tu sesión terminó; vuelve a entrar.",
};

async function call(url: string, method: string, body: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return null;
  const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
  return errors[data?.error ?? ""] ?? "No se pudo guardar.";
}

function PersonRow({ row, canManage }: { row: Row; canManage: boolean }) {
  const [name, setName] = useState(row.name);
  const [email, setEmail] = useState(row.email);
  const [message, setMessage] = useState("");
  const { busy, setBusy, refresh } = useBusy();

  async function save(changes: unknown) {
    setBusy(true);
    setMessage("");
    const problem = await call(`/api/people/${row.id}`, "PATCH", changes);
    setBusy(false);
    if (problem) setMessage(problem);
    else refresh();
  }

  if (!canManage) {
    return (
      <tr>
        <td>{row.name}</td>
        <td>{row.email}</td>
        <td>{row.active ? "Activa" : "Inactiva"}</td>
        <td />
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input aria-label={`Nombre de ${row.name}`} value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input
          aria-label={`Correo de ${row.name}`}
          type="email"
          value={email}
          placeholder="Sin correo"
          onChange={(e) => setEmail(e.target.value)}
        />
      </td>
      <td>{row.active ? "Activa" : "Inactiva"}</td>
      <td>
        <button type="button" disabled={busy} aria-busy={busy} onClick={() => save({ name, email })}>
          {busy ? "Guardando…" : "Guardar"}
        </button>{" "}
        <button type="button" disabled={busy} onClick={() => save({ active: !row.active })}>
          {row.active ? "Desactivar" : "Activar"}
        </button>
        {message && <span role="status"> {message}</span>}
      </td>
    </tr>
  );
}

export function PeopleManager({ rows, canManage }: { rows: Row[]; canManage: boolean }) {
  const [message, setMessage] = useState("");
  const { busy, setBusy, refresh } = useBusy();

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    const problem = await call("/api/people", "POST", { name: form.get("name"), email: form.get("email") });
    setBusy(false);
    if (problem) {
      setMessage(problem);
      return;
    }
    formElement.reset();
    setMessage("Persona agregada.");
    refresh();
  }

  return (
    <>
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PersonRow key={row.id} row={row} canManage={canManage} />
            ))}
          </tbody>
        </table>
      )}
      {canManage && (
        <form onSubmit={add}>
          <h2>Agregar persona</h2>
          <div className="field">
            <label>
              Nombre <input name="name" required maxLength={120} />
            </label>
          </div>
          <div className="field">
            <label>
              Correo (opcional) <input name="email" type="email" />
            </label>
          </div>
          <button type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Agregando…" : "Agregar"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </>
  );
}
