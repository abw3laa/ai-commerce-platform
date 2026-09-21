import { describe, it, expect } from "vitest";
import {
  buildSessionCookieHeader,
  buildClearedSessionCookieHeader,
  getCookieValue,
  getSessionTokenFromCookieHeader,
} from "../../src/auth/cookie.js";

describe("session cookie", () => {
  it("includes HttpOnly and SameSite=Lax always", () => {
    const header = buildSessionCookieHeader("tok123", new Date(Date.now() + 60_000), {
      secure: false,
    });
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
  });

  it("includes Secure only when requested (production)", () => {
    const insecure = buildSessionCookieHeader("tok123", new Date(Date.now() + 60_000), {
      secure: false,
    });
    const secure = buildSessionCookieHeader("tok123", new Date(Date.now() + 60_000), {
      secure: true,
    });
    expect(insecure).not.toContain("Secure");
    expect(secure).toContain("Secure");
  });

  it("carries the raw token as the cookie value", () => {
    const header = buildSessionCookieHeader("my-raw-token", new Date(Date.now() + 60_000), {
      secure: false,
    });
    expect(header).toContain("admin_session=my-raw-token");
  });

  it("sets a Max-Age reflecting the real remaining lifetime", () => {
    const header = buildSessionCookieHeader("tok", new Date(Date.now() + 3600_000), {
      secure: false,
    });
    const match = header.match(/Max-Age=(\d+)/);
    expect(match).not.toBeNull();
    const maxAge = Number(match?.[1]);
    // Allow a little slack for test execution time.
    expect(maxAge).toBeGreaterThan(3500);
    expect(maxAge).toBeLessThanOrEqual(3600);
  });

  it("clears the cookie with Max-Age=0 and an empty value", () => {
    const header = buildClearedSessionCookieHeader({ secure: false });
    expect(header).toContain("admin_session=;");
    expect(header).toContain("Max-Age=0");
  });

  it("parses a named cookie out of a raw Cookie header", () => {
    expect(getCookieValue("a=1; admin_session=abc123; b=2", "admin_session")).toBe("abc123");
  });

  it("returns undefined when the cookie is absent", () => {
    expect(getCookieValue("a=1; b=2", "admin_session")).toBeUndefined();
    expect(getCookieValue(undefined, "admin_session")).toBeUndefined();
  });

  it("getSessionTokenFromCookieHeader extracts specifically the session cookie", () => {
    expect(getSessionTokenFromCookieHeader("admin_session=xyz")).toBe("xyz");
    expect(getSessionTokenFromCookieHeader("other=1")).toBeUndefined();
  });
});
