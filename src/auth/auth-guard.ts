import type { FastifyReply, FastifyRequest } from "fastify";
import { getSessionTokenFromCookieHeader, buildClearedSessionCookieHeader } from "./cookie.js";
import { hashSessionToken } from "./session-token.js";
import { isSessionActive } from "./session.js";
import type { AuthRepositories } from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    adminUser?: { id: string; email: string };
  }
}

export interface AuthGuardDeps extends AuthRepositories {
  isProduction: boolean;
  now?: () => Date;
}

/**
 * Builds a Fastify preHandler that protects a route: it accepts the
 * request only if it carries a session cookie that is currently active
 * (not expired, not revoked) and belongs to an admin whose account is
 * still active. On any failure it clears the cookie (it is either
 * missing, stale, or no longer valid — no reason to keep asking the
 * browser to send it) and responds 401.
 *
 * On success it sets `request.adminUser` so downstream handlers can read
 * who is making the request without looking anything up again.
 */
export function createAuthGuard(deps: AuthGuardDeps) {
  return async function authGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const rawToken = getSessionTokenFromCookieHeader(request.headers.cookie);
    if (!rawToken) {
      await reply.code(401).send({ error: "unauthorized" });
      return;
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = await deps.adminSessionRepo.findByTokenHash(tokenHash);
    const now = (deps.now ?? (() => new Date()))();

    if (!session || !isSessionActive(session, now)) {
      reply.header(
        "set-cookie",
        buildClearedSessionCookieHeader({ secure: deps.isProduction }),
      );
      await reply.code(401).send({ error: "unauthorized" });
      return;
    }

    const admin = await deps.adminUserRepo.findById(session.adminUserId);
    if (!admin || !admin.isActive) {
      reply.header(
        "set-cookie",
        buildClearedSessionCookieHeader({ secure: deps.isProduction }),
      );
      await reply.code(401).send({ error: "unauthorized" });
      return;
    }

    request.adminUser = { id: admin.id, email: admin.email };
  };
}
