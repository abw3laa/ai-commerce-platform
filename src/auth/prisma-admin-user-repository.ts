import type { PrismaClient } from "../generated/prisma/client.js";
import type { AdminUserRecord, AdminUserRepository } from "./types.js";

/**
 * Deliberately thin: each method is a near-direct Prisma call. Keeping
 * this file free of business logic means the one thing it needs a real
 * database to verify (does it read/write the right columns correctly) is
 * a small, focused surface — everything else in src/auth/ is tested
 * without touching Prisma at all.
 */
export function createPrismaAdminUserRepository(prisma: PrismaClient): AdminUserRepository {
  return {
    async findByEmail(email) {
      const row = await prisma.adminUser.findUnique({ where: { email } });
      return row ? toRecord(row) : null;
    },

    async findById(id) {
      const row = await prisma.adminUser.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },

    async create(input) {
      const row = await prisma.adminUser.create({
        data: { email: input.email, passwordHash: input.passwordHash },
      });
      return toRecord(row);
    },
  };
}

function toRecord(row: {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
}): AdminUserRecord {
  return { id: row.id, email: row.email, passwordHash: row.passwordHash, isActive: row.isActive };
}
