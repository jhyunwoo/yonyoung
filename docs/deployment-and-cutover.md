# Deployment, cutover, smoke tests, and rollback

## Independent build and deployment

### Web / Dokploy / Nixpacks

Use the monorepo root as the Git/build context so the lockfile and internal
packages are available.

The root `nixpacks.toml` installs Corepack 0.34.6 before dependency installation
and puts it first on `PATH`. Nixpacks 1.41's bundled Corepack 0.34.0 cannot
launch pnpm 12; newer Corepack 0.35+ requires a newer Node version than the
image's Node 24.10. Keep the setup phase enabled even when Dokploy overrides
the install/build/start commands.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@yonyoung/web...
pnpm --filter @yonyoung/web start
```

The build and runtime both require the existing web environment variables,
including `API_BASE_URL`. Do not configure `apps/web` as an isolated build
context. `turbo prune` was not made part of the Dokploy path because the current
Nixpacks deployment consumes the complete workspace directly. It is used for
the API production-dependency audit, where a pruned graph materially improves
scope. Evaluate a pruned Docker context only if deployment is converted to an
owned Dockerfile and measure the resulting layer/build-context improvement.

### API / Cloudflare

From the monorepo root:

```bash
pnpm --filter @yonyoung/api deploy:dry-run
pnpm --filter @yonyoung/api run deploy
```

pnpm executes Wrangler in `apps/api`, preserving all relative config, asset and
migration paths. The Wrangler `name` remains `yonyoung-api`; changing the npm
package name must never be confused with changing Worker identity.

## Deployment impact

Use the package graph, not hand-maintained package assumptions:

```bash
pnpm turbo ls --affected --output=json
pnpm turbo run build --affected --dry
```

- web source change: build/deploy web;
- API source change: dry-run/deploy API;
- contracts change: build/deploy both consumers;
- docs-only change: no application deployment.

Production deployment and remote D1 migration remain explicit, auditable
operations. No root build, CI build, or deployment command implicitly applies a
remote migration.

## External dashboard checklist

These settings cannot be inferred from Git and must be confirmed during cutover.

### Cloudflare Workers

- connect `jhyunwoo/yonyoung` and the intended production branch;
- set root directory/build context to the monorepo root;
- set deploy command to `pnpm --filter @yonyoung/api run deploy` (or make
  `apps/api` the command working directory with equivalent behavior);
- confirm Wrangler config location `apps/api/wrangler.jsonc`;
- replace any stale build token without changing the Worker;
- confirm all secrets remain set on the existing Worker;
- compare D1, KV, R2, Analytics Engine and rate-limit bindings with the config;
- confirm Worker routes and custom domains still target `yonyoung-api`;
- confirm the `PublicApi` entrypoint remains available and caching is enabled.

### Dokploy / Nixpacks

- connect `jhyunwoo/yonyoung` and the intended branch;
- set repository root as build context/root directory;
- use the root install and filtered web build/start commands above;
- carry forward every existing web environment variable and domain;
- preserve health checks, deployment webhook, volumes and `.next/cache` decision;
- verify the deployment trigger includes `apps/web` and its internal dependencies.

### Pending data migration

- `0010_release_deleted_user_identities` is a data-only migration (no schema
  change). It releases the email and Google account link of users who were
  deleted before deletion started doing so, which lets those members sign in
  again as a new, unverified account. Apply it with the normal, explicit
  `pnpm db:migrate:remote` step; it is never run as a build side effect and is
  safe to re-run.

### Optional operational settings

These are off by default; the service behaves as before until they are set.

- **Visitor IP for page-view rate limiting.** Browsers reach the API through
  the web BFF, so without this every visitor shares the web server's IP and
  one 30/min page-view bucket. Generate one random value (32+ characters) and
  set it as the Worker secret `PROXY_CLIENT_IP_SECRET`
  (`wrangler secret put PROXY_CLIENT_IP_SECRET`) and as the Dokploy web
  environment variable of the same name. The API only trusts the forwarded
  IP when the values match.
- **R2 orphan cleanup.** A daily cron (`17 18 * * *` UTC, 03:17 KST) scans R2
  for uploads no longer referenced by any row. It runs in dry-run mode and only
  logs `r2.orphan_sweep.completed` with counts and sample keys. After reviewing
  a few dry-run logs, set `R2_ORPHAN_SWEEP_ENABLED=true` (Worker var or
  secret) to delete up to 200 objects per run. Objects uploaded within 7 days,
  and objects referenced by rows soft-deleted within 30 days, are always kept.
  `env.dev` disables the cron because it currently shares production D1/R2.

### GitHub

- update branch protection to require the stable `Quality gates`,
  `E2E (Chromium)`, and `API runtime` checks after observing them on a PR;
- move/recreate repository and environment secrets for the monorepo;
- add `TURBO_TOKEN`/`TURBO_TEAM` only if remote caching is available;
- update deployment webhooks/integrations from both former repositories;
- retain the old repositories and their settings until rollback validation.

## Cutover sequence

1. Record the exact previous web/API commits, deployment settings, repository URLs and D1 migration state.
2. Validate a clean frozen-lockfile install and the complete local/CI matrix.
3. Confirm contract checks, web production build, Wrangler production dry-run, and no Drizzle migration change (the MCP release is the exception: it adds migration 0012, see the MCP deployment checklist).
4. Confirm all dashboard settings above and deploy to staging when available.
5. Smoke-test staging without unnecessary data mutation.
6. Deploy the API only if its affected graph requires it; inspect Worker logs and smoke-test it.
7. Deploy the web only if its affected graph requires it; inspect server/browser logs and smoke-test it.
8. Verify authentication/OAuth, admin authorization, uploads/R2, cache behavior, and that no D1 migration ran (except 0012 when deploying the MCP release; see the MCP deployment checklist).
9. Verify GitHub Actions from a clean PR/checkout.
10. Mark old repositories as migrated only after the observation window and rollback drill.

## Production smoke tests

Web checks: homepage, public archive/exhibition/photographer/recruiting/donate and
linktree routes, static assets, image transformations, sign-in page, BFF/auth
proxy, protected dashboard, responsive/accessibility basics, browser console and
server logs.

Auth checks: sign-in, OAuth redirect/callback, pending/unverified behavior,
session restoration, logout, protected routes, cookie flags and proxy
`Set-Cookie` behavior.

API checks: liveness/readiness according to access policy, public and
authenticated routes, environment-specific OpenAPI policy, D1 reads, a safe
authorized write only when approved, R2 access, rate limiting, public cache
isolation and logs. Avoid production data mutation when a read-only check is
sufficient.

## MCP 배포 체크리스트

1. API 원격 마이그레이션: `pnpm db:migrate:remote` (`0012_dashboard_mcp.sql`, `0013_drop_mcp_uploads.sql`). API 배포보다 먼저 한다. `createAuth()`가 isolate마다 처음 인증 인스턴스를 만들 때 `oauth_resource`를 읽고 넣으므로, 마이그레이션 없이 배포하면 인증이 실패한다.
2. `apps/api/wrangler.jsonc` vars 확인: `MCP_RESOURCE_URL=https://api.yonyoung.moveto.kr/mcp`, `MCP_AUTH_ISSUER=https://yonyoung.yonsei.ac.kr/api/auth`.
3. Better Auth CLI는 `apps/api/src/lib/auth-cli.ts`를 지정해 실행한다.
4. API 배포: `pnpm deploy:api`. 배포 전 `pnpm deploy:dry-run`으로 번들 크기를 확인한다(Workers 한도 이내).
5. 웹 배포: `/.well-known/oauth-authorization-server/api/auth`가 200과 `issuer: https://yonyoung.yonsei.ac.kr/api/auth`를 돌려주는지 확인한다.
6. 스모크:
   - `curl -i https://api.yonyoung.moveto.kr/.well-known/oauth-protected-resource/mcp` → 200, `authorization_servers`가 issuer와 같다.
   - `curl -i -X POST https://api.yonyoung.moveto.kr/mcp` → 401, `WWW-Authenticate`에 `resource_metadata` 포함.
