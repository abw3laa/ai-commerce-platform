import type { PrismaClient } from "../../generated/prisma/client.js";
import { ADMIN_PERMISSIONS, FULL_ADMIN_ROLE } from "./permissions.js";

const PERMISSION_DESCRIPTIONS: Record<(typeof ADMIN_PERMISSIONS)[number], string> = {
  products: "Manage products",
  inventory: "Manage inventory",
  orders: "Manage orders",
  customers: "Manage customers",
  payments: "Manage payments",
  shipping: "Manage shipping",
  conversations: "Manage customer conversations",
  ai: "Use the AI commerce engine",
  reports: "View commerce reports",
  automation: "Run commerce automation",
  settings: "Manage platform settings",
  "users/permissions": "Manage admin users, roles, and permissions",
};

export async function seedRbac(prisma: PrismaClient): Promise<void> {
  const permissions = await Promise.all(
    ADMIN_PERMISSIONS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: { description: PERMISSION_DESCRIPTIONS[key] },
        create: { key, description: PERMISSION_DESCRIPTIONS[key] },
      }),
    ),
  );

  const role = await prisma.role.upsert({
    where: { name: FULL_ADMIN_ROLE },
    update: { description: "Full access to all current admin capabilities" },
    create: {
      name: FULL_ADMIN_ROLE,
      description: "Full access to all current admin capabilities",
    },
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      }),
    ),
  );

  const admins = await prisma.adminUser.findMany({
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      prisma.adminUserRole.upsert({
        where: {
          adminUserId_roleId: {
            adminUserId: admin.id,
            roleId: role.id,
          },
        },
        update: {},
        create: { adminUserId: admin.id, roleId: role.id },
      }),
    ),
  );
}
