import { fileURLToPath } from "node:url";
import { z } from "zod";
import { hashPassword } from "../auth/password.js";
import type { AdminUserRepository } from "../auth/types.js";
// createPrismaAdminUserRepository/createPrismaClient/loadEnv are imported
// dynamically inside main() below, not here at the top level. This file
// exports createFirstAdmin for tests to call directly with a fake
// repository — a static import here would drag in the generated Prisma
// client for every test that does that, exactly like app.ts (see the
// comment there for why that's a real problem in this sandbox).

const inputSchema = z.object({
  email: z.string().email(),
  // Deliberately higher than a typical user-facing minimum: this is the
  // one account type in the system with no roles/permissions distinction
  // yet, so every admin account is, for now, maximally privileged.
  password: z.string().min(12),
});

export interface CreateAdminInput {
  email: string;
  password: string;
}

export type CreateAdminResult =
  | { ok: true; adminId: string; email: string }
  | { ok: false; reason: "invalid_input"; details: string }
  | { ok: false; reason: "email_already_exists" };

/**
 * Creates one admin account. Exported separately from the CLI entrypoint
 * below so it can be exercised directly in tests (against a real
 * repository/database) without spawning a subprocess.
 */
export async function createFirstAdmin(
  adminUserRepo: AdminUserRepository,
  input: CreateAdminInput,
): Promise<CreateAdminResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_input",
      details: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const existing = await adminUserRepo.findByEmail(parsed.data.email);
  if (existing) {
    return { ok: false, reason: "email_already_exists" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await adminUserRepo.create({
    email: parsed.data.email,
    passwordHash,
  });

  return { ok: true, adminId: created.id, email: created.email };
}

/**
 * CLI entrypoint. Reads credentials from environment variables rather
 * than command-line arguments or an interactive prompt: this keeps the
 * script trivially scriptable (a test, a deploy step, or an operator's
 * shell can set two env vars and run it) while never touching shell
 * history the way a CLI argument would.
 *
 * There is no HTTP endpoint for this on purpose — the only way to create
 * an admin account is for someone with shell access to the server to run
 * this script directly.
 *
 * Usage:
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='...' npx tsx src/scripts/create-admin.ts
 */
async function main(): Promise<void> {
  const { loadEnv } = await import("../config/env.js");
  const { createPrismaClient } = await import("../db/client.js");
  const { createPrismaAdminUserRepository } = await import(
    "../auth/prisma-admin-user-repository.js"
  );

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are both required.",
    );
    process.exitCode = 1;
    return;
  }

  const env = loadEnv();
  const { prisma, disconnect } = createPrismaClient(env.DATABASE_URL);
  const adminUserRepo = createPrismaAdminUserRepository(prisma);

  try {
    const result = await createFirstAdmin(adminUserRepo, { email, password });

    if (!result.ok) {
      if (result.reason === "invalid_input") {
        console.error(`Invalid input: ${result.details}`);
      } else {
        console.error(`An admin with email "${email}" already exists.`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Admin account created: ${result.email} (id: ${result.adminId})`);
  } finally {
    await disconnect();
  }
}

// Only run the CLI flow when this file is executed directly (e.g. via
// `npx tsx src/scripts/create-admin.ts`), not when a test imports
// createFirstAdmin from it. Comparing against process.argv[1] (the
// standard Node/ESM idiom for "is this the entry module") rather than
// matching on the file name string, which would also misfire for any
// other file that happened to share this one's name.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  void main();
}
