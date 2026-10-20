import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

const globalForDb = globalThis as unknown as { db?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL");
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

// Se crea al primer uso, para que el build no exija la base de datos.
export function getDb(): PrismaClient {
  if (!globalForDb.db) {
    globalForDb.db = createClient();
  }
  return globalForDb.db;
}
