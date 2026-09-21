import { SESSION_COOKIE_NAME } from "./constants.js";

export interface SessionCookieOptions {
  /** Set the Secure attribute. Must be true whenever the app is served over HTTPS (production). */
  secure: boolean;
}

/**
 * Builds the Set-Cookie header value for a freshly issued session.
 *
 * - HttpOnly: always — client-side JavaScript must never be able to read
 *   the session token (mitigates token theft via XSS).
 * - Secure: only in production (see SessionCookieOptions) — plain HTTP is
 *   still expected to work in local development.
 * - SameSite=Lax: sent on normal top-level navigation (so a fresh login
 *   redirect works) but withheld from cross-site requests, which is the
 *   standard baseline CSRF mitigation for a same-site admin panel with no
 *   need to be embedded or linked cross-site.
 * - Max-Age mirrors the session's real expiry, so the browser does not
 *   keep offering a cookie the server has already stopped honoring.
 */
export function buildSessionCookieHeader(
  rawToken: string,
  expiresAt: Date,
  options: SessionCookieOptions,
): string {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );

  return serializeCookie(SESSION_COOKIE_NAME, rawToken, {
    ...options,
    maxAgeSeconds,
  });
}

/**
 * Builds a Set-Cookie header value that immediately clears the session
 * cookie in the browser (used on logout and when a request presents an
 * invalid/expired/revoked session).
 */
export function buildClearedSessionCookieHeader(options: SessionCookieOptions): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", { ...options, maxAgeSeconds: 0 });
}

function serializeCookie(
  name: string,
  value: string,
  options: SessionCookieOptions & { maxAgeSeconds: number },
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${options.maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Extracts one cookie's value from a raw `Cookie` request header (e.g.
 * "a=1; admin_session=abc; b=2"). Returns undefined if the header is
 * absent or does not contain that cookie.
 */
export function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return part.slice(separatorIndex + 1).trim();
    }
  }
  return undefined;
}

/** Convenience wrapper around getCookieValue for the admin session cookie specifically. */
export function getSessionTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  return getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
}
