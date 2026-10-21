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
    // Nota del estado; si viene vacía se interpreta como «sin nota».
    statusNote: z.string().trim().max(500).optional(),
    typeId: z.string().min(1).nullable().optional(),
    priority: z.enum(["NORMAL", "URGENT"]).optional(),
    repeat: z.enum(["NONE", "WEEKLY", "MONTHLY"]).optional(),
    needsScheduling: z.boolean().optional(),
    // Fecha en que debe aparecer en la vista principal (no puede ser vacía).
    actionDate: z.string().refine(isRealDay, { message: "fecha_invalida" }).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "sin_cambios",
  });

export type UpdateActionInput = z.infer<typeof updateActionSchema>;

export const retireActionSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

// Reemplazar crea una acción nueva; lleva los mismos requisitos que una aprobada.
export const replaceActionSchema = actionValueSchema;

// Avance con fecha sobre una acción.
export const followUpSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  noteDate: z.string().refine(isRealDay, { message: "fecha_invalida" }).optional(),
});
