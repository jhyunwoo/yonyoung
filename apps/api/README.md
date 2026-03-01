# API (Hono + Better Auth + Drizzle + Cloudflare Workers)

## Overview

This API uses:

- Hono on Cloudflare Workers
- Drizzle ORM with Cloudflare D1
- Better Auth (`/api/auth/*`)
- Google OAuth

## Auth Endpoints

Better Auth is mounted at:

- `/api/auth/*`

Common flows include:

- `/api/auth/sign-in/social`
- `/api/auth/callback/google`

## Environment Variables

Copy `.dev.vars` for local development and set real values.

Required runtime variables:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED` (optional, default `false`; set `true` for E2E email sign-in)
- `DOCS_AUTH_IN_PROD` (optional, default `false`; set `true` to require auth for `/api/docs` and `/api/openapi.json`)
- `R2_S3_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `VAPID_PUBLIC_KEY` (웹푸시 공개 키)
- `VAPID_PRIVATE_KEY` (웹푸시 비공개 키, Wrangler secret 권장)
- `VAPID_SUBJECT` (예: `mailto:admin@example.com`)

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
- `/api/exhibitions`
- `/api/linktree`
- `/api/users`
- `/api/market/items`
- `/api/market/comments`
- `/api/market/push-subscriptions`

Presigned upload endpoints:

- `POST /api/activities/presign/cover`
- `POST /api/activities/presign/detail`
- `POST /api/exhibitions/presign/cover`
- `POST /api/exhibitions/presign/detail`
- `POST /api/users/presign/profile`
- `POST /api/market/presign/image`
- `POST /api/market/multipart/image/init`

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

## API UX Performance Metrics (Terminal)

사용자 체감 품질에 영향을 주는 응답 지연(P50/P95/P99), 처리량(RPS), 5xx 오류율을 터미널에서 확인할 수 있습니다.

```bash
# 루트에서 실행
pnpm perf:api:ux

# 커스텀 대상
pnpm perf:api:ux --baseUrl=http://127.0.0.1:8787 --endpoints=/health,/api/public/activities --requests=240 --concurrency=12
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

`db:migrate`와 `db:push`는 로컬 D1(`--local`)에 기본 적용됩니다. 원격(배포) D1에 적용할 때는 명시적으로 아래 명령을 사용하세요.

```txt
pnpm run db:migrate:remote
pnpm run db:push:remote
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
