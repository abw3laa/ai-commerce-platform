import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { adminDashboardRoutes } from "../../src/routes/admin-dashboard.js";
import { createFakeAuthRepositories } from "../helpers/fake-repositories.js";
import type { AuthorizationRepository } from "../../src/auth/authorization-types.js";
import { generateSessionToken, hashSessionToken } from "../../src/auth/session-token.js";

describe("admin dashboard", () => {
  it("requires authentication", async () => {
    const app = Fastify();
    const auth = createFakeAuthRepositories();
    const authorizationRepo: AuthorizationRepository = {
      async getPermissionKeysForAdmin() { return []; },
    };

    await app.register(adminDashboardRoutes, { deps: auth, authorizationRepo, isProduction: false });

    const response = await app.inject({ method: "GET", url: "/dashboard" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("renders the authenticated admin and inherited permissions", async () => {
    const app = Fastify();
    const auth = createFakeAuthRepositories([{
      id: "admin-1",
      email: "owner@example.com",
      passwordHash: "unused",
      isActive: true,
    }]);
    const token = generateSessionToken();

    await auth.adminSessionRepo.create({
      adminUserId: "admin-1",
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const authorizationRepo: AuthorizationRepository = {
      async getPermissionKeysForAdmin(adminUserId) {
        expect(adminUserId).toBe("admin-1");
        return ["products", "orders"];
      },
    };

    await app.register(adminDashboardRoutes, { deps: auth, authorizationRepo, isProduction: false });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.body).toContain("owner@example.com");
    expect(response.body).toContain("products");
    expect(response.body).toContain("orders");
    await app.close();
  });

  it("escapes admin-controlled email before rendering HTML", async () => {
    const app = Fastify();
    const auth = createFakeAuthRepositories([{
      id: "admin-1",
      email: "<unsafe>@example.com",
      passwordHash: "unused",
      isActive: true,
    }]);
    const token = generateSessionToken();

    await auth.adminSessionRepo.create({
      adminUserId: "admin-1",
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const authorizationRepo: AuthorizationRepository = {
      async getPermissionKeysForAdmin() { return []; },
    };

    await app.register(adminDashboardRoutes, { deps: auth, authorizationRepo, isProduction: false });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie: `admin_session=${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("&lt;unsafe&gt;");
    expect(response.body).not.toContain("<unsafe>");
    await app.close();
  });
});
