# Performance Testing (Web + API)

터미널에서 사용자 경험 중심 지표를 한 번에 확인하려면 아래 명령을 사용합니다.

```bash
pnpm perf:ux
```

## 측정 지표

- Web(Lighthouse): `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, Performance score
- API(Load): endpoint별 `P50/P95/P99`, 전체 `RPS`, `5xx rate`, `uncaught errors`

## 개별 실행

```bash
pnpm perf:web:ux
pnpm perf:api:ux
```

## 커스텀 실행 예시

```bash
pnpm perf:ux \
  --webBaseUrl=http://127.0.0.1:3000 \
  --apiBaseUrl=http://127.0.0.1:8787 \
  --routes=/,/archive/records,/archive/exhibitions,/about \
  --endpoints=/health,/api/public/activities,/api/public/exhibitions \
  --requests=240 \
  --concurrency=12 \
  --warmupRequests=40
```

## 결과 아티팩트

- Web summary: `artifacts/performance/web-lighthouse-summary.json`
- API summary: `artifacts/performance/api-load-summary.json`

개별 스크립트 실행 시 아티팩트 경로는 `--summaryPath`, `--outputPath`로 변경할 수 있습니다.
