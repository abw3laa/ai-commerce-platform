import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AuthorizationRepository } from "./authorization-types.js";
import type { AdminPermission } from "./permissions.js";

export function createPrismaAuthorizationRepository(
  prisma: PrismaClient,
): AuthorizationRepository {
  return {
    async getPermissionKeysForAdmin(adminUserId) {
      const rows = await prisma.rolePermission.findMany({
        where: {
          role: {
            users: {
              some: { adminUserId },
            },
          },
        },
        select: { permission: { select: { key: true } } },
      });

      return rows
        .map((row) => row.permission.key)
        .filter((key): key is AdminPermission => typeof key === "string");
    },
  };
}
