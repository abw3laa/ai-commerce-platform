import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma ORM 7 moved CLI configuration (schema location, migrations
 * folder, and the database connection used by `prisma` commands) out of
 * schema.prisma and into this file. It is read only by the Prisma CLI
 * (`generate`, `migrate`, ...) — the running application never imports it.
 *
 * Prisma 7 also no longer loads `.env` automatically, hence the explicit
 * `dotenv/config` import above.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
