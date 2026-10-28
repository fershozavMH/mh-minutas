// Temas que la dirección marcó como sensibles (lista parcial; sin confirmar la lista completa).
// Confirmado el 28 oct 2026: las reglas de comisiones y las negociaciones con proveedores se tratan como privadas.
// Sirve para avisar antes de enviar un texto a la IA cuando la reunión no es de nivel sensible.
// Es solo una alerta: una persona decide. Si la lista cambia, se edita aquí.
// Contrataciones y Créditos se acotan a personal para no avisar por contratar un proveedor o un crédito de un cliente.

type Topic = { name: string; pattern: RegExp };

const staff = "(personal|colaborador\\w*|empleado\\w*|trabajador\\w*|gente|equipo)";

const topics: Topic[] = [
  {
    name: "Contrataciones",
    pattern: new RegExp(
      `\\b(vacantes?|candidat[oa]s?|reclutamiento|contratacion(es)? de ${staff}|contratar (a )?(un|una|nuevo|nueva|mas|otro|otra)? ?(persona|analista|desarrollador\\w*|vendedor\\w*|asistente|${staff}))\\b`,
    ),
  },
  {
    name: "Bajas de colaboradores",
    pattern: /\b(bajas? de (personal|colaborador\w*|empleado\w*|trabajador\w*)|despid\w+|renuncia\w*|finiquito\w*)\b/,
  },
  {
    name: "Créditos",
    pattern: new RegExp(`\\b(credito\\w* (a|al|para|de) (los |las )?${staff}|prestamos? (a|al|para) (los |las )?${staff})\\b`),
  },
  { name: "Sueldos", pattern: /\b(sueldo\w*|salario\w*|nomina\w*)\b/ },
  { name: "Bonos y comisiones", pattern: /\b(bonos?|bonificacion\w*|comision(es)?)\b/ },
  {
    name: "Negociaciones con proveedores",
    pattern:
      /\b(negociacion(es)?|negociar|precios?|margen(es)?|descuentos?|condiciones de pago|condiciones comerciales) (con|de|a|al|del) (los |el |un |nuestros? )?proveedor\w*|\bproveedor\w* (precios?|margen(es)?|descuentos?|negociacion(es)?|condiciones)\b/,
  },
  { name: "Conflictos internos", pattern: /\bconflicto\w*/ },
];

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Nombres de los temas sensibles que parece tocar el texto (vacío si ninguno).
export function detectSensitiveTopics(text: string): string[] {
  const plain = normalize(text);
  return topics.filter((topic) => topic.pattern.test(plain)).map((topic) => topic.name);
}
