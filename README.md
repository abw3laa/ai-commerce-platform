# AI Commerce & Automation Platform — backend service

Status: **Phase 1 / Task 1 — walking skeleton.** This proves the runtime,
tooling, and test loop work end-to-end. It intentionally does **not** yet
include a database, authentication, or any business logic — those are
separate, reviewable tasks so each can be verified on its own.

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
- **Tests:** Vitest, using Fastify's `app.inject()` (no real socket needed
  for the test itself). Verified twice: once via `inject`, once by
  actually booting the dev server and the compiled build and hitting
  `/health` with `curl` — both matched.

## Running it

```bash
cp .env.example .env
npm install
npm run dev        # tsx, auto-reload
# or
npm run build && npm start   # compiled production build
```

- `npm test` — run the test suite once
- `npm run typecheck` — TypeScript, no emit
- `npm run lint` — ESLint

## Not built yet (upcoming tasks, in the agreed phase order)

Database (PostgreSQL + Prisma), auth & permissions, admin panel, backup
script, then products/inventory/offers, then the WhatsApp connector
(Baileys), then the AI core, then orders/payment, then shipping — each as
its own small task with its own tests, per the agreed working method.
