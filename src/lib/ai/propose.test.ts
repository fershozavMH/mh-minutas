import { describe, expect, it, vi } from "vitest";
import { AiOutputError, type AiClient, proposeFromTranscript } from "./propose";

const valid = {
  summary: "Se revisó el avance.",
  decisions: ["Se aprueba el piloto."],
  risks: [],
  nextSteps: ["Cargar la primera minuta."],
  actions: [{ title: "Enviar accesos", ownerName: "Daray", dueDate: null }],
};

function clientReturning(content: unknown[]): AiClient {
  return { messages: { create: vi.fn().mockResolvedValue({ content }) } } as unknown as AiClient;
}

describe("proposeFromTranscript", () => {
  const text = (value: unknown) => [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }];

  it("devuelve la propuesta validada y pide salida estructurada", async () => {
    const client = clientReturning(text(valid));
    expect(await proposeFromTranscript(client, "texto", { model: "modelo-x", meetingDate: "2026-10-22" })).toEqual(valid);

    const call = vi.mocked(client.messages.create).mock.calls[0][0];
    expect(call.model).toBe("modelo-x");
    expect(call.output_config?.format?.type).toBe("json_schema");
    expect(call.tool_choice).toBeUndefined();
    // La fecha de la reunión va como referencia, antes del transcript
    expect(String(call.messages[0].content)).toBe(
      "<meeting_date>2026-10-22</meeting_date>\n<transcript>\ntexto\n</transcript>",
    );
    expect(String(call.system)).toContain("<meeting_date>");
  });

  it("rechaza una respuesta sin texto", async () => {
    const client = clientReturning([]);
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("rechaza un texto que no es JSON", async () => {
    const client = clientReturning(text("hola"));
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("rechaza una propuesta que no cumple el formato", async () => {
    const bad = { ...valid, actions: [{ title: "x", ownerName: "Ana", dueDate: "mañana" }] };
    const client = clientReturning(text(bad));
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("rechaza una respuesta cortada por límite de tokens", async () => {
    const client = { messages: { create: vi.fn().mockResolvedValue({ stop_reason: "max_tokens", content: text(valid) }) } } as unknown as AiClient;
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });
});
