# Repository Guidelines

## Project Structure & Module Organization
- `apps/web`: Next.js 16 App Router frontend. Public pages live in `src/app/(home)`, admin pages in `src/app/(dashboard)`, shared helpers in `src/lib`, and end-to-end tests in `tests/e2e`.
- `apps/api`: Hono API on Cloudflare Workers. HTTP modules are in `src/modules`, middleware in `src/middlewares`, core auth/db/services in `src/lib`, tests in `src/tests`, and D1 migrations in `drizzle/`.
- `packages/*`: shared workspace libraries and configs (`shared-auth`, `shared-http`, `shared-api-contracts`, `ui`, ESLint/TypeScript configs).
- `scripts/`: repo-level verification scripts such as `lighthouse-runner.mjs`, `perf-budget.mjs`, `cache-verify.mjs`, and `api-load-test.mjs`.

## Build, Test, and Development Commands
Use `pnpm` from the repository root (Node `>=18`; CI uses Node 20).
- `pnpm dev`: run workspace dev tasks through Turbo.
- `pnpm web:dev` / `pnpm api:dev`: run only one app locally.
- `pnpm build`: build all workspaces.
- `pnpm lint && pnpm check-types`: run static quality checks.
- `pnpm api:test`, `pnpm api:test:integration`, `pnpm web:test:unit`, `pnpm web:test:e2e:smoke`: core test suites.
- `pnpm quality:ci`: full quality gate used by GitHub Actions.

## Coding Style & Naming Conventions
- TypeScript-first; prefer explicit types and small, focused modules.
- Formatting and linting are authoritative: run `pnpm format` and `pnpm lint`.
- Follow existing style: 2-space indentation, semicolons, and clear named exports in shared code.
- Naming conventions:
  - source modules: kebab-case (for example `public-cache.ts`)
  - unit tests: `*.test.ts` / `*.test.tsx`
  - Playwright specs: `*.spec.ts`

## Testing Guidelines
- API tests use Vitest (`apps/api/src/tests`) with coverage thresholds: 90% lines/functions/statements and 85% branches.
- Web unit tests use Vitest (`apps/web/src/**/*.test.ts(x)`) with thresholds: 85% lines/functions/statements and 80% branches.
- Web E2E uses Playwright (`apps/web/tests/e2e/**/*.spec.ts`); bootstrap env with `cp tests/e2e/.env.e2e.example tests/e2e/.env.e2e`.
- Add or update tests for behavior changes, especially auth, RBAC, uploads, and caching paths.

## TDD Policy
- Default workflow is `RED -> GREEN -> REFACTOR`.
- Write failing tests before implementation for all behavior changes.
- Keep commits split by TDD phase when possible.
- `pnpm tdd:guard` is enforced in CI: source code changes must include test changes.
- Use `/Users/jhyunwoo/projects/yonyoung/TDD_GUIDE.md` as the canonical process reference.

## Commit & Pull Request Guidelines
- Current history favors short, imperative, single-topic commit messages (Korean or English both used).
- Keep commit subjects concise and scoped (example: `fix upload ownership check`).
- PRs should include a summary, linked issue (if available), commands run for verification, and screenshots for UI changes.
- Before requesting review, ensure `pnpm quality:ci` passes locally.
