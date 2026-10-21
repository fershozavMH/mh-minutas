import { z } from "zod";
import { isAllowedEmail } from "./allowed-email";

export const profiles = ["ASSISTANT", "DIRECTOR", "ADMIN"] as const;

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      .refine(isAllowedEmail, { message: "dominio_no_permitido" }),
    profile: z.enum(profiles),
    maxLevelId: z.string().min(1),
    bossId: z.string().min(1).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.profile === "ASSISTANT" && !value.bossId) {
      ctx.addIssue({ code: "custom", path: ["bossId"], message: "La asistente necesita un directivo" });
    }
    if (value.profile !== "ASSISTANT" && value.bossId) {
      ctx.addIssue({ code: "custom", path: ["bossId"], message: "Solo las asistentes tienen directivo" });
    }
  });

export const createLevelSchema = z.object({
  name: z.string().trim().min(1).max(60),
  rank: z.number().int().min(1),
  isSensitive: z.boolean().default(false),
});

export const updateLevelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(60).optional(),
    rank: z.number().int().min(1).optional(),
    isSensitive: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "No hay nada que cambiar",
  });

export const createStatusSchema = z.object({
  name: z.string().trim().min(1).max(60),
  position: z.number().int().min(1),
  isClosed: z.boolean().default(false),
  requiresNote: z.boolean().default(false),
});

export const updateStatusSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(60).optional(),
    position: z.number().int().min(1).optional(),
    isClosed: z.boolean().optional(),
    requiresNote: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "No hay nada que cambiar",
  });
