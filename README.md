# AI Commerce & Automation Platform — backend service

Status: **Phase 1 / Task 12 — Final Automation, Reporting & Operational Verification.** Tasks 1–10 are complete:
foundation, authentication/RBAC, catalog, customers/orders, payments, and
shipping. This task adds a tool-driven AI commerce engine with strict catalog/order facts and an OpenAI-compatible provider.

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

`prisma/schema.prisma` defines the admin/auth, RBAC, catalog, customer, and order models:

- **`AdminUser` / `AdminSession`** — session-based admin authentication.
- **RBAC models** — `Role`, `Permission`, `AdminUserRole`, `RolePermission`.
- **Catalog models** — `Product`, `ProductVariant`, `Offer`, `OfferItem`.
- **Task 7 models** — `Customer`, `Order`, and `OrderItem`. Order items keep
  product/variant snapshots (name, SKU, size, color, unit price, quantity)
  so later catalog edits do not rewrite historical order details. Core order
  status flow is `received → review → preparing → shipped → on_the_way`,
  with cancellation allowed before shipping.
- **Task 8 models** — `Payment` and `Shipment`, each one-to-one with an order.
- **Task 9 models** — `Conversation` and `ConversationMessage` for WhatsApp conversation history and customer linkage.
  Payment supports `prepaid`, `bank_transfer`, and `pay_later`, with pending,
  approved, and rejected verification states. Shipment tracks carrier,
  tracking code/URL, and the lifecycle `pending → shipped → on_the_way → delivered`.
  Receipt OCR and external carrier integrations remain deferred.

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

## Payments and shipping

Protected `/admin` routes manage payment records and verification status under
`payments`, and shipment carrier/tracking data and status under `shipping`.
Payment approval records `verifiedAt`; rejection requires a reason when one is
provided. Shipment timestamps are recorded when shipping and delivery states
are reached. Receipt OCR and carrier-specific integrations are intentionally
out of scope for this task.

## WhatsApp Commerce

The WhatsApp connector uses Baileys over its WebSocket connection, with
persistent multi-device credentials under `WHATSAPP_AUTH_DIR`. Incoming text
messages are linked to a customer by phone and persisted as conversation
messages; outbound admin messages are persisted as well. Protected admin
endpoints expose connection status, sending text messages, and conversation
history under the `conversations` permission. QR/pairing-code presentation and
the AI reply engine are separate concerns handled by the later admin/AI work.

## AI Commerce Engine

The AI engine uses a provider abstraction and a bounded commerce tool registry. Product price and stock come only from the catalog repository; order, payment, and shipping state comes only from their repositories. Unknown tools and tool execution failures fail closed. The provider is configured with `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL`; without credentials the protected AI endpoint returns a provider-unavailable response rather than inventing an answer.

The protected `POST /admin/ai/respond` endpoint requires the `ai` permission. The engine is limited to four tool rounds per request to prevent unbounded tool execution. Voice, social channels, workflow automation, and the final admin UI remain later scope.

## Admin Application & Production Hardening

Task 11 adds a complete lightweight admin application at `/admin/app` with a public `/admin/login` page. It uses the existing session cookie and RBAC permissions, with sections for dashboard, products, customers, orders, payments, shipping, WhatsApp, and AI. The UI is deliberately server-served HTML/CSS/JavaScript with no frontend framework or build pipeline, keeping the deployment footprint small.

The application also adds baseline security response headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`), strict no-store behavior for the admin UI, and a restrictive CSP that permits only the inline code required by this self-contained admin page. Production secrets and external AI credentials remain environment configuration rather than UI-managed values.

## Task 12 — Final Automation, Reporting & Operations

Task 12 completes the current Phase 1 scope. The admin application now includes a protected Reports section at `/admin/reports/summary`, covering catalog/customer/order totals, revenue, order/payment/shipping status breakdowns, and low-stock variants.

Order status changes trigger deterministic WhatsApp customer notifications when WhatsApp is connected. Notification failures are logged without rolling back the already-persisted order status.

`/health` is the liveness probe and `/health/ready` verifies PostgreSQL readiness. A production Dockerfile is included; it applies migrations and idempotently seeds RBAC before starting the server. No visual workflow editor was added; automation remains bounded to deterministic commerce actions.

The current admin application is available at `/admin/login` and `/admin/app` after deployment.

 