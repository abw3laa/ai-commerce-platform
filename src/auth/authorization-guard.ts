import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthorizationRepository } from "./authorization-types.js";
import type { AdminPermission } from "./permissions.js";

export function createPermissionGuard(
  authorizationRepo: AuthorizationRepository,
  permission: AdminPermission,
) {
  return async function permissionGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // This guard is deliberately safe when mounted without authGuard:
    // request.adminUser is only populated by the session auth guard.
    if (!request.adminUser) {
      await reply.code(401).send({ error: "unauthorized" });
      return;
    }

    const permissions = await authorizationRepo.getPermissionKeysForAdmin(
      request.adminUser.id,
    );

    if (!permissions.includes(permission)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
  };
}
