# CI Quality Gates

## Required gates
- Lint: `pnpm lint`
- Typecheck: `pnpm check-types`
- API unit tests: `pnpm api:test`
- API Worker runtime integration tests: `pnpm api:test:integration`
- Web unit tests: `pnpm web:test:unit`
- Web smoke E2E: `pnpm web:test:e2e:smoke`
- Web build: `pnpm web:build`
- Web perf budget: `pnpm web:perf:budget`
- Dependency hygiene:
  - dead code: `pnpm quality:deadcode`
  - dependency graph rules: `pnpm quality:deps`

## Single CI command
- `pnpm quality:ci`

## Turborepo tasks used
- `lint`
- `check-types`
- `test`
- `test:integration`
- `build`
- `perf:budget`
