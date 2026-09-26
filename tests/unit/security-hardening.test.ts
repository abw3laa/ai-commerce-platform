import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createFakeAuthRepositories } from "../helpers/fake-repositories.js";

const env = {
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: 3000,
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://ci:ci@localhost:5432/unused",
  WHATSAPP_AUTH_DIR: "./data/whatsapp-auth",
  MEDIA_STORAGE_DIR: "./data/media",
  AI_MODEL: "test",
  METRICS_TOKEN: "a".repeat(32),
} as const;

describe("production security boundaries", () => {
  it("does not expose metrics without the bearer token", async () => {
    const app = await buildApp(env, createFakeAuthRepositories());
    const result = await app.inject({ method: "GET", url: "/metrics" });
    expect(result.statusCode).toBe(404);
    await app.close();
  });

  it("accepts metrics only with the configured bearer token", async () => {
    const app = await buildApp(env, createFakeAuthRepositories());
    const result = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: { authorization: `Bearer ${env.METRICS_TOKEN}` },
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers["content-type"]).toContain("text/plain");
    await app.close();
  });

  it("blocks cross-site state-changing admin requests before authentication", async () => {
    const app = await buildApp(env, createFakeAuthRepositories());
    const result = await app.inject({
      method: "POST",
      url: "/admin/logout",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(result.statusCode).toBe(403);
    expect(result.json()).toEqual({ error: "cross_site_request_blocked" });
    await app.close();
  });
});
