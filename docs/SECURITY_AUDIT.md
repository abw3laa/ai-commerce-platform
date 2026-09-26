# Security audit

Date: 2026-09-26

## Findings

### P1 — Payment receipt media authorization — fixed

The media endpoint previously used the products permission for every media asset. Payment receipts now require the payments permission. Regression tests cover both denial and allowed access.

### P2 — Cross-site state-changing admin requests — fixed

Production POST/PUT/PATCH/DELETE requests under /admin are rejected when browser fetch metadata or Origin identifies a cross-site request. SameSite remains defense in depth.

### P2 — Public production metrics — fixed

Production /metrics now requires a bearer token configured with METRICS_TOKEN. Unauthenticated requests return 404.

### P3 — Prisma 7.10 dependency audit findings — upstream/non-runtime

The full npm audit reported four high and one moderate findings through @prisma/config, deepmerge-ts, mysql2, and Prisma's CLI dependency graph. The affected deepmerge-ts and mysql2 entries are devOptional in the lockfile. The application uses PostgreSQL, not MySQL. Prisma has an upstream issue documenting the deepmerge-ts pin and describing that finding as dependency hygiene rather than a practical runtime exploit.

CI therefore gates the production dependency tree with dev and optional dependencies omitted, while retaining full-tree audit diagnostics. The findings remain tracked as upstream dependency hygiene and must be rechecked when Prisma publishes a patched 7.x release.

## Non-destructive attack coverage

- cross-site state-changing admin requests;
- unauthenticated metrics access;
- authenticated metrics access with the correct token;
- product-permission access to payment-receipt media;
- payment-permission access to payment-receipt media.

No destructive writes, credential attacks, data deletion, or live provider calls are performed.

## Residual deployment checks

The deployed system still requires HTTPS, firewall restrictions, secret management, WhatsApp credential protection, provider webhook secrets, and live provider permission verification.
