import { describe, it, expect } from "vitest";
import { generateSessionToken, hashSessionToken } from "../../src/auth/session-token.js";

describe("session tokens", () => {
  it("generates sufficiently long, URL-safe tokens", () => {
    const token = generateSessionToken();
    // 32 random bytes, base64url-encoded, is 43 characters with no padding.
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates a different token each call", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
  });

  it("hashes the same token to the same value (deterministic lookup)", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("hashes different tokens to different values", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });

  it("never stores the raw token inside its own hash", () => {
    const token = generateSessionToken();
    const hashed = hashSessionToken(token);
    expect(hashed).not.toContain(token);
  });
});
