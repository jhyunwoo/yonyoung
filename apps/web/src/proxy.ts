import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATIC_SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0";
const PUBLIC_CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=300";
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

const PRIVATE_PATH_PREFIXES = ["/dashboard", "/admin", "/auth", "/api/admin", "/api/internal"];
const PRIVATE_AUTH_REDIRECT_PREFIXES = ["/dashboard", "/admin"];
const PUBLIC_CACHEABLE_PREFIXES = ["/archive", "/about", "/donate", "/linktree"];

const resolveOriginFromUrl = (input: string | undefined): string | null => {
  if (!input) {
    return null;
  }

  try {
    return new URL(input).origin;
  } catch {
    return null;
  }
};

const resolveConnectSrc = (request: NextRequest): string => {
  const sources = new Set<string>(["'self'"]);
  const apiOrigin = resolveOriginFromUrl(process.env.NEXT_PUBLIC_AUTH_API_URL);
  if (apiOrigin) {
    sources.add(apiOrigin);
  }

  if (process.env.NODE_ENV === "production") {
    sources.add("https:");
    sources.add("wss:");
  } else {
    sources.add("http:");
    sources.add("https:");
    sources.add("ws:");
    sources.add("wss:");
  }

  if (request.nextUrl.protocol === "http:") {
    sources.add(`http://${request.nextUrl.host}`);
  } else {
    sources.add(`https://${request.nextUrl.host}`);
  }

  return Array.from(sources).join(" ");
};

const buildCspHeader = (request: NextRequest): string =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src ${resolveConnectSrc(request)}`,
  ].join("; ");

const isCspReportOnlyEnabled = (): boolean => {
  const value = process.env.CSP_REPORT_ONLY;
  if (value) {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return process.env.NODE_ENV !== "production";
};

const hasSessionCookie = (request: NextRequest): boolean => {
  return request.cookies.getAll().some((cookie) =>
    SESSION_COOKIE_NAMES.some(
      (name) => cookie.name === name || cookie.name.startsWith(`${name}.`),
    ),
  );
};

const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const shouldRedirectToSignIn = (pathname: string): boolean =>
  PRIVATE_AUTH_REDIRECT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const isPublicCacheablePath = (pathname: string): boolean => {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_CACHEABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

const applySecurityHeaders = (
  response: NextResponse,
  request: NextRequest,
): void => {
  const csp = buildCspHeader(request);
  if (isCspReportOnlyEnabled()) {
    response.headers.set("Content-Security-Policy-Report-Only", csp);
    response.headers.delete("Content-Security-Policy");
  } else {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.delete("Content-Security-Policy-Report-Only");
  }

  for (const [header, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiresSessionForRedirect = shouldRedirectToSignIn(pathname);
  const hasSession = requiresSessionForRedirect
    ? hasSessionCookie(request)
    : false;

  if (requiresSessionForRedirect && !hasSession) {
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    applySecurityHeaders(redirectResponse, request);
    redirectResponse.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    return redirectResponse;
  }

  const response = NextResponse.next();

  applySecurityHeaders(response, request);

  const isPrivate = isPrivatePath(pathname);
  if (isPrivate) {
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  } else if (isPublicCacheablePath(pathname)) {
    response.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|theme-init.js).*)",
  ],
};
