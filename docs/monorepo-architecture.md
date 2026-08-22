# Monorepo architecture

## Runtime topology

```text
Browser
  |
  | same-origin /api/*, auth cookies, OAuth callbacks
  v
apps/web (@yonyoung/web)
  Next.js App Router + BFF
  |
  | allowlisted server-to-server requests
  v
apps/api (@yonyoung/api)
  Hono Cloudflare Worker
  |-- D1
  |-- R2
  |-- KV
  `-- Analytics Engine
```

Repository co-location does not alter this network topology. The browser does
not gain a direct dependency on API implementation modules, and the Worker does
not gain access to Next.js internals.

## Workspace graph

```text
                +------------------------+
                | @yonyoung/contracts    |
                +-----------+------------+
                            |
                   +--------+--------+
                   |                 |
                   v                 v
          +----------------+  +----------------+
          | @yonyoung/web  |  | @yonyoung/api  |
          | Next.js + BFF  |  | Hono + Worker  |
          +----------------+  +----------------+

 @yonyoung/eslint-config ---------> both apps + contracts
 @yonyoung/typescript-config -----> both apps + contracts
```

Every imported workspace package is declared with `workspace:*`. Physical pnpm
hoisting never substitutes for an explicit manifest dependency.

## Package responsibilities

### `apps/web`

Owns UI, App Router routes, BFF handlers, Better Auth client integration, server
actions, Next cache/tag behavior, Cloudflare image transformations, public
assets, accessibility tests, Vitest, and Playwright. Its `@/*` alias remains
relative to `apps/web`, not the monorepo root.

### `apps/api`

Owns Worker assembly, feature contracts/routes/policy/repositories, runtime
middleware, Better Auth server configuration, database schema/migrations,
storage, Cloudflare bindings, OpenAPI metadata, and the `PublicApi` entrypoint.
Wrangler and Drizzle execute with `apps/api` as their working directory.

The intended internal direction remains:

```text
app -> features -> platform/shared/lib
```

### `packages/contracts`

Owns runtime-neutral public consumer schemas/types plus shared auth/profile and
upload allowlists. It exports narrow subpaths and has no browser, Next.js, Hono,
Worker, D1, or Node runtime dependency. API-only validation refinements and
OpenAPI metadata wrap the same public shapes inside API feature contracts.

Drift is caught by:

1. contracts package runtime/type tests;
2. API compile-time producer/consumer assignability checks;
3. API OpenAPI snapshot and quality tests;
4. web runtime parsing tests;
5. Turbo invalidation of both consumers when the package changes.

### Configuration packages

The config packages share only proven primitives. They do not align compiler or
lint ecosystem versions. In particular, web retains TypeScript 5.9 plus its
TypeScript 7 alias, while API retains TypeScript 6 and Worker-specific types.

## Enforced prohibitions

- web -> `apps/api/src/**`
- API -> `apps/web/**`
- contracts/config packages -> either app
- deep `@yonyoung/*/src/**` imports
- use of an undeclared workspace dependency
- use of a workspace subpath absent from package `exports`

ESLint provides immediate package-name feedback and
`tooling/check-boundaries.mjs` resolves relative paths so alternate spellings
cannot bypass the boundary.

## Security boundaries preserved

The migration deliberately leaves the following in their owning applications:

- web proxy path allowlists, request/header forwarding, CSRF/origin guards,
  cookie and `Set-Cookie` propagation, timeouts and body limits;
- web public/admin cache separation, invalidation, CSP/security headers, image
  and observability behavior;
- API auth/authz middleware, CORS/CSRF/security headers, rate limiting, query
  safety, resource ownership, and public/private routes;
- the `PublicApi` Worker entrypoint and its independent cache/security boundary.

Shared contracts are data boundaries, never shared authorization or storage
implementation.
