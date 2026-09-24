import type { AdminSessionRecord } from "./types.js";

/**
 * A session is active if it has not been explicitly revoked (logout) and
 * has not passed its expiry time. Deliberately a plain function, not a
 * repository method: whether a session counts as active is a business
 * rule, not a data-access concern, and keeping it here means it can be
 * unit-tested directly with plain objects.
 */
export function isSessionActive(session: AdminSessionRecord, now: Date): boolean {
  return session.revokedAt === null && session.expiresAt.getTime() > now.getTime();
}
