"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Option = { id: string; name: string };
type Values = {
  status: string;
  due: string;
  meeting: string;
  owner: string;
  closed: string;
  type: string;
  urgent: string;
  appeared: string;
};

const keyOf = (v: Values) =>
  JSON.stringify([
    v.status,
    v.due,
    v.meeting,
    v.owner.trim(),
    v.closed,
    v.type,
    v.urgent,
    v.appeared,
  ]);

// Filtros que se aplican al cambiar, sin recargar la página: se actualiza la dirección
// y el servidor solo vuelve a dibujar la lista. Lo anterior sigue visible, atenuado, mientras llega.
export function FiltersForm({
  statuses,
  meetings,
  types,
  initial,
  children,
}: {
  statuses: Option[];
  meetings: Option[];
  types: Option[];
  initial: Values;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si la dirección cambia por fuera (por ejemplo, un enlace a /acciones), los campos la siguen.
  // Lo que la propia pantalla acaba de pedir no cuenta como cambio externo, para no pisar lo que se escribe.
  const initialKey = keyOf(initial);
  const [seenKey, setSeenKey] = useState(initialKey);
  const [pushedKey, setPushedKey] = useState(initialKey);
  if (initialKey !== seenKey) {
    setSeenKey(initialKey);
    if (initialKey !== pushedKey) {
      setValues(initial);
      setPushedKey(initialKey);
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function apply(next: Values) {
    setPushedKey(keyOf(next));
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next))
      if (value.trim()) params.set(key, value.trim());
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  }

  function change(key: keyof Values, value: string, delay = 0) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (delay > 0) timer.current = setTimeout(() => apply(next), delay);
    else apply(next);
  }

  const filtered = Object.values(values).some((value) => value.trim() !== "");

  return (
    <>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          apply(values);
        }}
      >
        <label>
          Estado
          <select
            value={values.status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">Todos</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compromiso
          <select
            value={values.due}
            onChange={(e) => change("due", e.target.value)}
          >
            <option value="">Cualquiera</option>
            <option value="overdue">Vencidas</option>
            <option value="week">Próximos 7 días</option>
            <option value="none">Sin fecha</option>
          </select>
        </label>
        <label>
          Reunión
          <select
            value={values.meeting}
            onChange={(e) => change("meeting", e.target.value)}
          >
            <option value="">Todas</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Responsable{" "}
          <input
            value={values.owner}
            onChange={(e) => change("owner", e.target.value, 400)}
          />
        </label>
        <label>
          Tipo
          <select
            value={values.type}
            onChange={(e) => change("type", e.target.value)}
          >
            <option value="">Todos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={values.urgent === "1"}
            onChange={(e) => change("urgent", e.target.checked ? "1" : "")}
          />{" "}
          Solo urgentes
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={values.appeared === "1"}
            onChange={(e) => change("appeared", e.target.checked ? "1" : "")}
          />{" "}
          Solo lo que ya toca
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={values.closed === "1"}
            onChange={(e) => change("closed", e.target.checked ? "1" : "")}
          />{" "}
          Ver cerradas
        </label>
        {filtered && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              const empty = {
                status: "",
                due: "",
                meeting: "",
                owner: "",
                closed: "",
                type: "",
                urgent: "",
                appeared: "",
              };
              setValues(empty);
              apply(empty);
            }}
          >
            Quitar filtros
          </button>
        )}
        <span role="status" className="filters-status">
          {pending ? "Actualizando…" : ""}
        </span>
      </form>
      <div aria-busy={pending} className={pending ? "is-pending" : undefined}>
        {children}
      </div>
    </>
  );
}
