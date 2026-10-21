import { z } from "zod";
import { actionValueSchema, isRealDay } from "./review-schemas";

// Cambios a una acción oficial. La fecha de compromiso nunca puede quedar vacía.
export const updateActionSchema = z
  .object({
    title: z.string().trim().min(1).max(1000).optional(),
    ownerName: z
      .string()
      .trim()
      .max(120)
      .nullish()
      .transform((value) => (value ? value : null))
      .optional(),
    ownerId: z.string().min(1).nullable().optional(),
    dueDate: z.string().refine(isRealDay, { message: "fecha_obligatoria" }).optional(),
    statusId: z.string().min(1).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), { message: "sin_cambios" });

export type UpdateActionInput = z.infer<typeof updateActionSchema>;

export const retireActionSchema = z.object({ reason: z.string().trim().min(1).max(500) });

// Reemplazar crea una acción nueva; lleva los mismos requisitos que una aprobada.
export const replaceActionSchema = actionValueSchema;
