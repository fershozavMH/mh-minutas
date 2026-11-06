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

// Esquema que se le entrega al modelo como formato de salida. Va sin límites de largo ni de formato
// (la salida estructurada no los admite); esos límites se exigen aquí al validar la respuesta.
const looseSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()),
  risks: z.array(z.string()),
  nextSteps: z.array(z.string()),
  actions: z.array(
    z.object({
      title: z.string(),
      ownerName: z.string().nullable(),
      dueDate: z.string().nullable(),
    }),
  ),
});

export const proposalJsonSchema = z.toJSONSchema(looseSchema, { target: "draft-7" }) as Record<string, unknown>;
