// Textos de ayuda en un solo lugar, para mantenerlos al día sin buscar por las pantallas.
export const help = {
  profile:
    "Asistente: carga transcripts, revisa y aprueba. Directivo: solo lee el avance de lo que capturan sus asistentes. Administración: da de alta usuarios y niveles y ve la auditoría, pero no el contenido de las reuniones.",
  maxLevel:
    "Lo más delicado que esta persona puede ver: solo recibe reuniones y acciones de ese nivel o de uno menor. Si dudas, elige el más bajo; se puede subir después.",
  boss: "El directivo al que apoya la asistente. Verá lo que ella capture, hasta su propio nivel máximo.",
  levels:
    "Un nivel marca qué tan delicada es la información. Cada reunión y cada acción lleva uno, y cada persona tiene un nivel máximo. Los niveles son una lista que se puede editar.",
  meetingLevel:
    "Qué tan delicada es la reunión. Elige el nivel más bajo que le corresponda; solo ves los niveles hasta tu máximo. Quienes tengan un nivel máximo menor no la verán.",
  sensitive: "Una reunión de nivel sensible nunca se envía a la IA y su ficha se captura a mano.",
} as const;

export type HelpKey = keyof typeof help;

export const glossary = [
  {
    term: "Perfiles",
    text: "Hay tres: asistente (carga, revisa y aprueba), directivo (lee el avance de lo que capturan sus asistentes) y Administración (usuarios, niveles y auditoría, sin ver el contenido de las reuniones).",
  },
  { term: "Niveles", text: help.levels },
  { term: "Nivel sensible", text: help.sensitive },
  {
    term: "Propuesta de la IA",
    text: "La IA solo propone. Cada propuesta queda pendiente hasta que una persona la revisa, la edita si hace falta y la aprueba; nada es oficial antes de eso.",
  },
  {
    term: "Acción oficial",
    text: "Una acción aprobada, con responsable y fecha. Nunca se borra: se retira o se reemplaza, y su historial guarda quién cambió qué y cuándo.",
  },
] as const;
