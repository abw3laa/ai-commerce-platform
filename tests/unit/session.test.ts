import { describe, it, expect } from "vitest";
import { isSessionActive } from "../../src/auth/session.js";
import type { AdminSessionRecord } from "../../src/auth/types.js";

function makeSession(overrides: Partial<AdminSessionRecord> = {}): AdminSessionRecord {
  return {
    id: "session_1",
    adminUserId: "user_1",
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    ...overrides,
  };
}

describe("isSessionActive", () => {
  const now = new Date();

  it("is active when not revoked and not yet expired", () => {
    const session = makeSession({ expiresAt: new Date(now.getTime() + 1000), revokedAt: null });
    expect(isSessionActive(session, now)).toBe(true);
  });

  it("is not active once expired", () => {
    const session = makeSession({ expiresAt: new Date(now.getTime() - 1000), revokedAt: null });
    expect(isSessionActive(session, now)).toBe(false);
  });

  it("is not active once revoked, even if not yet expired", () => {
    const session = makeSession({
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: new Date(now.getTime() - 1),
    });
    expect(isSessionActive(session, now)).toBe(false);
  });

  it("treats the exact expiry instant as no longer active", () => {
    const session = makeSession({ expiresAt: now, revokedAt: null });
    expect(isSessionActive(session, now)).toBe(false);
  });
});
