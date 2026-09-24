import { randomBytes, createHash } from "node:crypto";

/**
 * Generates a fresh, high-entropy session token (32 random bytes,
 * base64url-encoded). This is the raw value placed in the session
 * cookie and shown to the client — it is never written to the database.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a raw session token with SHA-256 for storage/lookup.
 *
 * Unlike password hashing, a session token is already a long, uniformly
 * random value with no guessable structure — there is nothing for a slow,
 * memory-hard algorithm like Argon2id to protect against here. A single
 * fast cryptographic hash (SHA-256) is the standard choice for this case:
 * it still means a leaked database alone cannot be used to forge or reuse
 * a session, while keeping lookups cheap on every authenticated request.
 */
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
