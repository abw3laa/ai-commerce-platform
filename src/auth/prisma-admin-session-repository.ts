import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AdminSessionRecord, AdminSessionRepository } from "./types.js";

export function createPrismaAdminSessionRepository(
  prisma: PrismaClient,
): AdminSessionRepository {
  return {
    async create(input) {
      const row = await prisma.adminSession.create({
        data: {
          adminUserId: input.adminUserId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      return toRecord(row);
    },

    async findByTokenHash(tokenHash) {
      const row = await prisma.adminSession.findUnique({ where: { tokenHash } });
      return row ? toRecord(row) : null;
    },

    async revokeByTokenHash(tokenHash) {
      // updateMany (not update) so that revoking an already-revoked or
      // nonexistent session is a safe no-op instead of a thrown "record
      // not found" error — logout must always succeed for the caller.
      await prisma.adminSession.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    },
  };
}

function toRecord(row: {
  id: string;
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}): AdminSessionRecord {
  return {
    id: row.id,
    adminUserId: row.adminUserId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}
