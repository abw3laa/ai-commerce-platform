import type { AdminPermission } from "./permissions.js";

export interface AuthorizationRepository {
  getPermissionKeysForAdmin(adminUserId: string): Promise<AdminPermission[]>;
}

export interface AuthorizationRepositories {
  authorizationRepo: AuthorizationRepository;
}
