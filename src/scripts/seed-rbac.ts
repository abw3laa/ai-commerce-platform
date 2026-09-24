import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const { loadEnv } = await import("../config/env.js");
  const { createPrismaClient } = await import("../db/client.js");
  const { seedRbac } = await import("../auth/prisma-rbac.js");

  const env = loadEnv();
  const { prisma, disconnect } = createPrismaClient(env.DATABASE_URL);

  try {
    await seedRbac(prisma);
    console.log("RBAC seed completed.");
  } finally {
    await disconnect();
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  void main();
}
