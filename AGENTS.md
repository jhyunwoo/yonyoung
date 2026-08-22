# Repository instructions

This repository contains two production applications with one build graph, not
one runtime application.

## Ownership

- Frontend pages, components, server actions, Next.js caching, image behavior,
  and the same-origin BFF belong in `apps/web`.
- Worker routes, feature policy/repositories, D1, R2, KV, Analytics Engine,
  Better Auth server behavior, and the `PublicApi` security/cache entrypoint
  belong in `apps/api`.
- Public DTOs, consumer Zod schemas, role/profile primitives, and public upload
  allowlists shared by both runtimes belong in `packages/contracts`.
- Keep application-specific business logic in its owning app. Do not create a
  generic `shared` dumping ground.

Allowed dependency directions are:

```text
apps/web -> packages/contracts <- apps/api
apps/*   -> packages/{eslint-config,typescript-config}
packages/* -X-> apps/*
apps/web -X-> apps/api implementation
apps/api -X-> apps/web
```

Use only public `@yonyoung/contracts/*` exports. `pnpm boundaries` enforces
workspace declarations, public exports, and prohibited cross-app imports.

## Working rules

- Run pnpm from the repository root for normal workflows. Package scripts must
  also continue to work from the package directory.
- Preserve exact dependency versions unless a separate, fully tested upgrade is
  explicitly requested. Web and API intentionally use different TypeScript,
  Vitest, Node types, ESLint JavaScript configs, and Worker tooling versions.
- Preserve the web BFF allowlists, auth proxy, cookie/Set-Cookie behavior, CSRF,
  same-origin checks, body limits, timeouts, headers, CSP, and cache invalidation.
- Preserve the API feature boundaries and `PublicApi` Worker entrypoint. Never
  treat that entrypoint as a mere cache optimization.
- Do not generate a D1 migration for refactors or repository moves. Existing SQL
  migrations must remain unchanged unless a deliberate schema change is in scope.
- Never make `db:migrate:remote` or production deployment a build side effect.
- Do not commit `.env*`, `.dev.vars*`, Worker secrets, tokens, or generated test/build output.

## Validation

For an app-local change, use Turbo filtering or `--affected`; for shared
contracts, validate both apps. Minimum static checks are:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:workers
pnpm build
```

Web behavior changes additionally require unit coverage and relevant Playwright
tests. API behavior changes additionally require Node + Workers tests,
integration, coverage, OpenAPI tests, Wrangler dry-run, and the production audit.
Migration/deployment changes require the checks in
`docs/deployment-and-cutover.md`.
