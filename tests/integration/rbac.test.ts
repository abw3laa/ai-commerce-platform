import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadEnv } from "../../src/config/env.js";
import { createPrismaClient, type PrismaConnection } from "../../src/db/client.js";
import { createPrismaAdminUserRepository } from "../../src/auth/prisma-admin-user-repository.js";
import { createPrismaAuthorizationRepository } from "../../src/auth/prisma-authorization-repository.js";
import { seedRbac } from "../../src/auth/prisma-rbac.js";
import { ADMIN_PERMISSIONS, FULL_ADMIN_ROLE } from "../../src/auth/permissions.js";

describe("RBAC Prisma integration", () => {
  let connection: PrismaConnection;

  beforeAll(() => {
    const env = loadEnv();
    connection = createPrismaClient(env.DATABASE_URL);
  });

  afterAll(async () => {
    await connection.disconnect();
  });

  beforeEach(async () => {
    await connection.prisma.adminUserRole.deleteMany({});
    await connection.prisma.rolePermission.deleteMany({});
    await connection.prisma.adminSession.deleteMany({});
    await connection.prisma.adminUser.deleteMany({});
    await connection.prisma.permission.deleteMany({});
    await connection.prisma.role.deleteMany({});
  });

  it("seeds the full-admin role and all bounded permissions idempotently", async () => {
    const userRepo = createPrismaAdminUserRepository(connection.prisma);
    await userRepo.create({
      email: "rbac-owner@example.com",
      passwordHash: "test-hash",
    });

    await seedRbac(connection.prisma);
    await seedRbac(connection.prisma);

    const role = await connection.prisma.role.findUnique({
      where: { name: FULL_ADMIN_ROLE },
      include: { permissions: { include: { permission: true } } },
    });

    expect(role).not.toBeNull();
    expect(role?.permissions).toHaveLength(ADMIN_PERMISSIONS.length);
    expect(role?.permissions.map((item) => item.permission.key).sort()).toEqual(
      [...ADMIN_PERMISSIONS].sort(),
    );

    const admin = await connection.prisma.adminUser.findUnique({
      where: { email: "rbac-owner@example.com" },
      include: { roles: true },
    });
    expect(admin?.roles).toHaveLength(1);
    expect(admin?.roles[0]?.roleId).toBe(role?.id);
  });

  it("authorization repository returns only permissions inherited by the admin", async () => {
    const userRepo = createPrismaAdminUserRepository(connection.prisma);
    const owner = await userRepo.create({
      email: "owner@example.com",
      passwordHash: "test-hash",
    });
    const other = await userRepo.create({
      email: "other@example.com",
      passwordHash: "test-hash",
    });

    await seedRbac(connection.prisma);

    const role = await connection.prisma.role.findUniqueOrThrow({
      where: { name: FULL_ADMIN_ROLE },
    });
    const products = await connection.prisma.permission.findUniqueOrThrow({
      where: { key: "products" },
    });

    await connection.prisma.adminUserRole.deleteMany({
      where: { adminUserId: other.id },
    });

    await connection.prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: products.id },
    });

    // Owner keeps the seeded role but the role no longer has products.
    const repo = createPrismaAuthorizationRepository(connection.prisma);
    const ownerPermissions = await repo.getPermissionKeysForAdmin(owner.id);
    const otherPermissions = await repo.getPermissionKeysForAdmin(other.id);

    expect(ownerPermissions).not.toContain("products");
    expect(otherPermissions).toEqual([]);
  });
});
