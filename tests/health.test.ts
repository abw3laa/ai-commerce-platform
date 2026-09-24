import { describe, it, expect, afterAll, beforeAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { createFakeAuthRepositories } from "./helpers/fake-repositories.js";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Fake auth repositories: this route does not touch the database at
    // all, and using fakes here means this test never needs the real
    // Prisma client (see app.ts for why that matters in this sandbox).
    app = await buildApp(
      loadEnv({
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        DATABASE_URL: "unused-in-this-test",
      } as NodeJS.ProcessEnv),
      createFakeAuthRepositories(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with an ok status payload", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("ai-commerce");
    expect(typeof body.timestamp).toBe("string");
  });
});
