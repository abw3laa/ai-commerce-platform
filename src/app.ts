import Fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type Env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";

/**
 * Builds (but does not start listening) a Fastify instance. Kept separate
 * from server.ts so tests can exercise routes with `app.inject(...)`
 * without binding a real TCP port.
 */
export function buildApp(env: Env = loadEnv()): FastifyInstance {
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

  return app;
}
