import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../types/honoAppType";

const API_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

const API_DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

const resolveCspHeader = (pathname: string) => {
  if (pathname === "/api/docs") {
    return API_DOCS_CSP;
  }

  return API_CSP;
};

export const apiSecurityHeadersMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  await next();

  const requestUrl = new URL(c.req.url);
  c.res.headers.set("Content-Security-Policy", resolveCspHeader(requestUrl.pathname));
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API responses are consumed cross-origin by the web app, so CORP must permit it.
  c.res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  if (requestUrl.protocol === "https:") {
    c.res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
};
