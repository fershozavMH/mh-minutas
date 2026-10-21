import { z } from "zod";

// La fecha llega como AAAA-MM-DD y se guarda a mediodía UTC para que ningún huso horario cambie el día.
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_invalida")
  // Un 31 de febrero se desbordaría a marzo: se exige que la fecha vuelva igual.
  .refine(
    (value) => {
      const date = new Date(`${value}T12:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    },
    { message: "fecha_invalida" },
  )
  .refine((value) => value >= "2000-01-01" && value <= "2100-12-31", { message: "fecha_invalida" })
  .transform((value) => new Date(`${value}T12:00:00.000Z`));

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  heldAt: day,
  levelId: z.string().min(1),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingDateSchema = z.object({ heldAt: day });

// Cambios a una reunión: su fecha, o subirle el nivel (bajarlo no se permite desde aquí).
export const updateMeetingSchema = z
  .object({ heldAt: day.optional(), levelId: z.string().min(1).optional() })
  .refine((value) => value.heldAt !== undefined || value.levelId !== undefined, { message: "sin_cambios" });
