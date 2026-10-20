import { z } from "zod";

const text = z.string().trim().min(1).max(1000);

// Lo que la IA puede proponer. Todo es una propuesta: nada es oficial hasta que una persona lo apruebe.
export const proposalSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  decisions: z.array(text).max(30),
  risks: z.array(text).max(30),
  nextSteps: z.array(text).max(30),
  actions: z
    .array(
      z.object({
        title: text,
        // Solo si la reunión lo dice; la IA no inventa responsables ni fechas.
        ownerName: z.string().trim().min(1).max(120).nullable(),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      }),
    )
    .max(50),
});

export type Proposal = z.infer<typeof proposalSchema>;

// Esquema que se le entrega al modelo como herramienta de salida obligatoria.
export const proposalJsonSchema = z.toJSONSchema(proposalSchema, { target: "draft-7" });
