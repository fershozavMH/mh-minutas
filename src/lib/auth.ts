import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { isAllowedEmail } from "./allowed-email";
import { getDb } from "./db";

function createAuth() {
  const db = getDb();

  return betterAuth({
    database: prismaAdapter(db, { provider: "postgresql" }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        // Solo entran cuentas de Google Workspace; Administración da de alta a cada persona.
        hd: "*",
        disableSignUp: true,
      },
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    user: {
      additionalFields: {
        profile: { type: "string", required: false, input: false },
        maxLevelId: { type: "string", required: false, input: false },
        bossId: { type: "string", required: false, input: false },
        active: { type: "boolean", required: false, input: false },
      },
      validateUserInfo: async ({ user }) => {
        const email = typeof user.email === "string" ? user.email : "";
        if (!isAllowedEmail(email)) {
          return { error: "dominio_no_permitido", errorDescription: "Ese correo no tiene acceso." };
        }
        const registered = await db.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!registered || !registered.active) {
          return { error: "usuario_no_registrado", errorDescription: "Ese correo no tiene acceso." };
        }
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

// Se crea al primer uso, para que el build no exija variables de entorno.
export function getAuth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}
