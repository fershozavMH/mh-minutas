import { z } from "zod";

// Fecha AAAA-MM-DD que existe de verdad (un 31 de febrero se desbordaría a marzo).
export function isRealDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    value >= "2000-01-01" &&
    value <= "2100-12-31"
  );
}

export const textValueSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

// Una acción oficial siempre lleva fecha de compromiso; el responsable es opcional.
export const actionValueSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  ownerName: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((value) => (value ? value : null)),
  // Persona del registro; si viene, su nombre manda sobre ownerName.
  ownerId: z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  dueDate: z.string().refine(isRealDay, { message: "fecha_obligatoria" }),
});

export type ActionValue = z.infer<typeof actionValueSchema>;

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    value: z.record(z.string(), z.unknown()).optional(),
    // Si la acción se parece a otra existente: crear nueva igualmente o sumarla como avance de esa.
    resolution: z
      .discriminatedUnion("mode", [
        z.object({ mode: z.literal("new") }),
        z.object({ mode: z.literal("append"), actionId: z.string().min(1) }),
      ])
      .optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    reason: z.string().trim().min(1).max(500),
  }),
]);

export type Decision = z.infer<typeof decisionSchema>;
