# CI, affected execution, and caching

## Workflows

`CI` contains stable `Quality gates` and `E2E (Chromium)` jobs. Quality always
returns a status and uses Turbo affected execution for formatting, lint,
typecheck, coverage, and builds. Font drift runs only when the web package is in
the affected graph. The E2E job remains present but avoids browser installation
when web is unaffected; failures upload `apps/web/test-results/playwright`.
The quality build owns a short-lived Web mock API, so Next static generation is
deterministic and does not depend on a production or staging API origin.

`API Runtime CI` keeps Cloudflare binding drift, Workers-runtime tests,
integration tests, production Wrangler dry-run, and the production dependency
audit. The job remains successful with an explicit no-op message when the API is
not affected.

The API audit first creates a temporary `turbo prune @yonyoung/api` graph and
runs `pnpm audit --prod --audit-level critical` inside it. This keeps the Worker
runtime gate scoped to API production dependencies even though the repository
has one root lockfile.

Both workflows use a full Git checkout so Turbo can identify the merge base, one
root frozen-lockfile install, pnpm store caching, concurrency cancellation,
read-only GitHub permissions, and repository-pinned Node/pnpm versions.

## Affected semantics

Typical results are:

| Change                           | Affected application work                               |
| -------------------------------- | ------------------------------------------------------- |
| `apps/web/**`                    | web only                                                |
| `apps/api/**`                    | API only                                                |
| `packages/contracts/**`          | contracts, web, API                                     |
| shared lint/TS config            | consuming static/build tasks                            |
| root lock/workspace/Turbo config | all relevant workspaces                                 |
| documentation only               | no application task unless global configuration changed |

Inspect before execution with:

```bash
pnpm turbo ls --affected
pnpm turbo run build lint typecheck test:coverage --affected --dry
```

## Cache policy

Cacheable deterministic tasks include builds, lint, format checks, typechecks,
unit tests, coverage, and font drift. Web build output excludes `.next/cache` and
includes the rest of `.next`; API build output is Wrangler's dry-run bundle.

The following are intentionally uncached:

- development and start servers;
- the aggregate `test` task;
- Workers-runtime and integration tests;
- all Playwright tasks;
- generated Cloudflare binding mutation;
- format writes and font synchronization;
- deployments, audits, D1 migrations, schema generation, and database studio.

Secrets are pass-through values for commands that require them and are not
logged or committed. Build-affecting web variables are task-local Turbo `env`
inputs rather than repository-global invalidators.

## Remote cache

Local caching works without credentials. CI is remote-cache ready: add the
following GitHub settings to enable it without changing workflow files:

- Actions secret `TURBO_TOKEN`
- Actions variable `TURBO_TEAM`

Do not enable caching for deployment or database mutation tasks. Confirm cache
behavior by running a deterministic task twice and then modifying an app source,
contract, relevant config, and relevant build environment variable.
