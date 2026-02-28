# RUNBOOK

## 1) Latency Spike Investigation

### API
1. Check structured logs for p95/p99 growth:
- filter fields: `requestId`, `route`, `status`, `latencyMs`
2. Compare route classes:
- public cached routes (`/api/public/*`)
- DB-backed admin routes (`/api/*` write/read)
3. Run local load reproduction:
- `LOAD_BASE_URL=http://127.0.0.1:8787 pnpm verify:api-load`
4. If DB-heavy routes regress:
- verify D1 health and query patterns
- check recent migration/index changes

### Web
1. Run Lighthouse baseline on critical routes:
- `LIGHTHOUSE_BASE_URL=http://127.0.0.1:3000 pnpm verify:lighthouse`
2. Compare `artifacts/lighthouse/summary.json` vs previous baseline.
3. Run budget gate to identify JS regressions:
- `pnpm web:perf:budget`

## 2) 5xx Investigation
1. Locate failing route/status in JSON logs.
2. Correlate with requestId and stack source module.
3. Validate recent deploy/migration changes.
4. For upload failures:
- verify `R2_*` env/bindings
- verify multipart upload lifecycle endpoints and ownership checks.
5. Re-run tests:
- `pnpm api:test`
- `pnpm api:test:integration`

## 3) Cache Invalidation Validation
1. Run cache verification:
- `CACHE_VERIFY_BASE_URL=http://127.0.0.1:3000 pnpm verify:cache`
2. Validate no-store on personalized/admin routes.
3. Validate public cache headers on cacheable routes.
4. Validate immutable cache on `/_next/static/*` assets.
5. Optional ISR revalidate check:
- `node scripts/cache-verify.mjs --baseUrl=http://127.0.0.1:3000 --isrPath=/ --revalidateUrl=http://127.0.0.1:3000/api/internal/revalidate`

## 4) Safe Rollback (Workers)
1. Identify last known good deployment in Cloudflare dashboard.
2. Roll back Worker service version (API and/or web separately).
3. Re-apply stable environment variables/secrets.
4. Re-run smoke checks:
- `pnpm web:test:e2e:smoke`
- `pnpm verify:cache --baseUrl=<rollback-url>`
- `pnpm verify:api-load --baseUrl=<rollback-api-url>`

## 5) D1 Migration Workflow (Reproducible)

### Local/dev
1. Generate migration:
- `pnpm api:db:generation`
2. Apply migration (remote D1 per current project setup):
- `pnpm api:db:migrate`

### Staging/production
1. Review generated SQL under `apps/api/drizzle/`.
2. Apply migration to target environment database via Wrangler:
- `pnpm api:db:migrate`
3. Deploy API Worker:
- `pnpm api:deploy`
4. Run API + cache verifications post-deploy.

## 6) Cloudflare Observability Recommendations

### Logs/Traces
- Enable Workers observability (already enabled in wrangler configs).
- Recommended log dimensions:
  - `route`, `status`, `latencyMs`, `requestId`

### Suggested dashboards/queries
- API latency p50/p95/p99 by route
- 4xx/5xx rate by route
- upload endpoint error rate split by error code
- cache effectiveness (public endpoints) and response cache-control distribution

### Quick query examples (conceptual)
- High latency routes over last 30m
- 5xx count grouped by route/status
- Upload failures with `BAD_REQUEST` vs `INTERNAL_ERROR`
