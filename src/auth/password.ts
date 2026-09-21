import { hash, verify } from "@node-rs/argon2";

/**
 * Hashes a plaintext password with Argon2id, using @node-rs/argon2's
 * default parameters (m=19456 KiB, t=2, p=1 — OWASP's minimum recommended
 * Argon2id configuration as of this writing). The plaintext password is
 * never stored or logged; only this hash is persisted.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  return hash(plainTextPassword);
}

/**
 * Verifies a plaintext password against a previously-computed Argon2id
 * hash. Never throws on a non-matching password — returns false instead,
 * so callers can treat "wrong password" as an ordinary result rather than
 * an exceptional one.
 */
export async function verifyPassword(
  storedHash: string,
  plainTextPassword: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plainTextPassword);
  } catch {
    // @node-rs/argon2 throws if storedHash is not a well-formed Argon2
    // hash at all (e.g. corrupted data). Treat that the same as "does not
    // match" rather than letting it surface as an unhandled error.
    return false;
  }
}
