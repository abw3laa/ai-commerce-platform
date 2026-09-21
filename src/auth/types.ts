/**
 * Plain interfaces only — deliberately no Prisma imports in this file.
 *
 * Everything in src/auth/ depends on these interfaces, not on Prisma
 * directly. The only files that import the generated Prisma client are
 * the prisma-*-repository.ts implementations. That keeps almost all of
 * the authentication logic unit-testable with a simple fake repository,
 * independent of whether a real database is reachable.
 */

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUserRecord | null>;
  findById(id: string): Promise<AdminUserRecord | null>;
  create(input: { email: string; passwordHash: string }): Promise<AdminUserRecord>;
}

export interface AdminSessionRecord {
  id: string;
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AdminSessionRepository {
  create(input: {
    adminUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AdminSessionRecord>;
  findByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
}

export interface AuthRepositories {
  adminUserRepo: AdminUserRepository;
  adminSessionRepo: AdminSessionRepository;
}
