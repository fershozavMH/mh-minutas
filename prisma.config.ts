import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js usa .env.local; Prisma no lo lee solo, así que lo cargamos aquí.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
});
