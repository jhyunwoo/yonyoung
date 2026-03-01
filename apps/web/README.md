# OpenNext Starter

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Read the documentation at https://opennext.js.org/cloudflare.

## Develop

Run the Next.js development server:

```bash
npm run dev
# or similar package manager command
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Auth Environment Variables

Set the following environment variables in `.env.local` (or your runtime environment):

```bash
AUTH_API_URL=http://localhost:8787
NEXT_PUBLIC_AUTH_API_URL=http://localhost:8787
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<web-push-public-key>
```

Better Auth client/server URL resolution:

- Better Auth client (`createAuthClient`) uses `NEXT_PUBLIC_AUTH_API_URL`.
- Server-side auth/public API calls use `AUTH_API_URL` first, then `NEXT_PUBLIC_AUTH_API_URL`.
- In production, `NEXT_PUBLIC_AUTH_API_URL` must be configured explicitly.
- 연영장터 댓글 알림(웹푸시)을 사용하려면 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`를 함께 설정해야 합니다.

For Cloudflare deployment, register both values in `apps/web/wrangler.jsonc` under `vars` (or in the Cloudflare dashboard environment variables) instead of passing inline terminal values during deploy.

연영장터 알림은 `public/market-sw.js` 서비스워커를 통해 표시되며, 클릭 시 `/dashboard/market`으로 이동합니다.

## E2E Environment Variables (Playwright)

E2E tests auto-load environment variables with this priority:

1. already-injected `process.env` (CLI/CI)
2. `tests/e2e/.env.e2e.local`
3. `tests/e2e/.env.e2e`
4. `.env.local` and other default Next env files (fallback)

Setup:

```bash
cp tests/e2e/.env.e2e.example tests/e2e/.env.e2e
```

Required keys:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

Optional keys:

- `E2E_BASE_URL` (default: `http://localhost:3000`)
- `E2E_API_URL` (default: `http://localhost:8787`)
- `E2E_D1_DATABASE_NAME` (default: `yonyoung-db`)
- `E2E_D1_ALLOW_REMOTE_FALLBACK` (default: `false`, 로컬 D1 실패 시 원격 D1 fallback 허용)
- `E2E_WORKERS` (default: CI=`2`, local=`CPU cores / 2`)

`E2E_ADMIN_*` 계정은 반드시 `president` 권한이어야 합니다.

API(`apps/api`)에서도 email/password 로그인이 활성화되어야 합니다.

- `apps/api/.dev.vars`에 `BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED=true` 설정
- API 서버 재시작

### E2E Timeout Troubleshooting

If `global-setup.ts` fails with a timeout on `/api/auth/sign-in/email`, check whether the API worker is stuck.

Quick checks:

- `http://localhost:8787/health` should respond immediately
- If it hangs, inspect `apps/api` dev logs
- A common local cause is Wrangler remote proxy startup failure (`Failed to start the remote proxy session`)

## Preview

Preview the application locally on the Cloudflare runtime:

```bash
npm run preview
# or similar package manager command
```

## UX Performance Metrics (Terminal)

웹 사용자 경험에 직접적인 영향을 주는 Core Web Vitals(LCP/INP/CLS/FCP/TTFB)를 터미널에서 확인할 수 있습니다.

```bash
# 루트에서 실행
pnpm perf:web:ux

# 커스텀 대상
pnpm perf:web:ux --baseUrl=http://127.0.0.1:3000 --routes=/,/archive/records,/about
```

## Deploy

Deploy the application to Cloudflare:

```bash
npm run deploy
# or similar package manager command
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
