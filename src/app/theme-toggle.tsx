"use client";

import { useState } from "react";
import { isTheme, themeStorageKey, toggleTheme, type Theme } from "@/lib/theme";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  function change() {
    const next = toggleTheme(theme);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // Sin almacenamiento, el cambio vale solo para esta visita.
    }
    setTheme(next);
  }

  return (
    <button type="button" className="ghost" onClick={change} aria-label="Cambiar entre modo claro y oscuro">
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
