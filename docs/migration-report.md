# Enterprise Turborepo migration report

Date: 2026-08-22  
Migration branch: `migration/enterprise-turborepo`  
Destination: `jhyunwoo/yonyoung`

## Outcome

The two source repositories are represented by one pnpm 11 / Turborepo 2
workspace. The Next.js web/BFF and Hono Cloudflare Worker remain independently
owned, started, tested, built, and deployed. The repository adds narrow shared
contract and configuration boundaries without moving authorization, storage,
database, proxy, or framework implementation across application boundaries.

Production deployment and dashboard cutover were deliberately not performed
during repository validation. No Dokploy/staging access was available, and an
unpaired API production deployment would not be a safe verification substitute.
The exact external changes, staged smoke tests, and rollback procedure remain in
[`deployment-and-cutover.md`](./deployment-and-cutover.md).

## Resulting structure

```text
.
|-- apps
|   |-- web                    # @yonyoung/web: Next.js 16 + browser-facing BFF
|   |   |-- app
|   |   |-- components
|   |   |-- features
|   |   |-- server
|   |   |-- shared
|   |   |-- tests
|   |   |-- public
|   |   `-- scripts
|   `-- api                    # @yonyoung/api: Hono Cloudflare Worker
|       |-- src
|       |-- tests
|       |-- drizzle
|       |-- public
|       `-- scripts
|-- packages
|   |-- contracts             # @yonyoung/contracts
|   |-- eslint-config         # @yonyoung/eslint-config
|   `-- typescript-config     # @yonyoung/typescript-config
|-- tooling                   # boundary, audit, and deterministic build harnesses
|-- docs
|-- .github/workflows
|   |-- ci.yml
|   `-- api-runtime.yml
|-- package.json
|-- pnpm-workspace.yaml
|-- pnpm-lock.yaml
`-- turbo.json
```

There is one workspace root and one lockfile. No app contains a nested lockfile
or workspace definition.

## History preservation

The authoritative source tips were:

- web `main`: `67a3412`;
- API `main`: `df0da44`.

Temporary clones were rewritten with `git filter-repo
--to-subdirectory-filter`, merged without rewriting either source repository,
and then connected to the destination ancestry. Source checkouts remain at
`/home/coder/projects/yonyoung-source-repositories` for the migration window.

History queries retain useful file context:

```bash
git log --follow -- apps/web/next.config.ts
git log --follow -- apps/api/wrangler.jsonc
```

The structural history/import commits are documented in
[`migration-history.md`](./migration-history.md).

## Architecture decisions

### Shared packages

`@yonyoung/contracts` exists because both applications previously maintained
overlapping public DTOs and runtime Zod schemas. It is runtime-neutral, exposes
narrow subpath exports, and contains no Next.js, Hono, Worker, D1, R2, or Node
implementation. API OpenAPI metadata and API-only refinements wrap shared public
shapes in the API. Runtime tests, producer/consumer assignability checks, and
OpenAPI snapshot tests make drift mechanical.

`@yonyoung/eslint-config` shares base rules while retaining separate Next and
Worker entrypoints. `@yonyoung/typescript-config` shares reusable compiler
primitives without sharing compiler binaries: web retains TypeScript 5.9 and its
TypeScript 7 alias; API retains TypeScript 6 and Cloudflare-specific types.

No generic `shared` package or UI package was created. UI, business policy,
repositories, server actions, auth implementation, BFF logic, and platform code
remain application-specific because sharing them would weaken runtime ownership.

### Dependency direction

```text
@yonyoung/contracts ----------------> @yonyoung/web
                `--------------------> @yonyoung/api

