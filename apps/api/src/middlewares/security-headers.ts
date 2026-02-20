import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../types/honoAppType";

const API_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

export const apiSecurityHeadersMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  await next();

  c.res.headers.set("Content-Security-Policy", API_CSP);
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API responses are consumed cross-origin by the web app, so CORP must permit it.
  c.res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  const requestUrl = new URL(c.req.url);
  if (requestUrl.protocol === "https:") {
    c.res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
};
