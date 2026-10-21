"use client";

import { useState } from "react";

export type PersonOption = { id: string; name: string };
export type OwnerValue = { ownerId: string; ownerName: string };

const OTHER = "__other";

// Elige al responsable del registro de personas, o escribe un nombre si todavía no está registrado.
export function PersonPicker({
  people,
  value,
  onChange,
}: {
  people: PersonOption[];
  value: OwnerValue;
  onChange: (value: OwnerValue) => void;
}) {
  const [other, setOther] = useState(!value.ownerId && value.ownerName !== "");
  const selected = other ? OTHER : value.ownerId;

  return (
    <>
      <select
        aria-label="Responsable"
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          if (next === OTHER) {
            setOther(true);
            onChange({ ownerId: "", ownerName: value.ownerName });
          } else {
            setOther(false);
            onChange({ ownerId: next, ownerName: "" });
          }
        }}
      >
        <option value="">Sin responsable</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value={OTHER}>Otro (escribir nombre)</option>
      </select>
      {other && (
        <input
          aria-label="Nombre del responsable"
          value={value.ownerName}
          placeholder="Nombre"
          onChange={(event) => onChange({ ownerId: "", ownerName: event.target.value })}
        />
      )}
    </>
  );
}
