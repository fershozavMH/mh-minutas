import { help, type HelpKey } from "@/lib/help";

// Ayuda en una línea: un «?» que se abre al hacer clic o con el teclado, sin ocupar espacio.
export function HelpTip({ topic, label }: { topic: HelpKey; label: string }) {
  return (
    <details className="help">
      <summary aria-label={`Ayuda: ${label}`}>?</summary>
      <span role="note">{help[topic]}</span>
    </details>
  );
}
