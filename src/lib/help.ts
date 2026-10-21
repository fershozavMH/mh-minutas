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
  transcript:
    "Pega el texto de la transcripción o sube un archivo .txt, .md, .vtt o .srt. Se guarda solo el texto limpio, no el archivo. Si cargas el mismo texto dos veces en una reunión, se avisa y no se duplica.",
  proposal:
    "La IA lee el transcript y propone resumen, decisiones, riesgos, siguientes pasos y acciones. Todo queda pendiente: nada es oficial hasta que una persona lo revise y lo apruebe.",
  review:
    "Revisa cada propuesta: puedes corregir el texto antes de aprobar. Al aprobar una acción se crea la acción oficial, y por eso necesita fecha de compromiso; el responsable es opcional. Si rechazas, escribe el motivo. Una vez decidida, la propuesta no se cambia desde aquí.",
  actions:
    "Aquí están las acciones oficiales: las que una persona aprobó. Cada una tiene responsable, fecha de compromiso y estado. Nunca se borran: se retiran con un motivo o se reemplazan por otra.",
  history:
    "Cada cambio guarda quién lo hizo, cuándo y el valor anterior, para poder explicar por qué una fecha o un responsable cambió.",
  people:
    "Las personas que pueden ser responsables de una acción, tengan o no inicio de sesión. El correo es opcional, pero sin él la persona no recibirá recordatorios. Una persona no se borra: se desactiva y deja de aparecer al elegir responsable.",
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
