import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "./allowed-email";

describe("isAllowedEmail", () => {
  it("acepta los dos dominios, sin importar mayúsculas", () => {
    expect(isAllowedEmail("sistemas@machineryhunters.com")).toBe(true);
    expect(isAllowedEmail("Alguien@YuriRamirezU.com")).toBe(true);
  });

  it("rechaza otros dominios y subdominios parecidos", () => {
    expect(isAllowedEmail("x@gmail.com")).toBe(false);
    expect(isAllowedEmail("x@machineryhunters.com.evil.com")).toBe(false);
    expect(isAllowedEmail("x@evilmachineryhunters.com")).toBe(false);
  });

  it("rechaza valores mal formados", () => {
    expect(isAllowedEmail("")).toBe(false);
    expect(isAllowedEmail("machineryhunters.com")).toBe(false);
    expect(isAllowedEmail("@machineryhunters.com")).toBe(false);
  });
});
