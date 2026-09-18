import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";

describe("GET /health", () => {
  const app = buildApp(loadEnv({ NODE_ENV: "test", LOG_LEVEL: "silent" } as NodeJS.ProcessEnv));

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
