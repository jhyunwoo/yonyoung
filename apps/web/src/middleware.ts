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

const PRIVATE_PATH_PREFIXES = ["/admin", "/auth", "/api/admin", "/api/internal"];
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
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src ${resolveConnectSrc(request)}`,
  ].join("; ");

const hasSessionCookie = (request: NextRequest): boolean => {
  return request.cookies.has("better-auth.session_token");
};

const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isPublicCacheablePath = (pathname: string): boolean => {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_CACHEABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", buildCspHeader(request));

  for (const [header, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  const pathname = request.nextUrl.pathname;
  const isPrivate = isPrivatePath(pathname) || hasSessionCookie(request);
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
