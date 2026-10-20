import { config } from "dotenv";
import { getDb } from "../src/lib/db";
import { testLevels, testStatuses } from "../src/lib/seed-data";

config({ path: ".env.local" });
config();

async function main() {
  const db = getDb();

  for (const level of testLevels) {
    await db.level.upsert({
      where: { name: level.name },
      update: { rank: level.rank, isSensitive: level.isSensitive },
      create: level,
    });
  }

  for (const status of testStatuses) {
    await db.actionStatus.upsert({
      where: { name: status.name },
      update: { position: status.position, isClosed: status.isClosed },
      create: status,
    });
  }

  // Primera persona administradora, para poder entrar la primera vez.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const top = await db.level.findFirstOrThrow({ orderBy: { rank: "desc" } });
    await db.user.upsert({
      where: { email: adminEmail },
      update: { profile: "ADMIN", maxLevelId: top.id, active: true },
      create: {
        email: adminEmail,
        name: process.env.SEED_ADMIN_NAME?.trim() || adminEmail,
        profile: "ADMIN",
        maxLevelId: top.id,
      },
    });
  }

  const [levels, statuses] = await Promise.all([db.level.count(), db.actionStatus.count()]);
  console.log(`Niveles: ${levels}. Estados: ${statuses}.`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
