# PERF

## Performance SLOs

### Web (Core Web Vitals targets)
- LCP p75 <= 2500ms
- INP p75 <= 200ms
- CLS p75 <= 0.1
- Critical routes:
  - `/`
  - `/archive/records`
  - `/archive/exhibitions`
  - `/about`

### API
- Cached/read-heavy endpoints p95 <= 150ms (region-local target).
- DB-backed endpoints p95 <= 300ms under moderate concurrency.
- Error budget:
  - 5xx rate < 0.1%
  - no uncaught exceptions in steady-state test run.

## Measurement Approach

### Lab (Lighthouse)
- Script: `scripts/lighthouse-runner.mjs`
- Artifacts:
  - `artifacts/lighthouse/*.json`
  - `artifacts/lighthouse/summary.json`
- Default profile used by script:
  - Mobile form factor
  - DevTools throttling
  - RTT 150ms, throughput 1638kbps, CPU slowdown x4

Run:
- `LIGHTHOUSE_BASE_URL=http://127.0.0.1:3000 pnpm verify:lighthouse`

### Field/RUM (Web Vitals)
- Client hook: `apps/web/src/app/_components/web-vitals-reporter.tsx`
- Collector endpoint: `apps/web/src/app/api/internal/web-vitals/route.ts`
- Sampling:
  - Privacy-safe sampled reporting (default 10%)
  - Payload excludes PII and cookies
- Output sink: structured server logs (`type: web-vitals`)

## Enforced Budgets

### JS route budgets
- Budget config: `apps/web/perf-budget.config.json`
- Enforcement script: `scripts/perf-budget.mjs`
- Gate strategy:
  - Compare built route/shared JS bytes against baseline + allowed regression percentage.

Run:
- `pnpm web:build`
- `pnpm web:perf:budget`

Initialize/update baselines (intentional only):
- `pnpm web:build`
- `node scripts/perf-budget.mjs --write-baseline`

### Third-party script budget
- Also enforced by `scripts/perf-budget.mjs`:
  - max count
  - max total bytes
  - approved host allowlist

## API Load Testing
- Script: `scripts/api-load-test.mjs`
- Default:
  - endpoints: `/health,/api/public/activities`
  - requests: 200
  - concurrency: 20
  - p95 targets: cached 150ms, global 300ms

Run:
- `LOAD_BASE_URL=http://127.0.0.1:8787 pnpm verify:api-load`

Example tuned run:
- `node scripts/api-load-test.mjs --baseUrl=http://127.0.0.1:8787 --requests=500 --concurrency=30`

## Cache Verification
- Script: `scripts/cache-verify.mjs`
- Checks:
  - public cache headers on public route
  - private/no-store for personalized route with session cookies
  - immutable cache on discovered `/_next/static/*` asset
  - optional ISR revalidate validation window

Run:
- `CACHE_VERIFY_BASE_URL=http://127.0.0.1:3000 pnpm verify:cache`

Optional ISR check:
- `node scripts/cache-verify.mjs --baseUrl=http://127.0.0.1:3000 --isrPath=/ --revalidateUrl=http://127.0.0.1:3000/api/internal/revalidate`

## Notes on Cloudflare Caching
- Cloudflare CDN does not automatically cache all HTML/JSON; explicit cache headers are required.
- Workers Cache API is data-center local and non-replicated; do not treat it as globally coherent storage.
- OpenNext cache integrations in this repo:
  - incremental cache: R2
  - cache queue: Durable Object
  - tag cache: D1
