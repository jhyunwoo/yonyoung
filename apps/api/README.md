# API (Hono + Better Auth + Drizzle + Cloudflare Workers)

## Overview

This API uses:

- Hono on Cloudflare Workers
- Drizzle ORM with Cloudflare D1
- Better Auth (`/api/auth/*`)
- Google OAuth
- Passkey (WebAuthn)

## Auth Endpoints

Better Auth is mounted at:

- `/api/auth/*`

Common flows include:

- `/api/auth/sign-in/social`
- `/api/auth/callback/google`
- `/api/auth/sign-in/passkey`
- `/api/auth/passkey/add-passkey`

## Environment Variables

Copy `.dev.vars` for local development and set real values.

Required runtime variables:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PASSKEY_RP_ID`
- `PASSKEY_RP_NAME`
- `PASSKEY_ORIGIN`
- `BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED` (optional, default `false`; set `true` for E2E email sign-in)
- `DOCS_AUTH_IN_PROD` (optional, default `false`; set `true` to require auth for `/api/docs` and `/api/openapi.json`)
- `R2_S3_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

Required for Drizzle migration scripts:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_TOKEN`

## Google OAuth Setup

Create OAuth credentials in Google Cloud Console and register this redirect URI:

```txt
https://<api-domain>/api/auth/callback/google
```

Local example:

```txt
http://localhost:8787/api/auth/callback/google
```

## Passkey Setup Rules

- `PASSKEY_RP_ID` should be the effective top-level domain (for example `example.com`).
- `PASSKEY_ORIGIN` should be the API origin without a trailing slash (for example `https://api.example.com`).
- For local development, `localhost` is valid.

## R2 Presigned Upload Setup

This API issues AWS S3 compatible presigned `PUT` URLs for Cloudflare R2.

- `R2_S3_ENDPOINT`: `https://<account-id>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID`: R2 API token Access Key
- `R2_SECRET_ACCESS_KEY`: R2 API token Secret Key
- `R2_BUCKET`: target bucket name
- `R2_PUBLIC_BASE_URL`: public CDN/base URL used to store image URL in DB

## CRUD Endpoints

Protected resources (all require auth session):

- `/api/generations`
- `/api/activities`
- `/api/supporters`
- `/api/exhibitions`
- `/api/linktree`
- `/api/users`

Presigned upload endpoints:

- `POST /api/activities/presign/cover`
- `POST /api/activities/presign/detail`
- `POST /api/exhibitions/presign/cover`
- `POST /api/exhibitions/presign/detail`
- `POST /api/supporters/presign/logo`
- `POST /api/users/presign/profile`

## API Docs

OpenAPI docs are generated with `@hono/zod-openapi` for internal APIs and merged with Better Auth OpenAPI.

- `GET /api/openapi.json` (`DOCS_AUTH_IN_PROD=true`일 때 auth required)
- `GET /api/docs` (`DOCS_AUTH_IN_PROD=true`일 때 auth required)

Better Auth schema endpoint is also protected:

- `GET /api/auth/open-api/generate-schema` (auth required)

## User Permission Note

- Member-like roles (`new_member`, `associate_member`, `regular_member`) can only read their own user data.
- Member-like roles can update/delete only their own profile.

## Local Development

```txt
pnpm install
pnpm --filter api dev
```

## Generate Auth Schema and Migrations

Generate Better Auth Drizzle schema:

```txt
cd apps/api
pnpm dlx @better-auth/cli@latest generate --config src/auth.ts --output src/db/schema.ts --yes
```

Generate Drizzle migration files:

```txt
pnpm run db:generation
```

Apply migrations:

```txt
pnpm run db:migrate
```

## Type Generation

Generate Worker binding types after changing `wrangler.jsonc`:

```txt
pnpm run cf-typegen
```

## Cloudflare Secrets

Set secrets with Wrangler:

```txt
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

Non-sensitive auth config is defined in `wrangler.jsonc` under `vars`.
`DOCS_AUTH_IN_PROD`는 저장소 기본값 대신 Cloudflare 대시보드/CI 환경변수에서 배포 환경에만 `true`로 설정하는 것을 권장합니다.

For deployment, set `BETTER_AUTH_URL` to the public API origin (for example `https://api.example.com`) so Better Auth `baseURL` is explicitly resolved from runtime environment variables.
