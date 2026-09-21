import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { loadEnv } from "../../src/config/env.js";
import { hashPassword } from "../../src/auth/password.js";
import { createFakeAuthRepositories, type FakeAuthRepositories } from "../helpers/fake-repositories.js";
import { extractCookieHeader } from "../helpers/http.js";

const REAL_PASSWORD = "correct horse battery staple";
const TEST_ENV = loadEnv({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "unused-in-this-test",
} as NodeJS.ProcessEnv);

describe("admin auth routes", () => {
  let app: FastifyInstance;
  let repos: FakeAuthRepositories;

  beforeEach(async () => {
    repos = createFakeAuthRepositories();
    await repos.adminUserRepo.create({
      email: "owner@example.com",
      passwordHash: await hashPassword(REAL_PASSWORD),
    });
    app = await buildApp(TEST_ENV, repos);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /admin/login", () => {
    it("succeeds with correct credentials and sets a session cookie", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: REAL_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().admin.email).toBe("owner@example.com");
      expect(response.json().admin.passwordHash).toBeUndefined();
      const setCookie = response.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      expect(String(setCookie)).toContain("admin_session=");
      expect(String(setCookie)).toContain("HttpOnly");
    });

    it("rejects a wrong password with a generic error", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: "wrong" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "invalid_credentials" });
    });

    it("rejects a nonexistent email with the exact same status and body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "nobody@example.com", password: REAL_PASSWORD },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "invalid_credentials" });
    });

    it("rejects a malformed body with 400, not 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /admin/me", () => {
    it("rejects a request with no session cookie at all", async () => {
      const response = await app.inject({ method: "GET", url: "/admin/me" });
      expect(response.statusCode).toBe(401);
    });

    it("rejects a garbage session cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/admin/me",
        headers: { cookie: "admin_session=not-a-real-token" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("accepts a valid session from a successful login", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: REAL_PASSWORD },
      });
      const cookie = extractCookieHeader(login.headers["set-cookie"]);

      const me = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie } });
      expect(me.statusCode).toBe(200);
      expect(me.json().admin.email).toBe("owner@example.com");
    });

    it("rejects a session after it has been revoked (logout)", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: REAL_PASSWORD },
      });
      const cookie = extractCookieHeader(login.headers["set-cookie"]);

      await app.inject({ method: "POST", url: "/admin/logout", headers: { cookie } });

      const me = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie } });
      expect(me.statusCode).toBe(401);
    });

    it("rejects a session that has expired", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: REAL_PASSWORD },
      });
      const cookie = extractCookieHeader(login.headers["set-cookie"]);

      // Force every stored session into the past instead of waiting out
      // the real 12-hour TTL.
      for (const session of repos.adminSessionRepo.sessions) {
        session.expiresAt = new Date(Date.now() - 1000);
      }

      const me = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie } });
      expect(me.statusCode).toBe(401);
    });
  });

  describe("POST /admin/logout", () => {
    it("succeeds even with no session cookie (idempotent)", async () => {
      const response = await app.inject({ method: "POST", url: "/admin/logout" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
    });

    it("actually revokes the session in storage", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/admin/login",
        payload: { email: "owner@example.com", password: REAL_PASSWORD },
      });
      const cookie = extractCookieHeader(login.headers["set-cookie"]);

      await app.inject({ method: "POST", url: "/admin/logout", headers: { cookie } });

      expect(repos.adminSessionRepo.sessions).toHaveLength(1);
      expect(repos.adminSessionRepo.sessions[0]?.revokedAt).not.toBeNull();
    });
  });

  describe("rate limiting on POST /admin/login", () => {
    it("eventually responds 429 after enough attempts from the same client", async () => {
      const attempts = Array.from({ length: 10 }, () =>
        app.inject({
          method: "POST",
          url: "/admin/login",
          payload: { email: "owner@example.com", password: "wrong" },
        }),
      );
      const responses = await Promise.all(attempts);
      const statusCodes = responses.map((r) => r.statusCode);
      expect(statusCodes).toContain(429);
    });

    it("does not rate-limit unrelated routes", async () => {
      const attempts = Array.from({ length: 10 }, () =>
        app.inject({ method: "GET", url: "/health" }),
      );
      const responses = await Promise.all(attempts);
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    });
  });
});
