import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { attemptLogin } from "../auth/login.js";
import { performLogout } from "../auth/logout.js";
import { createAuthGuard } from "../auth/auth-guard.js";
import { buildSessionCookieHeader, buildClearedSessionCookieHeader, getSessionTokenFromCookieHeader } from "../auth/cookie.js";
import { LOGIN_RATE_LIMIT } from "../auth/constants.js";
import type { AuthRepositories } from "../auth/types.js";

const loginBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export interface AdminAuthRoutesOptions {
  deps: AuthRepositories;
  isProduction: boolean;
}

export async function adminAuthRoutes(
  app: FastifyInstance,
  options: AdminAuthRoutesOptions,
): Promise<void> {
  const { deps, isProduction } = options;
  const authGuard = createAuthGuard({ ...deps, isProduction });

  app.post(
    "/login",
    { config: { rateLimit: LOGIN_RATE_LIMIT } },
    async (request, reply) => {
      const parsedBody = loginBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({ error: "invalid_request" });
      }

      const result = await attemptLogin(deps, parsedBody.data);

      if (!result.ok) {
        // Same status, same body, regardless of *why* the login failed
        // (no such email, wrong password, or a disabled account) — see
        // attemptLogin/constants.ts for how response timing is also kept
        // consistent between these cases.
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      reply.header(
        "set-cookie",
        buildSessionCookieHeader(result.rawSessionToken, result.expiresAt, {
          secure: isProduction,
        }),
      );
      return reply.code(200).send({ admin: result.admin });
    },
  );

  app.post("/logout", async (request, reply) => {
    const rawToken = getSessionTokenFromCookieHeader(request.headers.cookie);
    if (rawToken) {
      await performLogout(deps.adminSessionRepo, rawToken);
    }
    // Always succeeds, always clears the cookie: from the client's
    // perspective there is no meaningful difference between "you had a
    // session and it is now revoked" and "you had nothing to log out of".
    reply.header("set-cookie", buildClearedSessionCookieHeader({ secure: isProduction }));
    return reply.code(200).send({ ok: true });
  });

  app.get("/me", { preHandler: authGuard }, async (request, reply) => {
    // authGuard has already verified the session and populated this by
    // the time a request reaches here.
    return reply.code(200).send({ admin: request.adminUser });
  });
}
