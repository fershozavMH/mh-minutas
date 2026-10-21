// Temas que la dirección marcó como sensibles (lista parcial recibida el 21 oct 2026, sin confirmar).
// Sirve para avisar antes de enviar un texto a la IA cuando la reunión no es de nivel sensible.
// Es solo una alerta: una persona decide. Si la lista cambia, se edita aquí.
// Pendiente por aclarar: «Créditos» (¿todo o solo los personales?); por ahora avisa siempre.

type Topic = { name: string; pattern: RegExp };

const topics: Topic[] = [
  { name: "Contrataciones", pattern: /\b(contratacion(es)?|contratar|vacantes?|candidat[oa]s?|reclutamiento)\b/ },
  {
    name: "Bajas de colaboradores",
    pattern: /\b(bajas? de (personal|colaborador\w*|empleado\w*|trabajador\w*)|despid\w+|renuncia\w*|finiquito\w*)\b/,
  },
  { name: "Créditos", pattern: /\bcredito\w*/ },
  { name: "Sueldos", pattern: /\b(sueldo\w*|salario\w*|nomina\w*)\b/ },
  { name: "Bonos y comisiones", pattern: /\b(bonos?|bonificacion\w*|comision(es)?)\b/ },
  { name: "Conflictos internos", pattern: /\bconflicto\w*/ },
];

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Nombres de los temas sensibles que parece tocar el texto (vacío si ninguno).
export function detectSensitiveTopics(text: string): string[] {
  const plain = normalize(text);
  return topics.filter((topic) => topic.pattern.test(plain)).map((topic) => topic.name);
}
