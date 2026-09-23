import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

export interface PrismaConnection {
  prisma: PrismaClient;
  disconnect: () => Promise<void>;
}

/**
 * Creates a PrismaClient wired to a real PostgreSQL connection pool.
 *
 * Prisma 7 no longer reads the connection string from schema.prisma at
 * runtime — a driver adapter with an explicit connection string is
 * required in application code (prisma.config.ts's own DATABASE_URL is
 * separate, and only used by the Prisma CLI, not by this running app).
 *
 * Returns a disconnect function that closes both the Prisma client and
 * the underlying pg pool, meant to be called once on graceful shutdown.
 */
export function createPrismaClient(databaseUrl: string): PrismaConnection {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    disconnect: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
