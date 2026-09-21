import { hashSessionToken } from "./session-token.js";
import type { AdminSessionRepository } from "./types.js";

/**
 * Revokes the session matching a raw token, if any. Deliberately a no-op
 * (not an error) when the token does not match an active session — the
 * caller was already effectively logged out, and logout should always
 * succeed from the client's point of view.
 */
export async function performLogout(
  adminSessionRepo: AdminSessionRepository,
  rawSessionToken: string,
): Promise<void> {
  const tokenHash = hashSessionToken(rawSessionToken);
  await adminSessionRepo.revokeByTokenHash(tokenHash);
}
