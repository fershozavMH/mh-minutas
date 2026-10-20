import { glossary } from "@/lib/help";

export default function HelpPage() {
  return (
    <main>
      <h1>Ayuda</h1>
      <p>Lo básico para entender el sistema. En cada pantalla, el signo «?» explica ese campo.</p>
      <dl>
        {glossary.map((entry) => (
          <div key={entry.term} className="card">
            <dt>{entry.term}</dt>
            <dd>{entry.text}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
