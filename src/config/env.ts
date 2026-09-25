import { z } from "zod";

/**
 * Every environment variable this service actually reads is declared here.
 * If something required is missing or malformed, the process must fail at
 * boot with a clear message — never fall back to a silent, guessed default
 * for anything that affects behavior.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  // Required starting with Task 3: the Prisma driver adapter needs this
  // explicitly in application code (Prisma 7 no longer wires it up from
  // schema.prisma automatically). No default — a missing connection
  // string must fail loudly at boot, not silently fall back to anything.
  DATABASE_URL: z.string().min(1),
  WHATSAPP_AUTH_DIR: z.string().min(1).default("./data/whatsapp-auth"),
  AI_API_URL: z.string().url().optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default("gpt-5.6"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
