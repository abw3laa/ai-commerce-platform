import { describe, it, expect, beforeEach } from "vitest";
import { attemptLogin } from "../../src/auth/login.js";
import { hashPassword } from "../../src/auth/password.js";
import { createFakeAuthRepositories, type FakeAuthRepositories } from "../helpers/fake-repositories.js";

const REAL_PASSWORD = "correct horse battery staple";

describe("attemptLogin", () => {
  let repos: FakeAuthRepositories;

  beforeEach(async () => {
    repos = createFakeAuthRepositories();
    await repos.adminUserRepo.create({
      email: "owner@example.com",
      passwordHash: await hashPassword(REAL_PASSWORD),
    });
  });

  it("succeeds with the correct email and password", async () => {
    const result = await attemptLogin(repos, {
      email: "owner@example.com",
      password: REAL_PASSWORD,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.admin.email).toBe("owner@example.com");
      expect(result.rawSessionToken.length).toBeGreaterThan(0);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("creates exactly one session record on success", async () => {
    await attemptLogin(repos, { email: "owner@example.com", password: REAL_PASSWORD });
    expect(repos.adminSessionRepo.sessions).toHaveLength(1);
  });

  it("fails with the wrong password", async () => {
    const result = await attemptLogin(repos, {
      email: "owner@example.com",
      password: "wrong password",
    });
    expect(result.ok).toBe(false);
  });

  it("fails with an email that does not exist", async () => {
    const result = await attemptLogin(repos, {
      email: "nobody@example.com",
      password: REAL_PASSWORD,
    });
    expect(result.ok).toBe(false);
  });

  it("does not create a session on failure", async () => {
    await attemptLogin(repos, { email: "owner@example.com", password: "wrong" });
    await attemptLogin(repos, { email: "nobody@example.com", password: REAL_PASSWORD });
    expect(repos.adminSessionRepo.sessions).toHaveLength(0);
  });

  it("fails for a disabled (inactive) account, even with the right password", async () => {
    const created = repos.adminUserRepo.users.find((u) => u.email === "owner@example.com");
    if (created) {
      created.isActive = false;
    }
    const result = await attemptLogin(repos, {
      email: "owner@example.com",
      password: REAL_PASSWORD,
    });
    expect(result.ok).toBe(false);
  });

  it("takes comparable time for a nonexistent email as for a wrong password", async () => {
    const time = async (email: string, password: string): Promise<number> => {
      const start = performance.now();
      await attemptLogin(repos, { email, password });
      return performance.now() - start;
    };

    const wrongPasswordMs = await time("owner@example.com", "wrong password");
    const noSuchEmailMs = await time("nobody@example.com", REAL_PASSWORD);

    // Both paths perform one real Argon2id verification, so they should
    // be within the same order of magnitude — this is a coarse guard
    // against accidentally short-circuiting before hashing when the
    // email does not exist, not a precise timing-attack benchmark (which
    // would be too flaky to run reliably in CI).
    const ratio = Math.max(wrongPasswordMs, noSuchEmailMs) / Math.min(wrongPasswordMs, noSuchEmailMs);
    expect(ratio).toBeLessThan(5);
  });
});
