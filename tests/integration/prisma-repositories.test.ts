import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { loadEnv } from "../../src/config/env.js";
import { createPrismaClient, type PrismaConnection } from "../../src/db/client.js";
import { createPrismaAdminUserRepository } from "../../src/auth/prisma-admin-user-repository.js";
import { createPrismaAdminSessionRepository } from "../../src/auth/prisma-admin-session-repository.js";

/**
 * These tests need a real, reachable PostgreSQL with the admin_users/
 * admin_sessions tables already migrated in (DATABASE_URL from the
 * environment, exactly as CI's workflow provides it after `prisma
 * migrate deploy`). They cannot run in this sandbox, which is the whole
 * reason the repositories above are kept this thin: the only thing left
 * to verify here is that they translate correctly to and from real rows.
 */
describe("Prisma-backed repositories (real database)", () => {
  let connection: PrismaConnection;

  beforeAll(() => {
    const env = loadEnv();
    connection = createPrismaClient(env.DATABASE_URL);
  });

  afterAll(async () => {
    await connection.disconnect();
  });

  beforeEach(async () => {
    // Keep each test isolated regardless of run order or previous
    // failures — sessions first, since they reference admin_users.
    await connection.prisma.adminSession.deleteMany({});
    await connection.prisma.adminUser.deleteMany({});
  });

  describe("AdminUserRepository", () => {
    it("creates a user and finds it by email", async () => {
      const repo = createPrismaAdminUserRepository(connection.prisma);
      const created = await repo.create({
        email: "repo-test@example.com",
        passwordHash: "hash-value",
      });

      expect(created.email).toBe("repo-test@example.com");
      expect(created.isActive).toBe(true);

      const found = await repo.findByEmail("repo-test@example.com");
      expect(found?.id).toBe(created.id);
      expect(found?.passwordHash).toBe("hash-value");
    });

    it("finds a user by id", async () => {
      const repo = createPrismaAdminUserRepository(connection.prisma);
      const created = await repo.create({
        email: "by-id@example.com",
        passwordHash: "hash-value",
      });
      const found = await repo.findById(created.id);
      expect(found?.email).toBe("by-id@example.com");
    });

    it("returns null for an email that does not exist", async () => {
      const repo = createPrismaAdminUserRepository(connection.prisma);
      expect(await repo.findByEmail("nobody@example.com")).toBeNull();
    });

    it("enforces the unique email constraint at the database level", async () => {
      const repo = createPrismaAdminUserRepository(connection.prisma);
      await repo.create({ email: "dupe@example.com", passwordHash: "a" });
      await expect(
        repo.create({ email: "dupe@example.com", passwordHash: "b" }),
      ).rejects.toBeDefined();
    });
  });

  describe("AdminSessionRepository", () => {
    it("creates a session linked to a real admin user and finds it by token hash", async () => {
      const userRepo = createPrismaAdminUserRepository(connection.prisma);
      const sessionRepo = createPrismaAdminSessionRepository(connection.prisma);
      const user = await userRepo.create({ email: "session-test@example.com", passwordHash: "h" });

      const created = await sessionRepo.create({
        adminUserId: user.id,
        tokenHash: "some-token-hash",
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(created.revokedAt).toBeNull();

      const found = await sessionRepo.findByTokenHash("some-token-hash");
      expect(found?.adminUserId).toBe(user.id);
    });

    it("revoking a session sets revokedAt and is reflected on lookup", async () => {
      const userRepo = createPrismaAdminUserRepository(connection.prisma);
      const sessionRepo = createPrismaAdminSessionRepository(connection.prisma);
      const user = await userRepo.create({ email: "revoke-test@example.com", passwordHash: "h" });
      await sessionRepo.create({
        adminUserId: user.id,
        tokenHash: "token-to-revoke",
        expiresAt: new Date(Date.now() + 60_000),
      });

      await sessionRepo.revokeByTokenHash("token-to-revoke");

      const found = await sessionRepo.findByTokenHash("token-to-revoke");
      expect(found?.revokedAt).not.toBeNull();
    });

    it("revoking a nonexistent token hash is a safe no-op, not an error", async () => {
      const sessionRepo = createPrismaAdminSessionRepository(connection.prisma);
      await expect(sessionRepo.revokeByTokenHash("does-not-exist")).resolves.toBeUndefined();
    });

    it("deleting the admin user cascades to delete their sessions", async () => {
      const userRepo = createPrismaAdminUserRepository(connection.prisma);
      const sessionRepo = createPrismaAdminSessionRepository(connection.prisma);
      const user = await userRepo.create({ email: "cascade-test@example.com", passwordHash: "h" });
      await sessionRepo.create({
        adminUserId: user.id,
        tokenHash: "cascade-token",
        expiresAt: new Date(Date.now() + 60_000),
      });

      await connection.prisma.adminUser.delete({ where: { id: user.id } });

      expect(await sessionRepo.findByTokenHash("cascade-token")).toBeNull();
    });
  });
});
