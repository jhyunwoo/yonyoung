# Deployment, cutover, smoke tests, and rollback

## Independent build and deployment

### Web / Dokploy / Nixpacks

Use the monorepo root as the Git/build context so the lockfile and internal
packages are available.

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
pnpm --filter @yonyoung/api deploy
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
- set deploy command to `pnpm --filter @yonyoung/api deploy` (or make
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
3. Confirm contract checks, web production build, Wrangler production dry-run, and no Drizzle migration change.
4. Confirm all dashboard settings above and deploy to staging when available.
5. Smoke-test staging without unnecessary data mutation.
6. Deploy the API only if its affected graph requires it; inspect Worker logs and smoke-test it.
7. Deploy the web only if its affected graph requires it; inspect server/browser logs and smoke-test it.
8. Verify authentication/OAuth, admin authorization, uploads/R2, cache behavior, and that no D1 migration ran.
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
