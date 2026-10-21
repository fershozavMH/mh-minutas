import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

// El correo es opcional: sin él la persona puede ser responsable, pero no recibe recordatorios.
export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .union([email, z.literal("").transform(() => null), z.null()])
    .optional()
    .transform((value) => value ?? null),
});

export const updatePersonSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.union([email, z.literal("").transform(() => null), z.null()]).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), { message: "sin_cambios" });

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
