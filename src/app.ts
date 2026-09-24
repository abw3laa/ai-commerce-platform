import Fastify, { type FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import { loadEnv, type Env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";
import { adminAuthRoutes } from "./routes/admin-auth.js";
import type { AuthRepositories } from "./auth/types.js";
import type { AuthorizationRepository } from "./auth/authorization-types.js";
import { adminDashboardRoutes } from "./routes/admin-dashboard.js";

/**
 * Builds (but does not start listening) a Fastify instance. Async because
 * the real Prisma wiring below is imported dynamically, not statically —
 * see the comment further down for why that matters.
 *
 * Passing `deps` swaps in fake, in-memory repositories instead of the
 * real Prisma-backed ones. This is what lets almost all of the admin auth
 * routes/middleware be tested with `app.inject(...)` and no real database
 * at all: production and the real end-to-end tests both call
 * `buildApp(env)` with no second argument; every other test passes fakes.
 */
export async function buildApp(
  env: Env = loadEnv(),
  deps?: AuthRepositories,
): Promise<FastifyInstance> {
  const app =
    env.NODE_ENV === "development"
      ? Fastify({
          logger: {
            level: env.LOG_LEVEL,
            transport: { target: "pino-pretty", options: { colorize: true } },
          },
        })
      : Fastify({ logger: { level: env.LOG_LEVEL } });

  app.register(healthRoutes);

  let resolvedDeps: AuthRepositories;
  let authorizationRepo: AuthorizationRepository;
  if (deps) {
    resolvedDeps = deps;
  } else {
    // Imported dynamically and only on this branch: these four modules
    // are the only ones in the whole app that touch the generated Prisma
    // client. Any test that supplies fake `deps` above never reaches this
    // branch, so it never triggers module resolution for the generated
    // client at all — which matters because this sandbox's network
    // policy blocks Prisma's engine downloads, so that generated client
    // does not exist locally (only in CI, where it is actually
    // generated). A static top-level import here would break every test
    // that imports buildApp, even ones that never use real Prisma.
    const [{ createPrismaClient }, { createPrismaAdminUserRepository }, { createPrismaAdminSessionRepository }, { createPrismaAuthorizationRepository }] =
      await Promise.all([
        import("./db/client.js"),
        import("./auth/prisma-admin-user-repository.js"),
        import("./auth/prisma-admin-session-repository.js"),
        import("./auth/prisma-authorization-repository.js"),
      ]);

    const { prisma, disconnect } = createPrismaClient(env.DATABASE_URL);
    resolvedDeps = {
      adminUserRepo: createPrismaAdminUserRepository(prisma),
      adminSessionRepo: createPrismaAdminSessionRepository(prisma),
    };
    authorizationRepo = createPrismaAuthorizationRepository(prisma);
    app.addHook("onClose", async () => {
      await disconnect();
    });
  }

  // global: false — rate limiting only applies where a route opts in via
  // its own `config.rateLimit` (currently just POST /admin/login).
  await app.register(fastifyRateLimit, { global: false });
  await app.register(adminAuthRoutes, {
    prefix: "/admin",
    deps: resolvedDeps,
    isProduction: env.NODE_ENV === "production",
  });

  if (!deps) {
    await app.register(adminDashboardRoutes, {
      prefix: "/admin",
      deps: resolvedDeps,
      authorizationRepo,
      isProduction: env.NODE_ENV === "production",
    });
  }

  return app;
}
