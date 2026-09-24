import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { loadEnv } from "../../src/config/env.js";
import { createPrismaClient, type PrismaConnection } from "../../src/db/client.js";
import { createPrismaAdminUserRepository } from "../../src/auth/prisma-admin-user-repository.js";
import { createFirstAdmin } from "../../src/scripts/create-admin.js";
import { extractCookieHeader } from "../helpers/http.js";

/**
 * The one test in the whole suite that uses nothing fake: a real admin
 * row created through the same createFirstAdmin function the CLI script
 * uses, a real running app with the real Prisma-backed repositories
 * (buildApp(env) with no injected deps), and real HTTP requests against
 * it via app.inject. This is what "اختبر الـ flow كاملًا فعليًا" (test
 * the complete flow for real) means concretely, on top of the much
 * larger set of fake-repository tests covering individual edge cases.
 */
describe("full admin auth flow (real database, real app, no fakes)", () => {
  let app: FastifyInstance;
  let connection: PrismaConnection;
  const env = loadEnv();
  const ADMIN_EMAIL = "e2e-owner@example.com";
  const ADMIN_PASSWORD = "a-genuinely-long-password";

  beforeAll(async () => {
    connection = createPrismaClient(env.DATABASE_URL);
    app = await buildApp(env);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await connection.prisma.adminSession.deleteMany({});
    await connection.prisma.adminUser.deleteMany({});
  });

  it("supports the full lifecycle: create admin -> login -> access protected route -> logout -> access denied", async () => {
    // 1. First-admin creation, via the exact function the CLI script calls.
    const userRepo = createPrismaAdminUserRepository(connection.prisma);
    const creation = await createFirstAdmin(userRepo, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(creation.ok).toBe(true);

    // The stored hash must never contain the plaintext password.
    const storedUser = await connection.prisma.adminUser.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    expect(storedUser?.passwordHash).toBeDefined();
    expect(storedUser?.passwordHash).not.toContain(ADMIN_PASSWORD);

    // 2. Login for real, through the real HTTP route and real database.
    const login = await app.inject({
      method: "POST",
      url: "/admin/login",
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    const cookie = extractCookieHeader(setCookie);
    expect(cookie).toContain("admin_session=");

    // A real row must now exist in admin_sessions.
    const sessionCountAfterLogin = await connection.prisma.adminSession.count();
    expect(sessionCountAfterLogin).toBe(1);

    // 3. The protected route accepts the real session.
    const me = await app.inject({ method: "GET", url: "/admin/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().admin.email).toBe(ADMIN_EMAIL);

    // 4. Logout revokes the session for real.
    const logout = await app.inject({ method: "POST", url: "/admin/logout", headers: { cookie } });
    expect(logout.statusCode).toBe(200);

    const revokedSession = await connection.prisma.adminSession.findFirst();
    expect(revokedSession?.revokedAt).not.toBeNull();

    // 5. The same cookie is now rejected.
    const meAfterLogout = await app.inject({
      method: "GET",
      url: "/admin/me",
      headers: { cookie },
    });
    expect(meAfterLogout.statusCode).toBe(401);
  });

  it("rejects login with the wrong password against the real database", async () => {
    const userRepo = createPrismaAdminUserRepository(connection.prisma);
    await createFirstAdmin(userRepo, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    const response = await app.inject({
      method: "POST",
      url: "/admin/login",
      payload: { email: ADMIN_EMAIL, password: "wrong-password" },
    });
    expect(response.statusCode).toBe(401);

    const sessionCount = await connection.prisma.adminSession.count();
    expect(sessionCount).toBe(0);
  });
});
