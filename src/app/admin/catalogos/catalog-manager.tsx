"use client";

import { useState } from "react";
import { useBusy } from "../../use-busy";

type Level = {
  id: string;
  name: string;
  rank: number;
  isSensitive: boolean;
  active: boolean;
};
type Status = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  requiresNote: boolean;
  active: boolean;
};

const errors: Record<string, string> = {
  nombre_o_rango_repetido: "Ya existe un nivel con ese nombre o ese rango.",
  nombre_repetido: "Ya existe un estado con ese nombre.",
  debe_quedar_un_estado_abierto:
    "Debe quedar al menos un estado abierto activo.",
  datos_invalidos: "Revisa el nombre y el número.",
};

async function send(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return null;
  const data = (await response?.json().catch(() => ({}))) as
    { error?: string } | undefined;
  return errors[data?.error ?? ""] ?? "No se pudo guardar.";
}

function LevelRow({
  level,
  run,
  busy,
}: {
  level: Level;
  run: (p: Promise<string | null>) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(level.name);
  const [rank, setRank] = useState(String(level.rank));
  return (
    <tr>
      <td>
        <input
          aria-label={`Rango de ${level.name}`}
          type="number"
          min={1}
          value={rank}
          onChange={(e) => setRank(e.target.value)}
        />
      </td>
      <td>
        <input
          aria-label={`Nombre de ${level.name}`}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td>{level.isSensitive ? "Sí" : "No"}</td>
      <td>{level.active ? "Activo" : "Desactivado"}</td>
      <td>
        <button
          type="button"
          disabled={
            busy || (name === level.name && rank === String(level.rank))
          }
          onClick={() =>
            run(
              send("/api/admin/levels", "PATCH", {
                id: level.id,
                name,
                rank: Number(rank),
              }),
            )
          }
        >
          Guardar
        </button>{" "}
        <button
          type="button"
          className="link-button"
          disabled={busy}
          onClick={() =>
            run(
              send("/api/admin/levels", "PATCH", {
                id: level.id,
                active: !level.active,
              }),
            )
          }
        >
          {level.active ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  );
}

function StatusRow({
  status,
  run,
  busy,
}: {
  status: Status;
  run: (p: Promise<string | null>) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(status.name);
  const [position, setPosition] = useState(String(status.position));
  const [isClosed, setIsClosed] = useState(status.isClosed);
  const [requiresNote, setRequiresNote] = useState(status.requiresNote);
  const unchanged =
    name === status.name &&
    position === String(status.position) &&
    isClosed === status.isClosed &&
    requiresNote === status.requiresNote;
  return (
    <tr>
      <td>
        <input
          aria-label={`Orden de ${status.name}`}
          type="number"
          min={1}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </td>
      <td>
        <input
          aria-label={`Nombre de ${status.name}`}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td>
        <input
          aria-label={`${status.name} cierra la acción`}
          type="checkbox"
          checked={isClosed}
          onChange={(e) => setIsClosed(e.target.checked)}
        />
      </td>
      <td>
        <input
          aria-label={`${status.name} pide una nota`}
          type="checkbox"
          checked={requiresNote}
          onChange={(e) => setRequiresNote(e.target.checked)}
        />
      </td>
      <td>{status.active ? "Activo" : "Desactivado"}</td>
      <td>
        <button
          type="button"
          disabled={busy || unchanged}
          onClick={() =>
            run(
              send("/api/admin/statuses", "PATCH", {
                id: status.id,
                name,
                position: Number(position),
                isClosed,
                requiresNote,
              }),
            )
          }
        >
          Guardar
        </button>{" "}
        <button
          type="button"
          className="link-button"
          disabled={busy}
          onClick={() =>
            run(
              send("/api/admin/statuses", "PATCH", {
                id: status.id,
                active: !status.active,
              }),
            )
          }
        >
          {status.active ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  );
}

export function CatalogManager({
  levels,
  statuses,
}: {
  levels: Level[];
  statuses: Status[];
}) {
  const [message, setMessage] = useState("");
  const { busy, setBusy, refresh } = useBusy();

  function run(promise: Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    void promise.then((error) => {
      setBusy(false);
      if (error) setMessage(error);
      else refresh();
    });
  }

  function addLevel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    run(
      send("/api/admin/levels", "POST", {
        name: form.get("name"),
        rank: Number(form.get("rank")),
        isSensitive: form.get("isSensitive") === "on",
      }).then((error) => {
        if (!error) formElement.reset();
        return error;
      }),
    );
  }

  function addStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    run(
      send("/api/admin/statuses", "POST", {
        name: form.get("name"),
        position: Number(form.get("position")),
        isClosed: form.get("isClosed") === "on",
        requiresNote: form.get("requiresNote") === "on",
      }).then((error) => {
        if (!error) formElement.reset();
        return error;
      }),
    );
  }

  return (
    <>
      {message && <p role="alert">{message}</p>}

      <h2>Niveles de visibilidad</h2>
      <p className="hint">
        Puedes renombrar un nivel o cambiar su rango. Si es sensible o no, se
        define al crearlo y no se cambia aquí.
      </p>
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
            <LevelRow
              key={`${l.id}-${l.name}-${l.rank}`}
              level={l}
              run={run}
              busy={busy}
            />
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
            Rango (mayor = más restringido){" "}
            <input name="rank" type="number" min={1} required />
          </label>
        </div>
        <div className="field">
          <label>
            <input name="isSensitive" type="checkbox" /> Sensible (nunca llega a
            la IA)
          </label>
        </div>
        <button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Guardando…" : "Agregar nivel"}
        </button>
      </form>

      <h2>Estados de acción</h2>
      <p className="hint">
        «Pide nota» obliga a escribir una nota al pasar una acción a ese estado
        (por ejemplo, qué se espera o por qué se cancela). El primer estado
        abierto es el inicial; los botones rápidos usan el primero y el último
        que cierran.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Orden</th>
            <th scope="col">Nombre</th>
            <th scope="col">Cierra</th>
            <th scope="col">Pide nota</th>
            <th scope="col">Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <StatusRow
              key={`${s.id}-${s.name}-${s.position}-${s.isClosed}-${s.requiresNote}`}
              status={s}
              run={run}
              busy={busy}
            />
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
            Orden <input name="position" type="number" min={1} required />
          </label>
        </div>
        <div className="field">
          <label>
            <input name="isClosed" type="checkbox" /> Cierra la acción
          </label>
        </div>
        <div className="field">
          <label>
            <input name="requiresNote" type="checkbox" /> Pide nota al pasar a
            este estado
          </label>
        </div>
        <button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Guardando…" : "Agregar estado"}
        </button>
      </form>
    </>
  );
}
