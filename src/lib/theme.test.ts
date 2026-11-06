import { describe, expect, it } from "vitest";
import { isTheme, themeInitScript, toggleTheme } from "./theme";

describe("tema", () => {
  it("alterna entre claro y oscuro", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });

  it("solo acepta valores válidos", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("azul")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("el guion inicial es JavaScript válido", () => {
    expect(() => new Function(themeInitScript)).not.toThrow();
  });
});
