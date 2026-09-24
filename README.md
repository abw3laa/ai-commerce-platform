# AI Commerce & Automation Platform — backend service

Status: **Phase 1 / Task 5 — basic admin dashboard.** Tasks 1–4 (foundation,
admin authentication, and RBAC) are complete. This task adds the first
protected server-rendered admin dashboard. Products, orders, WhatsApp,
and the AI core remain separate later tasks.

## Stack decisions made so far (see project chat log for full reasoning)

- **Runtime:** Node.js 22 LTS + TypeScript, single stack for API, admin
  backend, and AI orchestration (no Python service alongside it), because
  the WhatsApp connector (Baileys, added in a later task) is Node/TS-only
  and running two runtimes on a small server for no functional reason
  would violate the "don't overengineer" instruction.
- **TypeScript is pinned to `6.0.3`**, not the latest `7.0.2`, because
  `typescript-eslint@8.70.0` (current as of this task) only supports
  TypeScript `<6.1.0`. Installing "latest" would have silently left the
  project on a linter that can't parse its own compiler's output — this
  was caught by actually running `npm view typescript-eslint
peerDependencies`, not assumed.
- **API framework:** Fastify — schema-friendly (useful later for
  validating the AI's tool-call parameters per the security requirements),
  low overhead, ships with Pino for structured logging built in, so
  "establish logging" needs no extra library.
- **Env/config:** `zod`-validated config (`src/config/env.ts`) that fails
  fast at boot on a missing/invalid variable, rather than silently
  defaulting — this is what "establish configuration and secrets
  management" means at this stage.
- **Database:** PostgreSQL + Prisma 7 (see the Prisma section below).
- **Password hashing:** `@node-rs/argon2` (Argon2id, OWASP-minimum
  default params) — chosen over the classic `argon2` package because it
  ships prebuilt binaries (including `linux-x64-musl`, for a possible
  future Alpine-based deployment) as ordinary npm `optionalDependencies`,
  needing no native compiler toolchain and no network access beyond
  `registry.npmjs.org`.
- **Sessions:** opaque random tokens stored in `admin_sessions`
  (PostgreSQL), *not* JWTs — the task requirement was explicitly for
  DB-stored sessions, which is also what makes real, immediate
  server-side revocation on logout possible. Only a SHA-256 hash of the
  token is ever persisted; the raw token exists only in memory and in the
  HttpOnly cookie.
- **Tests:** Vitest, using Fastify's `app.inject()` (no real socket
  needed). Split into `tests/unit/` (no real database — see "Testing
  strategy" below) and `tests/integration/` (a genuine PostgreSQL).

## Running it

```bash
cp .env.example .env
npm install
npx prisma migrate deploy   # apply migrations to your local PostgreSQL
npm run dev                 # tsx, auto-reload
# or
npm run build && npm start  # compiled production build
```

- `npm test` — the full suite (unit + integration; integration needs a real `DATABASE_URL`)
- `npm run test:unit` — only `tests/unit/` — no database required
- `npm run typecheck` — TypeScript, no emit
- `npm run lint` — ESLint
- `npm run seed:rbac` — idempotently create the current RBAC permissions and `super_admin` role

### Creating the first admin account

There is no public registration endpoint on purpose. Create an account by
running the script directly (typically once, by whoever has shell access
to the server):

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-genuinely-long-password' npx tsx src/scripts/create-admin.ts
```

## Continuous Integration

`.github/workflows/ci.yml` runs on every push and pull request: `npm ci`,
`prisma generate`, `prisma migrate deploy` against a temporary PostgreSQL
service container (created fresh for each run, discarded afterwards),
then `typecheck`, `lint`, `test`, and `build`. It depends on nothing
outside the workflow — no local database, no external service.

## Prisma

`prisma/schema.prisma` currently defines two models:

- **`AdminUser`** (`admin_users`, Task 2) — `id` (cuid), unique `email`,
  `passwordHash` (Argon2id, never plaintext), `isActive`, timestamps. No
  `role`/`permissions` field yet — deferred until RBAC is actually needed.
- **`AdminSession`** (`admin_sessions`, Task 3) — belongs to an
  `AdminUser` (cascades on delete), a unique `tokenHash` (SHA-256 of the
  raw session token — the raw value is never stored), `expiresAt`, and a
  nullable `revokedAt` set on logout.

Prisma ORM 7 moved the CLI's database connection, schema path, and
migrations folder out of `schema.prisma` and into `prisma.config.ts`.
Application code additionally needs its own explicit connection: Prisma 7
no longer wires up the runtime client from `schema.prisma` either, so
`src/db/client.ts` constructs a `pg.Pool` + `@prisma/adapter-pg` directly
from `DATABASE_URL`.

The generated client lives at `generated/prisma` — a sibling of `src/`
and `prisma/`, *not* inside `src/`. That matters: `tsc` only compiles/
copies files under `src/**/*.ts` into `dist/`, so a generated client
placed inside `src/` would go missing from the compiled build. Keeping it
outside means the same relative import path resolves correctly whether
the app runs from `src/` (`tsx`, dev) or from `dist/` (compiled).

```bash
npx prisma generate       # regenerates the client into generated/prisma (gitignored)
npx prisma migrate dev    # local development — creates/applies migrations
npx prisma migrate deploy # CI/production — applies existing migrations only, never creates one
```

## Testing strategy (and why it's split this way)

The sandbox this project is being developed in blocks network access to
`binaries.prisma.sh`, so the Prisma CLI (`generate`/`migrate`/even
`validate`) cannot run there at all, at any time — only in GitHub
Actions, where the network is unrestricted. Rather than let that block
most of the test suite, the auth code is deliberately structured so only
a thin layer touches Prisma directly:

- `src/auth/types.ts` defines plain `AdminUserRepository` /
  `AdminSessionRepository` interfaces with no Prisma types in them.
- All the real logic (password verification, session-expiry rules, the
  login/logout orchestration, the auth guard, the routes themselves)
  depends only on those interfaces.
- `src/auth/prisma-admin-user-repository.ts` and
  `-session-repository.ts` are the only two files (plus `src/db/client.ts`)
  that import the generated Prisma client.
- `buildApp(env, deps?)` accepts an optional injected `deps`; passing fake,
  in-memory repositories (`tests/helpers/fake-repositories.ts`) exercises
  the real routes end-to-end via `app.inject()` with zero database.

Concretely: `tests/unit/*` (46+ tests — hashing, tokens, cookies, session
expiry, the full login/logout/guard/rate-limit HTTP flow via fakes) runs
and passes anywhere, including this sandbox. `tests/integration/*`
(the real Prisma-backed repositories, and one true end-to-end test with
zero fakes anywhere) needs a real, migrated PostgreSQL and only runs in
CI — which is also where `prisma generate`/`migrate deploy`/`typecheck`/
`build` get their real, authoritative verification for the same reason.

## Products, inventory, and offers\n\nThe admin API now exposes protected catalog endpoints under `/admin`: product\nlist/create/update, variant stock updates, and bundle offer list/create/update.\n`products` permission controls catalog and offers; `inventory` controls stock\nchanges. Prices are stored as integer currency units in this first catalog task;\nprecision beyond whole units is intentionally deferred. Media upload/storage is intentionally deferred until the storage\ntask is defined.\n\n## Current admin panel

`GET /admin/dashboard` is protected by the session authentication guard and
renders a small server-side dashboard. It shows the authenticated admin,
current inherited permissions, platform status, and a logout action. The
page sends `Cache-Control: no-store` and a restrictive Content Security
Policy. It intentionally contains no product/order/WhatsApp/AI features.

## Not built yet (upcoming tasks, in the agreed phase order)

Products/inventory/offers, then customers/orders, payments/shipping, the
WhatsApp connector (Baileys), the AI core, automation/reporting, and later
production hardening — each as its own small task with its own tests.