@yonyoung/eslint-config ------------> web, API, contracts
@yonyoung/typescript-config --------> web, API, contracts
```

Every imported workspace dependency is explicit in the consumer manifest.
`tooling/check-boundaries.mjs` and ESLint reject web-to-API implementation
imports, API-to-web imports, app imports from packages, undeclared workspace
dependencies, unexported package subpaths, and deep `src` imports.

### Preserved runtime boundaries

- Browser traffic continues through the web application's same-origin `/api/*`
  BFF and auth proxy.
- Proxy allowlists, origins/CSRF, cookies and `Set-Cookie`, OAuth callbacks,
  timeouts, body limits, headers, cache invalidation, image handling, and
  observability remain web-owned.
- The API remains a separately deployable Worker with feature contract/route/
  policy/repository layering.
- Auth/authz, D1, R2, KV, Analytics Engine, rate limiting, and private/public
  route behavior remain API-owned.
- The exported `PublicApi` Worker entrypoint remains a separate cache/security
  boundary.

## Turborepo design and verification

The root task graph uses `^build`, `^lint`, `^format:check`, and `^typecheck` to
model workspace prerequisites. Deterministic builds, lint, formatting checks,
typechecks, unit tests, coverage, and font drift are cacheable. Web outputs are
`.next/**` excluding `.next/cache/**`; API build output is the Wrangler dry-run
bundle. Next route types and coverage reports are declared outputs.

Development/start servers are persistent and uncached. Aggregate tests,
Playwright, Workers/integration tests, Cloudflare type mutation, formatting,
font sync, schema generation, audits, deployments, D1 migrations, and database
studio are uncached. Production deployment and remote D1 migration are never
dependencies of build or quality tasks.

Web build hashes explicitly include `API_BASE_URL`,
`NEXT_PUBLIC_IMAGE_CDN_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, and `NODE_ENV`, plus
Next/PostCSS/TypeScript/environment files. API hashes include Wrangler, Drizzle,
migrations, and assets. Secrets needed by deployment/migration are pass-through
only and are neither committed nor logged.

Observed graph probes (temporary files were removed after each dry run):

| Probe              | `turbo ls --affected` / scheduled result            |
| ------------------ | --------------------------------------------------- |
| clean `HEAD`       | zero affected packages                              |
| web-only file      | web plus its contracts/config prerequisites; no API |
| API-only file      | API plus its contracts/config prerequisites; no web |
| contracts file     | contracts, web, and API                             |
| ESLint config file | config plus every applicable lint consumer          |

At the complete PR base, all five workspaces are correctly affected. Turbo's
lockfile analysis can emit pnpm policy diagnostics before JSON when the base
lockfile differs substantially; both workflows defensively locate the JSON
payload instead of assuming byte zero is `{`.

Cache checks:

- first normal quality run: 16/16 successful, 14 cached, 3m03s;
- identical second run: 16/16 cached, 173ms;
- repeated identical build: 5/5 cached, 565-702ms;
- changing only `API_BASE_URL`: web build hash
  `f45f7a7541ad2e28` -> `2a7df777ed3c804a`;
- changing only `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`: web build hash
  `f45f7a7541ad2e28` -> `2552cd21484512eb`;
- changing only `apps/web/next.config.ts`: web build hash
  `f45f7a7541ad2e28` -> `ba38bf8f42ea0ec1`;
- deploy, local/remote D1 migration, format, font sync, and E2E dry runs all
  reported `local:false` and `remote:false`.

Local caching is active. Remote caching is ready but disabled because no
`TURBO_TOKEN`/`TURBO_TEAM` was available; enabling those GitHub settings needs
no workflow change.

## Coverage-order hardening

During final cache-order testing, a prior `.wrangler/dry-run/index.js.map`
caused V8 to count bundled API sources in addition to test-loaded sources,
artificially raising API coverage to 97.91%. `test:coverage` now removes only
the generated `apps/api/.wrangler/dry-run` output through a guarded app-local
script before instrumentation. The harness file alone is excluded from the
coverage denominator; no product, migration, or repository code was excluded.

Order-independence was verified by generating a fresh 3,803.22 KiB Worker bundle
and immediately running the root coverage task. The result remained the genuine
80.01% statements/lines, not the inflated value.

## CI

`CI` exposes stable `Quality gates` and `E2E (Chromium)` jobs. Root formatting
and boundaries always run. Turbo affected execution controls package quality,
coverage, fonts, and builds. Web build variables and the mock API are scoped to
the build step so they cannot change unit-test origin/CSRF semantics. The E2E job
is a successful no-op when web is unaffected and uploads Playwright artifacts on
failure. Coverage artifacts are retained for seven days.

`API Runtime CI` exposes the stable `API runtime` job. It is a successful no-op
when API is unaffected; otherwise it checks binding drift, Workers tests,
runtime integration, production dry-run, and the critical production dependency
audit. Both workflows use one root frozen install, pnpm store caching, optional
Turbo remote cache, full history, concurrency cancellation, timeouts, and
read-only GitHub permissions.

The full PR workflow command was simulated locally after the final workflow
change: 21/21 quality tasks passed (all cached in 199ms), then all five builds
passed with the environment-changed web build executing in 24.4s.

## Independent deployment

Web/Dokploy must use the repository root as build context so the root lockfile
and internal packages are present:

```bash
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@yonyoung/web...
pnpm --filter @yonyoung/web start
```

API/Cloudflare runs Wrangler with `apps/api` as its effective working directory:

```bash
pnpm --filter @yonyoung/api deploy:dry-run
pnpm --filter @yonyoung/api deploy
```

The Worker name remains `yonyoung-api`; `wrangler.jsonc` is byte-for-byte equal
to the authoritative API source tip. `turbo prune` is used where it has measured
scope value—the API production-dependency audit—not added to the existing
Nixpacks path without an owned Docker build to benefit from it.

Deployment automation should use `turbo ls --affected`: web changes deploy web,
API changes deploy API, contract changes deploy both, and docs-only changes
deploy neither. External Cloudflare, Dokploy, GitHub, webhook, secret, domain,
health-check, and branch-protection settings still require the checklist in
[`deployment-and-cutover.md`](./deployment-and-cutover.md).

## Compatibility statement

Migration validation found no intentional or observed change to:

- public API URLs, request/response shapes, operation snapshot, or error envelope;
- database schema, migration bytes/order, or D1 migration state;
- web routes, API routes, page/UI behavior, or public assets;
- Better Auth semantics, roles, authorization, cookies, OAuth callbacks, or BFF
  security behavior;
- cache semantics, public/admin isolation, `PublicApi`, R2 object behavior, or
  image transformations;
- application environment variable names or secret requirements;
- Cloudflare Worker name, resource IDs, bindings, compatibility flags, placement,
  routes, or production environment values.

Drizzle inspected 20 tables and reported `No schema changes, nothing to
migrate`. The migration directory is byte-for-byte identical to the source API
checkout. Cloudflare type generation produced zero Git diff. The production
dry-run reported the same D1, R2, KV, Analytics Engine, rate-limit, assets, and
environment bindings.

The repository-level toolchain is pinned to Node 22.23.2 and pnpm 11.21.0. This
is developer/CI infrastructure, not an application environment-variable or
runtime behavior change.

## Final verification results

All commands below were run from the monorepo root unless noted.

| Command                                                                                                | Result                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                       | pass; six workspace projects, lockfile unchanged                                                                                    |
| `pnpm lint`                                                                                            | pass; boundaries + five workspace lint tasks; one pre-existing web warning, zero errors                                             |
| `pnpm format:check`                                                                                    | pass                                                                                                                                |
| `pnpm typecheck`                                                                                       | pass; five workspaces, Next route types and Worker types included                                                                   |
| `pnpm turbo run test:unit`                                                                             | pass; contracts 15, web 324, API 706                                                                                                |
| `pnpm turbo run test:coverage`                                                                         | pass; contracts 99.09/100/100/99.07, web 97.28/90.52/98.71/97.51, API 80.01/86.12/83.33/80.01 (statements/branches/functions/lines) |
| `CI=true pnpm turbo run test`                                                                          | pass; includes all unit, Workers 14, Playwright 154; 6/6 Turbo tasks in 10m40s                                                      |
| `pnpm build:ci`                                                                                        | pass; five packages, Next production build and Wrangler bundle                                                                      |
| `pnpm --filter @yonyoung/web fonts:check`                                                              | pass; vendored fonts current                                                                                                        |
| `pnpm --filter @yonyoung/web test:unit:coverage`                                                       | pass; 51 files, 324 tests                                                                                                           |
| `CI=true pnpm --filter @yonyoung/web test:e2e:full`                                                    | pass; 154 tests                                                                                                                     |
| `pnpm --filter @yonyoung/web build` with the deterministic mock API                                    | pass; 61 routes/pages generated                                                                                                     |
| `pnpm --filter @yonyoung/api test`                                                                     | pass; 706 Node + 14 Workers tests                                                                                                   |
| `pnpm --filter @yonyoung/api test:coverage`                                                            | pass; 55 files / 706 tests; genuine 80.01% statements/lines                                                                         |
| `pnpm --filter @yonyoung/api test:integration`                                                         | pass; 3/3 Workers-runtime tests                                                                                                     |
| `pnpm --filter @yonyoung/api cf-typegen && git diff --exit-code -- apps/api/worker-configuration.d.ts` | pass; no drift                                                                                                                      |
| `pnpm --filter @yonyoung/api deploy:dry-run`                                                           | pass; 3,803.22 KiB / 661.84 KiB gzip                                                                                                |
| `pnpm --filter @yonyoung/api security:audit`                                                           | pass at unchanged critical threshold; 54 noncritical current advisories (4 low, 38 moderate, 12 high)                               |
| `pnpm --filter @yonyoung/api db:generate`                                                              | pass; 20 tables, no schema change/migration                                                                                         |
| `pnpm turbo ls`                                                                                        | pass; five Turbo packages                                                                                                           |
| `TURBO_SCM_BASE=HEAD pnpm turbo ls --affected`                                                         | pass; zero packages on a clean tree                                                                                                 |
| `TURBO_SCM_BASE=origin/main pnpm turbo ls --affected`                                                  | pass; five packages for the complete migration PR                                                                                   |
| `pnpm turbo run build --dry=json`                                                                      | pass; dependencies, inputs, outputs, and environment hashes inspected                                                               |

Baseline and migration-specific failed validations were not hidden:

1. The source web's bare production build failed without required
   `API_BASE_URL`; its CI-equivalent mock-backed build passed. The monorepo adds
   `build:ci` rather than weakening the build.
2. The first clean migrated API coverage result was 79.98% against the existing
   80% threshold. Two runtime-environment parser cases were added, producing
   80.01% without lowering or excluding product code.
3. The first root build configured a mock origin but did not start the mock API;
   static generation failed to fetch it. The deterministic build harness now
   owns mock startup/readiness/cleanup.
4. Two intentional cache probes applied production URL/`NODE_ENV` values to unit
   tests. One produced 16 failed files/45 failed tests; the narrower URL probe
   produced two failed files/four failed tests, all correct origin/CSRF 403s.
   Task-scoped CI environments fixed the harness; normal/final suites passed.
5. A dry-run source map inflated API coverage to 97.91%; the first guarded-clean
   run was 79.94% because the newly added cleanup harness entered the denominator.
   Excluding that harness alone restored the unchanged 80.01% product scope and
   subsequent post-bundle root coverage passed.
6. Turbo's affected JSON was prefixed by pnpm lockfile-analysis diagnostics
   against the old base lockfile. Workflow parsers now locate and validate the
   JSON payload; the final parser returned `web=true`, `api=true`, `count=5`.

No final required local validation is failing.

## Remaining risks and mitigations

- **External cutover not yet performed.** Apply the documented Cloudflare,
  Dokploy, GitHub, webhook, secret, and branch-protection checklist in staging,
  retain the old repositories, then follow the smoke/rollback sequence.
- **Production smoke tests pending.** OAuth, real cookies, custom domains,
  production R2/image transformations, logs, and read-only D1 behavior require
  deployed infrastructure. Do not claim these from local tests.
- **Remote cache not enabled.** Add `TURBO_TOKEN` and `TURBO_TEAM`, then verify
  cache reads/writes in CI; local caching is fully functional meanwhile.
- **Current dependency advisories.** The preserved production graph has 54
  noncritical advisories. Track upgrades separately from this compatibility
  migration; the critical gate remains enforced.
- **API coverage margin is narrow.** The real gate is 80.01%, now isolated from
  build ordering. Require new API behavior to carry tests and keep the 80%
  threshold unchanged.
- **One existing Next lint warning remains.** It is documented rather than mixed
  with the structural migration; there are no lint errors.
- **GitHub-hosted timing comparison pending.** Local affected/cache behavior is
  measured above, but an honest before/after Actions duration needs the migration
  PR runs and comparable source workflow runs.

## Reviewable commit strategy

The migration is split into history connection, app relocation, workspace/
contracts, CI, documentation, and final verification-hardening commits. No
production deployment or D1 migration is embedded in any commit. Before cutover,
record the previous web/API commits and dashboard settings exactly as described
in the rollback plan.
