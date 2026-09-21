import type {
  AdminUserRecord,
  AdminUserRepository,
  AdminSessionRecord,
  AdminSessionRepository,
  AuthRepositories,
} from "../../src/auth/types.js";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export type FakeAdminUserRepository = AdminUserRepository & { users: AdminUserRecord[] };

export function createFakeAdminUserRepository(
  seed: AdminUserRecord[] = [],
): FakeAdminUserRepository {
  const users = [...seed];
  return {
    users,
    async findByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async create(input) {
      const record: AdminUserRecord = {
        id: nextId("user"),
        email: input.email,
        passwordHash: input.passwordHash,
        isActive: true,
      };
      users.push(record);
      return record;
    },
  };
}

export type FakeAdminSessionRepository = AdminSessionRepository & {
  sessions: AdminSessionRecord[];
};

export function createFakeAdminSessionRepository(): FakeAdminSessionRepository {
  const sessions: AdminSessionRecord[] = [];
  return {
    sessions,
    async create(input) {
      const record: AdminSessionRecord = {
        id: nextId("session"),
        adminUserId: input.adminUserId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
      };
      sessions.push(record);
      return record;
    },
    async findByTokenHash(tokenHash) {
      return sessions.find((s) => s.tokenHash === tokenHash) ?? null;
    },
    async revokeByTokenHash(tokenHash) {
      const session = sessions.find((s) => s.tokenHash === tokenHash);
      if (session) {
        session.revokedAt = new Date();
      }
    },
  };
}

export interface FakeAuthRepositories extends AuthRepositories {
  adminUserRepo: FakeAdminUserRepository;
  adminSessionRepo: FakeAdminSessionRepository;
}

export function createFakeAuthRepositories(seedUsers: AdminUserRecord[] = []): FakeAuthRepositories {
  return {
    adminUserRepo: createFakeAdminUserRepository(seedUsers),
    adminSessionRepo: createFakeAdminSessionRepository(),
  };
}
