// Entrada con correo y contraseña, solo para probar en local con los usuarios «prueba».
// Se apaga sola en cualquier build de producción (Vercel incluido), aunque la variable esté puesta.
export function testLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" && env.ENABLE_TEST_LOGIN === "true";
}

// Solo los usuarios de prueba pueden tener contraseña.
export function isTestUserEmail(email: string): boolean {
  return /^prueba\.[a-z0-9._-]+@(machineryhunters|yuriramirezu)\.com$/.test(email.trim().toLowerCase());
}
