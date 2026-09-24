import { describe, it, expect } from "vitest";
import { createFirstAdmin } from "../../src/scripts/create-admin.js";
import { verifyPassword } from "../../src/auth/password.js";
import { createFakeAdminUserRepository } from "../helpers/fake-repositories.js";

describe("createFirstAdmin", () => {
  it("creates an admin with a hashed (not plaintext) password", async () => {
    const repo = createFakeAdminUserRepository();
    const result = await createFirstAdmin(repo, {
      email: "owner@example.com",
      password: "a-long-enough-password",
    });

    expect(result.ok).toBe(true);
    const stored = repo.users[0];
    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe("a-long-enough-password");
    expect(stored?.passwordHash).not.toContain("a-long-enough-password");
    expect(await verifyPassword(stored?.passwordHash ?? "", "a-long-enough-password")).toBe(
      true,
    );
  });

  it("rejects an invalid email", async () => {
    const repo = createFakeAdminUserRepository();
    const result = await createFirstAdmin(repo, {
      email: "not-an-email",
      password: "a-long-enough-password",
    });
    expect(result.ok).toBe(false);
    expect(repo.users).toHaveLength(0);
  });

  it("rejects a too-short password", async () => {
    const repo = createFakeAdminUserRepository();
    const result = await createFirstAdmin(repo, {
      email: "owner@example.com",
      password: "short",
    });
    expect(result.ok).toBe(false);
    expect(repo.users).toHaveLength(0);
  });

  it("refuses to create a second admin with the same email", async () => {
    const repo = createFakeAdminUserRepository();
    await createFirstAdmin(repo, {
      email: "owner@example.com",
      password: "a-long-enough-password",
    });
    const second = await createFirstAdmin(repo, {
      email: "owner@example.com",
      password: "a-different-password",
    });
    expect(second.ok).toBe(false);
    expect(repo.users).toHaveLength(1);
  });
});
