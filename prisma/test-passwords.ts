// Pone contraseña a los usuarios «prueba.*» para entrar en local sin Google.
// Uso: define TEST_LOGIN_PASSWORD en .env.local y corre `npm run db:test-passwords`.
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "../src/lib/db";
import { isTestUserEmail } from "../src/lib/test-login";

config({ path: ".env.local" });
config();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("No se corre en producción.");
  const password = process.env.TEST_LOGIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("Define TEST_LOGIN_PASSWORD (mínimo 12 caracteres) en .env.local.");

  const db = getDb();
  const users = (await db.user.findMany({ where: { active: true } })).filter((u) => isTestUserEmail(u.email));
  const hash = await hashPassword(password);

  for (const user of users) {
    const existing = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (existing) await db.account.update({ where: { id: existing.id }, data: { password: hash } });
    else await db.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: hash } });
    console.log(`Contraseña lista: ${user.email}`);
  }
  if (users.length === 0) console.log("No hay usuarios prueba.* activos.");
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
