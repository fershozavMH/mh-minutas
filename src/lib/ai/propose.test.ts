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
  it("devuelve la propuesta validada y fuerza la herramienta de salida", async () => {
    const client = clientReturning([{ type: "tool_use", name: "registrar_propuesta", input: valid }]);
    expect(await proposeFromTranscript(client, "texto", "modelo-x")).toEqual(valid);

    const call = vi.mocked(client.messages.create).mock.calls[0][0];
    expect(call.model).toBe("modelo-x");
    expect(call.tool_choice).toEqual({ type: "tool", name: "registrar_propuesta" });
    expect(String(call.messages[0].content)).toContain("<transcript>\ntexto\n</transcript>");
  });

  it("rechaza una respuesta sin herramienta", async () => {
    const client = clientReturning([{ type: "text", text: "hola" }]);
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("rechaza una propuesta que no cumple el formato", async () => {
    const bad = { ...valid, actions: [{ title: "x", ownerName: "Ana", dueDate: "mañana" }] };
    const client = clientReturning([{ type: "tool_use", name: "registrar_propuesta", input: bad }]);
    await expect(proposeFromTranscript(client, "texto")).rejects.toBeInstanceOf(AiOutputError);
  });
});
