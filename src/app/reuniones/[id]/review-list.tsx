"use client";

import { useState } from "react";
import { PersonPicker, type PersonOption } from "../../person-picker";
import { useBusy } from "../../use-busy";

export type ReviewRow = {
  id: string;
  kind: "SUMMARY" | "DECISION" | "RISK" | "NEXT_STEP" | "ACTION";
  text: string;
  title: string;
  ownerName: string;
  ownerId: string;
  dueDate: string;
};

const kindLabel: Record<ReviewRow["kind"], string> = {
  SUMMARY: "Resumen",
  DECISION: "Decisión",
  RISK: "Riesgo",
  NEXT_STEP: "Siguiente paso",
  ACTION: "Acción",
};

const errors: Record<string, string> = {
  fecha_obligatoria: "falta la fecha de compromiso",
  valor_invalido: "el texto no puede quedar vacío",
  ya_decidido: "ya fue decidida",
  no_existe: "ya no está disponible",
  sin_permiso: "tu perfil no puede decidir",
  sin_estado: "no hay estados de acción activos",
  persona_invalida: "esa persona ya no está disponible",
  datos_invalidos: "datos inválidos",
  sin_sesion: "tu sesión terminó",
};

type Similar = {
  id: string;
  title: string;
  statusName: string;
  isClosed: boolean;
};

// Si la acción parece repetida, el servidor responde con las parecidas y la propuesta sigue pendiente.
let lastSimilar: Similar[] | null = null;

