# Web App (Next.js on Vercel)

`apps/web`는 Next.js 16 App Router 기반 프론트엔드이며, 배포 타겟은 Vercel입니다.

## Local Development

```bash
# repo root
pnpm web:dev
```

기본 주소: `http://localhost:3000`

## Runtime Environment Variables

로컬(`.env.local`)과 Vercel Project Environment Variables에 아래 값을 설정합니다.

- `AUTH_API_URL`
- `NEXT_PUBLIC_AUTH_API_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `CSP_REPORT_ONLY`
- `REVALIDATE_SECRET`

인증 URL 해석 규칙:

- 클라이언트(Better Auth client): `NEXT_PUBLIC_AUTH_API_URL` 사용
- 서버 사이드 호출: `AUTH_API_URL` 우선, 없으면 `NEXT_PUBLIC_AUTH_API_URL` 사용

연영장터 알림은 `public/market-sw.js` 서비스워커를 통해 표시되며, 클릭 시 `/dashboard/market`으로 이동합니다.

## Vercel Deployment (Git Integration)

이 프로젝트는 Vercel CLI 직접 배포가 아니라 **Git 연동 배포**를 기준으로 운영합니다.

Vercel 프로젝트 설정:

- Root Directory: `apps/web`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Production Branch: `main`

참고:

- `pnpm --filter web deploy`는 로컬 빌드 검증 용도입니다.
- 실제 배포는 `main`/PR 푸시 시 Vercel에서 자동 수행됩니다.

## Domain & Auth Notes

기본 운영 정책은 기존 프로덕션 도메인(`yonyoung.moveto.kr`)을 Vercel에 연결해 유지하는 것입니다.

Vercel Preview(`*.vercel.app`)에서 로그인/인증 테스트가 필요하면 API(`apps/api`)의
`BETTER_AUTH_TRUSTED_ORIGINS` 및 CORS 허용 목록에 preview origin을 추가해야 합니다.

## E2E Environment Variables (Playwright)

E2E 테스트 환경 변수 우선순위:

1. 이미 주입된 `process.env` (CLI/CI)
2. `tests/e2e/.env.e2e.local`
3. `tests/e2e/.env.e2e`
4. `.env.local` 및 Next 기본 env 파일

초기 설정:

```bash
cp tests/e2e/.env.e2e.example tests/e2e/.env.e2e
```

필수 키:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

선택 키:

- `E2E_BASE_URL` (기본: `http://localhost:3000`)
- `E2E_API_URL` (기본: `http://localhost:8787`)
- `E2E_D1_DATABASE_NAME` (기본: `yonyoung-db`)
- `E2E_D1_ALLOW_REMOTE_FALLBACK` (기본: `false`)
- `E2E_WORKERS` (기본: CI=`2`, local=`CPU cores / 2`)

`E2E_ADMIN_*` 계정은 `president` 권한이어야 합니다.

## Performance (Terminal)

```bash
# repo root
pnpm perf:web:ux

# custom
pnpm perf:web:ux --baseUrl=http://127.0.0.1:3000 --routes=/,/archive/records,/about
```
