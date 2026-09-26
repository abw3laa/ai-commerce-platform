import type { FastifyRequest } from "fastify";

const UNSAFE_METHODS = new Set(["POST","PUT","PATCH","DELETE"]);

export function isUnsafeAdminRequest(request: FastifyRequest): boolean {
  return request.url.split("?",1)[0].startsWith("/admin/") && UNSAFE_METHODS.has(request.method);
}

export function isCrossSiteRequest(request: FastifyRequest): boolean {
  const fetchSite = request.headers["sec-fetch-site"];
  if (typeof fetchSite === "string" && fetchSite === "cross-site") return true;

  const origin = request.headers.origin;
  if (typeof origin === "string") {
    if (origin === "null") return true;
    try {
      const originUrl = new URL(origin);
      const host = request.headers.host;
      if (!host) return true;
      const forwardedProto = request.headers["x-forwarded-proto"];
      const protocol =
        typeof forwardedProto === "string" && forwardedProto
          ? forwardedProto.split(",", 1)[0]!.trim()
          : request.protocol;
      return originUrl.origin !== `${protocol}://${host}`;
    } catch {
      return true;
    }
  }

  return false;
}
