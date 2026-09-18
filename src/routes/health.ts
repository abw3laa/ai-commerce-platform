import type { FastifyInstance } from "fastify";

/**
 * Liveness/readiness probe. Deliberately has no dependencies yet (no DB,
 * no external services) — this proves the process itself boots and serves
 * traffic. A database check is added in the task that introduces Prisma,
 * not invented here ahead of time.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "ai-commerce",
      timestamp: new Date().toISOString(),
    };
  });
}
