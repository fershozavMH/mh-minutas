export type Theme = "light" | "dark";

export const themeStorageKey = "mh-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function toggleTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

// Se ejecuta antes de pintar la página, para que no parpadee: usa la elección guardada
// y, si no hay, la del sistema.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;
