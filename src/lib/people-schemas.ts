import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

// Otros nombres de la persona. Se limpian, se quitan repetidos y no pueden ser más de 10.
const aliases = z
  .array(z.string().trim().min(1).max(80))
  .max(10)
  .transform((list) => {
    const seen = new Set<string>();
    return list.filter((alias) => {
      const key = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

// El correo es opcional: sin él la persona puede ser responsable, pero no recibe recordatorios.
export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .union([email, z.literal("").transform(() => null), z.null()])
    .optional()
    .transform((value) => value ?? null),
  aliases: aliases.optional().transform((value) => value ?? []),
});

export const updatePersonSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.union([email, z.literal("").transform(() => null), z.null()]).optional(),
    aliases: aliases.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), { message: "sin_cambios" });

export type CreatePersonInput = Omit<z.infer<typeof createPersonSchema>, "aliases"> & { aliases?: string[] };
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