7. 되돌리기: API를 이전 버전으로 롤백해도 새 테이블은 남아도 무해하다. 웹 롤백 시 `/dashboard/mcp` 메뉴만 사라진다.

### 배포 후 확인

dev 또는 프로덕션 배포 뒤 부원 계정과 회장 계정으로 각각 확인한다. 결과는 PR 설명에 표로 남긴다.

| 확인                                                   | Claude | ChatGPT |
| ------------------------------------------------------ | ------ | ------- |
| 커넥터 추가 → Google 로그인 → 동의 → 연결              |        |         |
| `whoami`가 역할과 도구 수를 맞게 알려줌                |        |         |
| 부원: 삭제 도구가 보이지 않음                          |        |         |
| 회장: 활동을 만들고 받은 dashboard_url에서 사진 업로드 |        |         |
| 회장: 삭제 전에 클라이언트가 확인을 요청함             |        |         |
| `/dashboard/mcp`에서 연결 해제 → 다음 호출이 401       |        |         |

- 안내 페이지의 메뉴 이름이 실제 화면과 다르면 `apps/web/app/(dashboard)/dashboard/mcp/mcp-guide-sections.tsx` 문구를 고치고 `GUIDE_VERIFIED_ON`을 갱신한다.

## Rollback plan

Before cutover, record:

- former web and API repository URLs and exact commits;
- previous Dokploy repository/branch/root/build/start/environment/domain settings;
- previous Cloudflare repository/branch/build token/command and Worker routes;
- current Worker version/configuration and all resource bindings;
- current D1 migration list/checksum state.

Because this migration creates no database migration, rollback is application
only: restore the former Worker build/deployment at the recorded API commit,
restore Dokploy to the recorded web commit/settings, verify health and auth, and
then revert repository integrations. Never delete or rewrite the former
repositories during the rollback window.
