import type { FastifyInstance } from "fastify";
import { createAuthGuard } from "../auth/auth-guard.js";
import type { AuthRepositories } from "../auth/types.js";
import type { AuthorizationRepository } from "../auth/authorization-types.js";

export interface AdminDashboardRoutesOptions {
  deps: AuthRepositories;
  authorizationRepo: AuthorizationRepository;
  isProduction: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDashboard(email: string, permissions: string[]): string {
  const permissionItems = permissions.length
    ? permissions
        .map(
          (permission) =>
            `<li><code>${escapeHtml(permission)}</code></li>`,
        )
        .join("")
    : "<li>No permissions assigned</li>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Commerce — Admin Dashboard</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 20px 48px; }
    header { display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .muted { opacity: .7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 24px; }
    .card { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; padding: 18px; }
    .card h2 { margin: 0 0 10px; font-size: 17px; }
    ul { margin: 0; padding-left: 20px; }
    li + li { margin-top: 7px; }
    code { font-size: .9em; }
    form { margin: 0; }
    button { border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); background: Canvas; color: CanvasText; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    .status { display: inline-flex; gap: 8px; align-items: center; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #20a05a; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Admin Dashboard</h1>
        <div class="muted">AI Commerce &amp; Automation Platform</div>
      </div>
      <form method="post" action="/admin/logout">
        <button type="submit">Log out</button>
      </form>
    </header>

    <section class="grid" aria-label="Dashboard overview">
      <article class="card">
        <h2>Account</h2>
        <p>${escapeHtml(email)}</p>
        <div class="status"><span class="dot" aria-hidden="true"></span>Authenticated</div>
      </article>

      <article class="card">
        <h2>Platform</h2>
        <p>Core API is running.</p>
        <p class="muted">Products, orders, WhatsApp and AI modules are not part of this task.</p>
      </article>

      <article class="card">
        <h2>Permissions</h2>
        <ul>${permissionItems}</ul>
      </article>
    </section>
  </main>
</body>
</html>`;
}

export async function adminDashboardRoutes(
  app: FastifyInstance,
  options: AdminDashboardRoutesOptions,
): Promise<void> {
  const authGuard = createAuthGuard({
    ...options.deps,
    isProduction: options.isProduction,
  });

  app.get("/dashboard", { preHandler: authGuard }, async (request, reply) => {
    const admin = request.adminUser;
    if (!admin) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const permissions =
      await options.authorizationRepo.getPermissionKeysForAdmin(admin.id);

    reply.header(
      "content-security-policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",
    );
    reply.header("cache-control", "no-store");
    return reply.type("text/html; charset=utf-8").send(
      renderDashboard(admin.email, permissions),
    );
  });
}
