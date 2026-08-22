# Yonyoung monorepo

Production repository for the Yonyoung website and API. The repository uses one
pnpm workspace and Turborepo task graph while retaining two independently
deployed runtimes:

- `@yonyoung/web`: Next.js 16 application, browser-facing BFF, and Dokploy/Nixpacks deployment.
- `@yonyoung/api`: Hono application on Cloudflare Workers with D1, R2, KV, Analytics Engine, and the `PublicApi` Worker entrypoint.
- `@yonyoung/contracts`: runtime-neutral public DTOs, Zod consumer schemas, auth roles, profile rules, and upload allowlists.
- `@yonyoung/eslint-config`: small architecture-boundary helpers; each app retains its runtime-specific lint rules and dependency versions.
- `@yonyoung/typescript-config`: reusable compiler primitives; each app retains its own TypeScript compiler and runtime options.

```text
                         @yonyoung/contracts
                           /             \
                          v               v
             @yonyoung/web                 @yonyoung/api
             Next.js + BFF                 Hono + Workers
             Dokploy                       Cloudflare
```

The browser still calls the web application's same-origin `/api/*` BFF. The API
remains a separate Worker. Consolidating the repositories does not create a
runtime trust relationship between the applications.

## Repository layout

```text
apps/
  web/                    Next.js app, BFF, Vitest and Playwright tests
  api/                    Worker source, D1 migrations, Wrangler and tests
packages/
  contracts/              public runtime-neutral contracts
  eslint-config/          shared boundary-rule primitives
  typescript-config/      shared compiler-option primitives
tooling/
  check-boundaries.mjs    cross-workspace import guard
docs/
  monorepo-architecture.md
  ci-and-caching.md
  deployment-and-cutover.md
  migration-history.md
```

Application-specific architecture remains documented in
[`apps/web/docs/architecture.md`](apps/web/docs/architecture.md) and
[`apps/api/docs/architecture.md`](apps/api/docs/architecture.md).

## Prerequisites and install

- Node `22.23.2` (see `.nvmrc`; pnpm 11 requires Node `>=22.13`)
- Corepack
- pnpm `11.21.0`, pinned by the root `packageManager` field

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
```

There is exactly one workspace and lockfile. Do not run a second package-manager
install inside either app or commit nested lockfiles.

## Environment ownership

Each runtime owns its environment. Do not create a combined root secret file.

```bash
cp apps/web/.env.example apps/web/.env.local
```

Set `API_BASE_URL` to the origin printed by the local Wrangler process when doing
full-stack development. `NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_IMAGE_CDN_BASE_URL` are build inputs because Next.js can embed them.

The API's non-secret bindings and production resource IDs remain in
`apps/api/wrangler.jsonc`. Keep local Worker secrets in an ignored
`apps/api/.dev.vars` file or use Wrangler secret management; never commit them.
See [`apps/api/README.md`](apps/api/README.md) for binding-specific details.

## Development

```bash
pnpm dev              # web + API; API applies local D1 migrations first
pnpm dev:web
pnpm dev:api

pnpm --filter @yonyoung/web dev
pnpm --filter @yonyoung/api dev
```

Turbo runs package scripts with the package as the working directory, so existing
Next.js, Playwright, Wrangler, Drizzle, asset, and migration relative paths retain
their application-local meaning.

## Quality and tests

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:workers
pnpm test:coverage
pnpm test:integration
pnpm test:e2e:full
pnpm build
pnpm build:ci       # starts the deterministic Web mock API for static generation
pnpm quality
```

Focused examples:

```bash
pnpm --filter @yonyoung/web test:unit:coverage
pnpm --filter @yonyoung/web test:e2e:full
pnpm --filter @yonyoung/api test
pnpm --filter @yonyoung/api test:integration
pnpm turbo run build --filter=@yonyoung/web...
pnpm turbo run typecheck --filter=@yonyoung/api...
```

`pnpm test` intentionally includes each package's complete `test` script and is
not cached. Playwright, Workers-runtime, integration, deployment, and database
mutation tasks are also uncached. Deterministic lint, typecheck, build, unit, and
coverage tasks may use the local or remote Turbo cache.

## Contracts

Both applications declare `@yonyoung/contracts` as a real workspace dependency.
Web code imports public subpaths such as `@yonyoung/contracts/users`; it never
imports Worker implementation files. API OpenAPI schemas retain API-only UUID,
authorization-neutral validation, examples, descriptions, and Hono metadata.

`apps/api/src/tests/contract-compatibility.types.ts` makes API response shapes
assignable to consumer schemas and consumer request shapes assignable to API
schemas. API OpenAPI snapshot/quality tests and package runtime tests provide the
other drift gates. A contract change therefore invalidates and validates both
applications through the workspace graph.

## Turbo and affected execution

```bash
pnpm turbo ls
pnpm turbo ls --affected
pnpm turbo run lint typecheck test:coverage build --affected
pnpm turbo run build --dry
```

An app-only implementation change affects that app. A contracts change affects
both apps. Shared configuration changes invalidate the tasks that consume that
configuration. Root/global configuration changes invalidate all relevant tasks.
See [`docs/ci-and-caching.md`](docs/ci-and-caching.md).

## Database and deployment safety

Database mutation and production deployment are never build side effects:

```bash
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote        # explicit production-sensitive action
pnpm deploy:dry-run
pnpm deploy:api               # deploys the existing yonyoung-api Worker
pnpm deploy:web:build         # builds web plus internal dependencies
```

The complete production setup, external dashboard checklist, smoke tests, and
rollback sequence are in
[`docs/deployment-and-cutover.md`](docs/deployment-and-cutover.md). Do not archive
the source repositories until production cutover and rollback verification are
complete.

## Additional references

- [`docs/monorepo-architecture.md`](docs/monorepo-architecture.md)
- [`docs/migration-history.md`](docs/migration-history.md)
- [`apps/web/README.md`](apps/web/README.md)
- [`apps/api/README.md`](apps/api/README.md)
- [`apps/api/docs/permissions.md`](apps/api/docs/permissions.md)
