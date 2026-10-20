import { describe, expect, it } from "vitest";
import { isTestUserEmail, testLoginEnabled } from "./test-login";

describe("testLoginEnabled", () => {
  it("solo se enciende en desarrollo y con la variable en true", () => {
    expect(testLoginEnabled({ NODE_ENV: "development", ENABLE_TEST_LOGIN: "true" })).toBe(true);
    expect(testLoginEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(testLoginEnabled({ NODE_ENV: "development", ENABLE_TEST_LOGIN: "false" })).toBe(false);
  });

  it("nunca en producción, aunque la variable esté puesta", () => {
    expect(testLoginEnabled({ NODE_ENV: "production", ENABLE_TEST_LOGIN: "true" })).toBe(false);
  });
});

describe("isTestUserEmail", () => {
  it("reconoce solo correos prueba.* de los dominios permitidos", () => {
    expect(isTestUserEmail("prueba.asistente@machineryhunters.com")).toBe(true);
    expect(isTestUserEmail("Prueba.Directivo@MachineryHunters.com")).toBe(true);
    expect(isTestUserEmail("sistemas@machineryhunters.com")).toBe(false);
    expect(isTestUserEmail("prueba.x@gmail.com")).toBe(false);
  });
});
