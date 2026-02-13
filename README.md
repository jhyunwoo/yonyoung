# Yonyoung Monorepo

연세대학교 중앙사진동아리 연영회 웹/서버 모노레포.

## Stack

- Monorepo: Turborepo + pnpm
- Web: Next.js 16 App Router, Tailwind CSS v4, Framer Motion, Better Auth client, Storybook
- API: Hono + Cloudflare Workers, Better Auth server
- Storage: Cloudflare D1 + R2 + KV
- Test: Vitest + Playwright

## Workspace

- `/Users/jhyunwoo/projects/yonyoung/apps/web`
- `/Users/jhyunwoo/projects/yonyoung/apps/api`
- `/Users/jhyunwoo/projects/yonyoung/packages/contracts`
- `/Users/jhyunwoo/projects/yonyoung/packages/schemas`
- `/Users/jhyunwoo/projects/yonyoung/packages/db`
- `/Users/jhyunwoo/projects/yonyoung/packages/auth`
- `/Users/jhyunwoo/projects/yonyoung/packages/ui`

## Quick Start

1. 의존성 설치

```bash
pnpm install
```

2. 환경 변수 준비

```bash
cp .env.example .env
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

3. D1 마이그레이션 SQL 실행 (로컬)

```bash
pnpm --filter @yonyoung/api wrangler d1 execute yonyoung-db --local --file ../../packages/db/sql/0001_init.sql
```

4. (선택) 프리뷰 JSON 기반 시드 SQL 생성 후 실행

```bash
pnpm --filter @yonyoung/db seed > /tmp/yonyoung-seed.sql
pnpm --filter @yonyoung/api wrangler d1 execute yonyoung-db --local --file /tmp/yonyoung-seed.sql
```

5. 개발 서버

- API: `pnpm --filter @yonyoung/api dev`
- Web: `pnpm --filter @yonyoung/web dev`

## Quality Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Deployment

### API Worker

```bash
pnpm --filter @yonyoung/api deploy
```

### Web Worker (OpenNext)

```bash
pnpm --filter @yonyoung/web deploy
```

GitHub Actions 워크플로는 다음 경로에 구성되어 있습니다.

- `/Users/jhyunwoo/projects/yonyoung/.github/workflows/ci.yml`
- `/Users/jhyunwoo/projects/yonyoung/.github/workflows/deploy.yml`

## Notes

- 프리뷰 자산은 `/Users/jhyunwoo/projects/yonyoung/yonyoung-web-preview`를 참조합니다.
- 웹 앱 `public/images`는 프리뷰 이미지 디렉터리를 심볼릭 링크로 연결했습니다.
- 관리자 로그인은 `/admin/login`에서 Google + Passkey를 지원합니다.
