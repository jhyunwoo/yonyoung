# Migration inventory and history method

## Source provenance

The migration used these source tips as the behavior baseline:

- `jhyunwoo/yonyoung-web` `main`: `67a3412`
- `jhyunwoo/yonyoung-api` `main`: `df0da44`

The existing `jhyunwoo/yonyoung` history was retained as the destination
ancestry. The two source repositories were cloned to temporary directories and
rewritten with `git filter-repo --to-subdirectory-filter` into `apps/web` and
`apps/api`. Each unrelated rewritten history was merged, then the destination's
stale application tree was replaced by the authoritative source tip.

No source repository was rewritten or force-pushed. The original checkouts were
kept outside the monorepo during migration. Useful history is available through:

```bash
git log --follow -- apps/web/next.config.ts
git log --follow -- apps/api/wrangler.jsonc
```

## Pre-edit inventory

The web baseline included Next.js 16.3.1, React 19.2.8, TypeScript 5.9.3 plus the
TypeScript 7 alias, Tailwind 4, Better Auth, Zod, Vitest 4, Playwright, the BFF
proxy/auth handlers, security guards, Next caching, R2-backed media and vendored
fonts.

The API baseline included Hono, `@hono/zod-openapi`, Cloudflare Workers, D1 and
nine existing SQL migrations, Drizzle, R2, KV, Analytics Engine, Better Auth,
Wrangler 4.122.0, Node Vitest 3, Workers Vitest, integration tests, OpenAPI
snapshots, and the exported `PublicApi` Worker boundary.

Configuration, scripts, CI, environment reads, package manifests, lockfiles,
TypeScript/ESLint/Prettier/Vitest/Playwright/Wrangler/Drizzle files,
documentation, imports, aliases, generated files, assets, authentication,
storage, caching and deployments were inventoried before structural edits.

## Baseline results

Before migration, all supported source checks passed except a bare web
production build without its required `API_BASE_URL`. The CI-equivalent E2E build
with its mock API environment passed. The web lint baseline contained one
existing warning for relative `window.location.href` navigation.

- web: fonts, lint, typecheck, 337 unit tests with coverage, and 154 full E2E tests passed;
- API: format, lint, typecheck, binding generation drift, 704 Node tests, 14 Workers tests, coverage, three integration tests, production dry-run, and Drizzle no-change generation passed;
- the API production audit exited successfully at its configured critical threshold while reporting pre-existing lower-severity advisories.

The unified lockfile pins the exact direct versions installed by those source
lockfiles. It intentionally retains different TypeScript, Vitest, Node type,
ESLint JS config, and Worker-specific tool versions between applications.

## Database and production identity invariants

All existing SQL migration files and ordering are retained. No migration was
created for the directory move. `apps/api/wrangler.jsonc` retains the Worker name
`yonyoung-api`, compatibility configuration, resource IDs, bindings, environment
values, asset directory, D1 migration directory, and `PublicApi` export.
