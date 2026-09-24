import { verifyPassword } from "./password.js";
import { generateSessionToken, hashSessionToken } from "./session-token.js";
import { DUMMY_PASSWORD_HASH_FOR_TIMING_SAFETY, SESSION_TTL_MS } from "./constants.js";
import type { AuthRepositories } from "./types.js";

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginResult =
  | {
      ok: true;
      admin: { id: string; email: string };
      rawSessionToken: string;
      expiresAt: Date;
    }
  | { ok: false };

export interface LoginDeps extends AuthRepositories {
  /** Injectable clock, defaults to the real one — lets tests use a fixed time. */
  now?: () => Date;
}

/**
 * Attempts an admin login. Deliberately returns a plain result rather
 * than throwing for "wrong password" / "no such account" / "disabled
 * account" — those are expected, ordinary outcomes, not exceptional ones,
 * and the caller (the route handler) is responsible for turning `ok:
 * false` into the same generic response regardless of which of those
 * three reasons caused it, so a failed login never reveals which case it
 * was.
 */
export async function attemptLogin(
  deps: LoginDeps,
  input: LoginInput,
): Promise<LoginResult> {
  const now = (deps.now ?? (() => new Date()))();
  const user = await deps.adminUserRepo.findByEmail(input.email);

  // Always run a real Argon2id verification, even when there is no user
  // to check against, so a missing-email response takes about as long as
  // a wrong-password response (see constants.ts for why).
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH_FOR_TIMING_SAFETY;
  const passwordMatches = await verifyPassword(hashToVerify, input.password);

  if (!user || !user.isActive || !passwordMatches) {
    return { ok: false };
  }

  const rawSessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawSessionToken);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await deps.adminSessionRepo.create({
    adminUserId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    ok: true,
    admin: { id: user.id, email: user.email },
    rawSessionToken,
    expiresAt,
  };
}