async function decide(row: ReviewRow, body: unknown): Promise<string | null> {
  lastSimilar = null;
  const response = await fetch(`/api/review/${row.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return null;
  const data = (await response?.json().catch(() => ({}))) as { error?: string; similar?: Similar[] } | undefined;
  if (data?.error === "posible_duplicado" && data.similar) {
    lastSimilar = data.similar;
    return "parece repetir una acción existente (revísala abajo)";
  }
  return errors[data?.error ?? ""] ?? "no se pudo guardar";
}

const label = (row: ReviewRow) => (row.kind === "ACTION" ? row.title : row.text);

export function ReviewList({ rows, people }: { rows: ReviewRow[]; people: PersonOption[] }) {
  const [values, setValues] = useState<Record<string, ReviewRow>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, setBusy, refresh } = useBusy();
  const [message, setMessage] = useState("");
  const [similarBy, setSimilarBy] = useState<Record<string, Similar[]>>({});

  const current = (row: ReviewRow) => values[row.id] ?? row;
  const ownerLabel = (row: ReviewRow) =>
    people.find((p) => p.id === row.ownerId)?.name || row.ownerName || "Sin responsable";
  const patch = (row: ReviewRow, changes: Partial<ReviewRow>) =>
    setValues((all) => ({ ...all, [row.id]: { ...current(row), ...changes } }));
  // Una acción sin fecha no se puede aprobar: la casilla queda bloqueada hasta que la tenga.
  const blocked = (row: ReviewRow) => current(row).kind === "ACTION" && current(row).dueDate === "";
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  // Fecha común para las acciones que aún no tienen una; nunca cambia una fecha ya puesta.
  const [bulkDate, setBulkDate] = useState("");
  const undated = rows.filter((row) => row.kind === "ACTION" && current(row).dueDate === "");
  const applyBulkDate = () => {
    if (!bulkDate) return;
    setValues((all) => {
      const next = { ...all };
      for (const row of undated) next[row.id] = { ...(all[row.id] ?? row), dueDate: bulkDate };
      return next;
    });
    setMessage(
      `Fecha puesta a ${undated.length} ${undated.length === 1 ? "acción" : "acciones"}. Puedes cambiar cada una antes de aprobar.`,
    );
  };

  const selectable = rows.filter((row) => !blocked(row));
  const chosen = rows.filter((row) => selected.has(row.id) && !blocked(row));
  const allChosen = selectable.length > 0 && selectable.every((row) => selected.has(row.id));

  async function run(task: (row: ReviewRow) => Promise<string | null>, verb: string) {
    setBusy(true);
    setMessage("");
    const failed: string[] = [];
    let done = 0;
    // Una por una: la regla de cada propuesta se valida en el servidor, y si una falla las demás siguen.
    for (const row of chosen) {
      const problem = await task(current(row));
      if (lastSimilar) {
        const found = lastSimilar;
        setSimilarBy((all) => ({ ...all, [row.id]: found }));
      }
      if (problem) failed.push(`«${label(current(row)).slice(0, 50)}»: ${problem}`);
      else done += 1;
    }
    setBusy(false);
    setSelected(new Set());
    setRejecting(false);
    setReason("");
    setMessage(`${done} ${verb}${failed.length ? `. No se pudo en ${failed.length}: ${failed.join("; ")}` : "."}`);
    refresh();
  }

  const approvalBody = (row: ReviewRow, resolution?: unknown) => ({
    decision: "approve",
    value:
      row.kind === "ACTION"
        ? {
            title: row.title,
            ownerName: row.ownerId ? null : row.ownerName || null,
            ownerId: row.ownerId || null,
            dueDate: row.dueDate,
          }
        : { text: row.text },
    ...(resolution ? { resolution } : {}),
  });

  const approveSelected = () => run((row) => decide(row, approvalBody(row)), "aprobadas");

  // Decisión sobre una acción que parece repetida: sumarla como avance o crearla igualmente.
  async function resolveDuplicate(row: ReviewRow, resolution: { mode: "new" } | { mode: "append"; actionId: string }) {
    setBusy(true);
    setMessage("");
    const problem = await decide(current(row), approvalBody(current(row), resolution));
    setBusy(false);
    setMessage(
      problem
        ? `No se pudo: ${problem}`
        : resolution.mode === "append"
          ? "Sumada como avance de la acción existente."
          : "Acción creada.",
    );
    refresh();
  }

  const rejectSelected = () => run((row) => decide(row, { decision: "reject", reason }), "rechazadas");

  return (
    <div>
      {undated.length > 0 && (
        <p className="hint">
          <label>
            {undated.length === 1
              ? "1 acción no tiene fecha de compromiso."
              : `${undated.length} acciones no tienen fecha de compromiso.`}{" "}
            Fecha para {undated.length === 1 ? "esa" : "todas"}:{" "}
            <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
          </label>{" "}
          <button type="button" disabled={busy || bulkDate === ""} onClick={applyBulkDate}>
            Aplicar
          </button>
        </p>
      )}
      <p>
        <label>
          <input
            type="checkbox"
            checked={allChosen}
            disabled={busy || selectable.length === 0}
            onChange={() => setSelected(allChosen ? new Set() : new Set(selectable.map((row) => row.id)))}
          />{" "}
          Seleccionar todo
        </label>
      </p>
      <ul className="review-list">
        {rows.map((row) => {
          const value = current(row);
          const isBlocked = blocked(row);
          const isEditing = editing.has(row.id);
          return (
            <li key={row.id} className="review-item">
              <label className="review-check">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar: ${label(value)}`}
                  checked={selected.has(row.id) && !isBlocked}
                  disabled={busy || isBlocked}
                  onChange={() => setSelected((set) => toggle(set, row.id))}
                />
              </label>
              <div className="review-body">
                <strong>{kindLabel[row.kind]}</strong>
                {isEditing ? (
                  row.kind === "ACTION" ? (
                    <>
                      <div className="field">
                        <label>
                          Acción <input value={value.title} onChange={(e) => patch(row, { title: e.target.value })} />
                        </label>
                      </div>
                      <div className="field">
                        <label>
                          Responsable{" "}
                          <PersonPicker
                            people={people}
                            value={{
                              ownerId: value.ownerId,
                              ownerName: value.ownerName,
                            }}
                            onChange={(owner) => patch(row, owner)}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <p>
                      <textarea
                        aria-label="Texto de la propuesta"
                        value={value.text}
                        rows={3}
                        onChange={(e) => patch(row, { text: e.target.value })}
                      />
                    </p>
                  )
                ) : (
                  <p className="review-text">
                    {row.kind === "ACTION" ? `${value.title} · ${ownerLabel(value)}` : value.text}
                  </p>
                )}
                {row.kind === "ACTION" && (
                  <div className="field">
                    <label>
                      Fecha de compromiso{" "}
                      <input
                        type="date"
                        value={value.dueDate}
                        onChange={(e) => patch(row, { dueDate: e.target.value })}
                      />
                    </label>
                    {isBlocked && <span className="hint-inline">Falta la fecha</span>}
                  </div>
                )}
                {similarBy[row.id] && (
                  <div className="duplicate-box" role="alert">
                    <p>
                      Parece repetir una acción que ya existe. Las cerradas se quedan cerradas: la mención se suma como
                      avance.
                    </p>
                    <ul>
                      {similarBy[row.id].map((s) => (
                        <li key={s.id}>
                          «{s.title}» ({s.statusName})
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              resolveDuplicate(row, {
                                mode: "append",
                                actionId: s.id,
                              })
                            }
                          >
                            Sumar como avance de esta
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" disabled={busy} onClick={() => resolveDuplicate(row, { mode: "new" })}>
                      Es distinta: crear acción nueva
                    </button>
                  </div>
                )}
                <button type="button" className="link-button" onClick={() => setEditing((set) => toggle(set, row.id))}>
                  {isEditing ? "Listo" : "Editar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {message && <p role="status">{message}</p>}
      {chosen.length > 0 && (
        <div className="review-bar">
          {rejecting ? (
            <>
              <label>
                Motivo (para las {chosen.length}) <input value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <button type="button" disabled={busy || reason.trim() === ""} aria-busy={busy} onClick={rejectSelected}>
                Confirmar rechazo
              </button>
              <button type="button" disabled={busy} onClick={() => setRejecting(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} aria-busy={busy} onClick={approveSelected}>
                Aprobar seleccionadas ({chosen.length})
              </button>
              <button type="button" disabled={busy} onClick={() => setRejecting(true)}>
                Rechazar seleccionadas…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
