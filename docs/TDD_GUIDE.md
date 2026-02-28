# TDD Guide

## Goal
- Keep production behavior safe by requiring tests to lead implementation.
- Make regressions visible before merge with local and CI gates.

## Default Workflow
1. RED
- Write or update tests first.
- Confirm the new/changed tests fail for the expected reason.

2. GREEN
- Implement the minimum code needed to pass.
- Avoid premature refactor or broad structural changes at this step.

3. REFACTOR
- Improve readability, reuse, and performance while keeping tests green.
- Re-run the same test scope after each refactor batch.

## Required Checks Before Merge
- `pnpm lint`
- `pnpm check-types`
- `pnpm api:test:coverage`
- `pnpm web:test:unit:coverage`
- `E2E_UPLOAD_MODE=real E2E_SUITE_MODE=full E2E_ROLE_MATRIX=all pnpm web:test:e2e:full`
- `pnpm web:build`
- `pnpm web:perf:budget`
- `pnpm quality:deadcode`
- `pnpm quality:deps`
- `pnpm tdd:guard`

## TDD Guard Policy
- `pnpm tdd:guard` fails when source files change without accompanying test changes.
- Source scope:
  - `apps/api/src/**` (excluding tests)
  - `apps/web/src/**` (excluding tests)
  - `packages/shared-api-contracts/src/**`
- Accepted test scope:
  - `*.test.ts`, `*.test.tsx`
  - `*.spec.ts`, `*.spec.tsx`
  - files under `tests` / `__tests__`

## Commit Recommendation
1. `test: ...` (RED)
2. `feat|fix: ...` (GREEN)
3. `refactor: ...` (REFACTOR)

## Pull Request Checklist
- Include test intent and changed scenarios.
- Record exact commands used for verification.
- If behavior changed without tests, explain why and add follow-up issue.
