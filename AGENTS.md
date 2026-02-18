# Repository Guidelines

## Project Structure & Module Organization
- `apps/api`: Hono Worker API. Route modules live in `src/modules/*.ts`, shared services and helpers in `src/lib`, tests in `src/tests`, and Drizzle migrations in `drizzle/`.
- `apps/web`: Next.js App Router frontend. Routes and layouts are in `src/app`, client/server API helpers in `src/lib`, unit tests in `src/**/*.test.ts(x)`, and Playwright E2E specs in `tests/e2e`.
- `packages/eslint-config`, `packages/typescript-config`, and `packages/ui` provide shared tooling and reusable code.
- Monorepo wiring is defined in `pnpm-workspace.yaml` and task orchestration in `turbo.json`.

## Build, Test, and Development Commands
Use `pnpm` from the repo root (Node `>=18`):
- `pnpm install`: Install all workspace dependencies.
- `pnpm dev`: Run all app dev tasks via Turbo.
- `pnpm web:dev`: Start only the web app (Next.js).
- `pnpm api:dev`: Start only the API (Wrangler).
- `pnpm lint`: Run ESLint across the workspace.
- `pnpm check-types`: Run TypeScript checks.
- `pnpm api:test`: Run API Vitest tests.
- `pnpm --filter web test:unit`: Run web unit tests.
- `pnpm --filter web test:e2e:smoke`: Run Playwright smoke E2E.

## Coding Style & Naming Conventions
- Primary language is strict TypeScript.
- Formatting/linting: Prettier (`pnpm format`) and shared ESLint config.
- Follow existing style: 2-space indentation, double quotes, trailing commas.
- Name API modules by resource (`activities.ts`, `users.ts`, `supporters.ts`).
- Test names should be explicit and behavior-driven, using `*.test.ts`, `*.test.tsx`, or `*.spec.ts`.

## Testing Guidelines
- API tests: Vitest in `apps/api/src/tests/**/*.test.ts` (Node environment).
- Web unit tests: Vitest + Testing Library in `apps/web/src/**/*.test.ts(x)`.
- Web E2E tests: Playwright in `apps/web/tests/e2e/*.spec.ts`.
- For PRs, run tests for changed areas; include smoke E2E for auth/admin or routing changes.
- Run coverage when touching core flows: `pnpm api:test:coverage` and/or `pnpm --filter web test:unit:coverage`.

## Commit & Pull Request Guidelines
- Keep commit subjects short, imperative, and scoped when useful (example: `web: add auth smoke test`, `api: tighten cache headers`).
- Recent history mixes Korean and English; keep language consistent within a PR.
- PRs should include: summary, affected paths (`apps/api`, `apps/web`, `packages/*`), test commands run, and screenshots/video for UI changes.
- Link related issues and clearly note migration or environment-variable changes.
