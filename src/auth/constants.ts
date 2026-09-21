/**
 * Small, fixed configuration values for admin authentication. Kept as
 * plain constants rather than environment variables: none of these need
 * to differ across deployments right now, and adding env-var surface for
 * values nobody has asked to configure is exactly the kind of unneeded
 * complexity this project explicitly avoids. Adjust here if that changes.
 */

export const SESSION_COOKIE_NAME = "admin_session";

/** How long an admin session is valid for after login. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Failed-and-successful login attempts share one budget per IP, per route. */
export const LOGIN_RATE_LIMIT = {
  max: 5,
  timeWindow: "1 minute",
} as const;

/**
 * A real Argon2id hash of a fixed, unrelated dummy password — generated
 * once with the same @node-rs/argon2 this project uses for real password
 * hashes (default params: m=19456, t=2, p=1 — matches OWASP's minimum
 * recommendation for Argon2id).
 *
 * Used only when no admin_users row matches the submitted email: verifying
 * the submitted password against this dummy hash still costs a real
 * Argon2id computation, so a "no such email" response takes about the same
 * time as a "wrong password" response. Without this, an attacker could
 * infer which admin emails exist just by measuring response time (an
 * instant rejection for a missing row vs. a slower one after a real hash
 * comparison) — the same information the JSON response is already
 * required not to reveal.
 */
export const DUMMY_PASSWORD_HASH_FOR_TIMING_SAFETY =
  "$argon2id$v=19$m=19456,t=2,p=1$1GdXkDS9Y7KfQMS6Sc24Ew$hIbK0AAGIWQfXkx3j3uDPg6kKIS/ZCmt5KxJsm8EpCQ";
