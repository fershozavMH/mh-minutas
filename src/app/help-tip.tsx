"use client";

import { useEffect, useId, useRef, useState } from "react";
import { help, type HelpKey } from "@/lib/help";

type Pos = { top: number; left: number };

const WIDTH = 280;
const MARGIN = 12;

// Ayuda en una línea: un «?» que abre una nota al hacer clic o con el teclado.
// Se cierra con clic en cualquier parte, con Escape o al desplazar la pantalla.
// La nota usa posición fija para que no la recorte una tabla ni otro contenedor.
export function HelpTip({ topic, label }: { topic: HelpKey; label: string }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPos(null);
        button.current?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle(e: React.MouseEvent) {
    // Evita que el mismo clic cierre de inmediato la nota que acaba de abrir.
    e.stopPropagation();
    if (pos) {
      setPos(null);
      return;
    }
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - width - MARGIN));
    setPos({ top: r.bottom + 6, left });
  }

  return (
    <span className="help">
      <button
        ref={button}
        type="button"
        className="help-btn"
        aria-label={`Ayuda: ${label}`}
        aria-expanded={pos !== null}
        aria-describedby={pos ? id : undefined}
        onClick={toggle}
      >
        ?
      </button>
      {pos && (
        <span
          id={id}
          role="note"
          className="help-note"
          style={{ top: pos.top, left: pos.left }}
        >
          {help[topic]}
        </span>
      )}
    </span>
  );
}
