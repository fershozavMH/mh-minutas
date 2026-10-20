"use client";

import { useSyncExternalStore } from "react";
import { isTheme, themeStorageKey, toggleTheme, type Theme } from "@/lib/theme";

// El tema vive en el atributo data-theme de <html>, que fija un guion antes de pintar.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "light";
}

export function ThemeToggle() {
  // En el servidor siempre es "light"; React lo corrige al hidratar sin desajuste.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  function change() {
    const next = toggleTheme(theme);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // Sin almacenamiento, el cambio vale solo para esta visita.
    }
  }

  return (
    <button
      type="button"
      className="ghost"
      onClick={change}
      aria-label="Cambiar entre modo claro y oscuro"
      suppressHydrationWarning
    >
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
