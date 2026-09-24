import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { createAuthGuard } from "../../src/auth/auth-guard.js";
import { createPermissionGuard } from "../../src/auth/authorization-guard.js";
import { createFakeAuthRepositories } from "../helpers/fake-repositories.js";
import { hashSessionToken, generateSessionToken } from "../../src/auth/session-token.js";
import type { AuthorizationRepository } from "../../src/auth/authorization-types.js";

function createFakeAuthorizationRepository(
  permissionsByAdmin: Record<string, string[]> = {},
): AuthorizationRepository {
  return {
    async getPermissionKeysForAdmin(adminUserId) {
      return (permissionsByAdmin[adminUserId] ?? []) as never;
    },
  };
}

describe("authorization guard", () => {
  const now = new Date("2026-09-25T00:00:00.000Z");
  let auth: ReturnType<typeof createFakeAuthRepositories>;
  let token: string;
  let adminId: string;

  beforeEach(async () => {
    auth = createFakeAuthRepositories([
      {
        id: "admin-1",
        email: "owner@example.com",
        passwordHash: "unused",
        isActive: true,
      },
    ]);
    adminId = "admin-1";
    token = generateSessionToken();
    await auth.adminSessionRepo.create({
      adminUserId: adminId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + 60_000),
    });
  });

  async function build(permissionKeys: string[]) {
    const app = Fastify();
    const authGuard = createAuthGuard({
      ...auth,
      isProduction: false,
      now: () => now,
    });
    const authorizationRepo = createFakeAuthorizationRepository({
      [adminId]: permissionKeys,
    });
    const permissionGuard = createPermissionGuard(authorizationRepo, "products");

    app.get("/protected", { preHandler: [authGuard, permissionGuard] }, async () => ({
      ok: true,
    }));

    return app;
  }

  it("allows an authenticated user with the required permission", async () => {
    const app = await build(["products"]);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it("returns 403 for an authenticated user without the permission", async () => {
    const app = await build([]);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "forbidden" });
    await app.close();
  });

  it("returns 401 when there is no authenticated session", async () => {
    const app = await build(["products"]);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });

  it("returns 401 for an inactive admin even when the session is valid", async () => {
    const app = await build(["products"]);
    const admin = auth.adminUserRepo.users[0];
    admin.isActive = false;

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });

  it("fails closed when the role or permission assignment is missing", async () => {
    const app = await build([]);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("cannot bypass authorization by knowing the protected endpoint", async () => {
    const app = await build([]);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).not.toEqual({ ok: true });
    await app.close();
  });
});
