import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { isCrossSiteRequest, isUnsafeAdminRequest } from "./request-protection.js";

describe("request protection", () => {
  it("identifies unsafe admin requests", async () => {
    const app = Fastify();
    app.post("/admin/orders", async (request) => ({
      unsafe: isUnsafeAdminRequest(request),
      crossSite: isCrossSiteRequest(request),
    }));
    const same = await app.inject({
      method: "POST",
      url: "/admin/orders",
      headers: { host: "shop.example", origin: "http://shop.example" },
    });
    expect(same.json()).toEqual({ unsafe: true, crossSite: false });

    const cross = await app.inject({
      method: "POST",
      url: "/admin/orders",
      headers: { host: "shop.example", origin: "https://evil.example" },
    });
    expect(cross.json()).toEqual({ unsafe: true, crossSite: true });
  });

  it("rejects explicit cross-site fetch metadata", async () => {
    const app = Fastify();
    app.patch("/admin/orders/1/status", async (request) => isCrossSiteRequest(request));
    const result = await app.inject({
      method: "PATCH",
      url: "/admin/orders/1/status",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(result.json()).toBe(true);
  });

  it("does not classify safe GET requests as unsafe admin actions", async () => {
    const app = Fastify();
    app.get("/admin/orders", async (request) => isUnsafeAdminRequest(request));
    const result = await app.inject({ method: "GET", url: "/admin/orders" });
    expect(result.json()).toBe(false);
  });
});
