import { describe, expect, it } from "vitest";
import { quickStatuses } from "./quick-status";

const s = (id: string, position: number, isClosed: boolean) => ({
  id,
  name: id,
  position,
  isClosed,
});

describe("quickStatuses", () => {
  it("elige pendiente, completado y cancelado de los estados de prueba", () => {
    const statuses = [
      s("Cancelado", 5, true),
      s("Hecho", 4, true),
      s("Pendiente", 1, false),
      s("En proceso", 2, false),
      s("Bloqueado", 3, false),
    ];
    expect(quickStatuses(statuses).map((q) => [q.kind, q.id])).toEqual([
      ["pending", "Pendiente"],
      ["done", "Hecho"],
      ["cancelled", "Cancelado"],
    ]);
  });
  it("con un solo estado de cierre no inventa el de cancelado", () => {
    expect(
      quickStatuses([s("A", 1, false), s("B", 2, true)]).map((q) => q.kind),
    ).toEqual(["pending", "done"]);
  });
  it("sin estados cerrados solo ofrece pendiente", () => {
    expect(quickStatuses([s("A", 1, false)]).map((q) => q.kind)).toEqual([
      "pending",
    ]);
  });
  it("sin estados no ofrece nada", () => {
    expect(quickStatuses([])).toEqual([]);
  });
});
