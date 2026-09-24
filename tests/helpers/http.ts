/**
 * Reproduces what a browser sends back on the next request: just
 * "name=value" from a Set-Cookie response header, dropping the other
 * attributes (Path, Max-Age, HttpOnly, ...).
 */
export function extractCookieHeader(setCookieValue: string | string[] | undefined): string {
  const raw = Array.isArray(setCookieValue) ? setCookieValue[0] : setCookieValue;
  if (!raw) {
    throw new Error("Expected a Set-Cookie header to be present, but none was found.");
  }
  return raw.split(";")[0] ?? "";
}
