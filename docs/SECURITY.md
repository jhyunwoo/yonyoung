# SECURITY

## Scope
- Monorepo apps:
  - `apps/web` (Next.js 16 on OpenNext Cloudflare Worker)
  - `apps/api` (Hono on Cloudflare Workers)
- Data/services:
  - Better Auth session cookies
  - Cloudflare D1 via Drizzle ORM
  - Cloudflare R2 upload pipeline (presigned + multipart)

## Threat Model Summary

### 1) Session/Auth
- Entry points: `/api/auth/*`, admin pages, admin API actions.
- Primary risks: session hijack, CORS misconfiguration, missing route authz.
- Controls:
  - CORS middleware registered before API routes; allowed origins are explicit and env-driven (`BETTER_AUTH_TRUSTED_ORIGINS`).
  - Session extraction middleware + per-route authz checks (deny-by-default via `requireActor` + role checks).
  - Security headers on API + web responses.
  - `better-auth.session_token` responses are marked private/no-store on personalized web paths.

### 2) D1 Data Access
- Entry points: API CRUD modules in `apps/api/src/modules/*`.
- Primary risks: auth bypass, unsafe updates, write conflicts.
- Controls:
  - Service layer in `apps/api/src/lib/services/*` with typed methods; routes enforce actor/permission checks before service calls.
  - Shared DB factory cache (`apps/api/src/lib/db/factory.ts`) for consistent D1 access patterns.
  - Batched write optimization for multi-image insert paths to reduce partial write risk windows.

### 3) R2 Upload Pipeline
- Entry points: `/api/*/presign/*` and multipart endpoints.
- Primary risks: oversized uploads, unsupported types, unauthorized object ownership changes.
- Controls:
  - Auth required on all upload issue/complete/abort endpoints.
  - Content-type allowlist, explicit size limits, and multipart limits.
  - Multipart part/complete/abort endpoints enforce object ownership (`actorId` in key path).
  - Missing storage configuration handled with safe error responses.

### 4) Cache Layers (Cloudflare + OpenNext)
- Primary risks: cross-user cache leakage, stale sensitive responses.
- Controls:
  - Web middleware applies private/no-store on personalized/admin/internal paths.
  - Public pages explicitly receive cache headers; immutable static assets left to Next immutable policy.
  - API public cache helper is limited to public endpoints only.
  - Cache verification script validates no-store/private on personalized routes and immutable/public headers.

## OWASP Checklist (Top 10 aligned)
- A01 Broken Access Control: per-route actor + role checks, deny-by-default.
- A02 Cryptographic Failures: cookie/session handled by Better Auth; no custom crypto introduced.
- A03 Injection: typed validation on route inputs; Drizzle ORM query builder usage.
- A04 Insecure Design: threat model + explicit cache safety rules + upload ownership checks.
- A05 Security Misconfiguration: baseline security headers, explicit CORS, no permissive wildcard origins.
- A06 Vulnerable Components: dependency updates via lockfile and CI quality gate.
- A07 Identification & Authentication Failures: Better Auth session validation + protected admin APIs.
- A08 Software/Data Integrity Failures: migration workflow + typed contracts + CI gates.
- A09 Security Logging & Monitoring Failures: structured JSON logs with requestId/status/latency and header redaction.
- A10 SSRF: no generic user-supplied server-side fetch proxy endpoints added.

## ASVS High-Level Coverage (v5-style)
- V1 Architecture/Threat: documented boundaries and attack surfaces.
- V2 Auth: authenticated route checks + role-based access control.
- V3 Session: session cookie-based access with secure defaults.
- V4 Access Control: explicit authorization checks on sensitive endpoints.
- V5 Validation/Sanitization: schema validation + content-type/size checks.
- V8 Data Protection: no sensitive headers/cookies logged.
- V9 Communication: CORS and transport security headers.
- V14 Configuration: environment-bound origin and auth config resolution.

## Security Headers Implemented
- Web (`apps/web/src/middleware.ts`):
  - `Content-Security-Policy`
  - `Strict-Transport-Security` (HTTPS requests)
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-Frame-Options`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
- API (`apps/api/src/middlewares/security-headers.ts`):
  - `Content-Security-Policy` (API-safe policy)
  - `Strict-Transport-Security` (HTTPS requests)
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-Frame-Options`

## Secrets & Logging Policy
- Request logger only logs safe header subset (`user-agent`, `content-type`, `cf-*`) and never cookie/token headers.
- API errors are normalized via error handler; sensitive internals are not returned to clients.

## CORS Policy
- CORS middleware is mounted before route registration in API app initialization.
- Allowed origins are explicit and environment-based (`BETTER_AUTH_TRUSTED_ORIGINS` + auth base URL).

## Verification Commands
- `pnpm lint`
- `pnpm check-types`
- `pnpm api:test`
- `pnpm api:test:integration`
- `pnpm verify:cache --baseUrl=http://127.0.0.1:3000`
