export const ADMIN_PERMISSIONS = [
  "products",
  "inventory",
  "orders",
  "customers",
  "payments",
  "shipping",
  "conversations",
  "ai",
  "settings",
  "users/permissions",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const FULL_ADMIN_ROLE = "super_admin" as const;
