# Observability

## 1) Worker Observability 설정

`apps/api/wrangler.jsonc`, `apps/web/wrangler.jsonc`에 환경별 분리 적용:

- `env.staging`
  - 낮은 샘플링(`head_sampling_rate: 0.3`)
  - CSP report-only 기본
- `env.production`
  - 전체 샘플링(`head_sampling_rate: 1`)
  - 운영 전환 시 CSP enforce 가능

Logs/Traces 모두 `persist: true`로 저장.

## 2) Request ID 정책

### 생성/전파
- 우선순위:
  1. `x-request-id`
  2. `cf-ray`
  3. `crypto.randomUUID()`
- 응답 헤더에 `X-Request-Id`로 항상 반환
- 에러 응답 본문에도 `error.requestId` 포함

### 목적
- 클라이언트 오류 보고, 서버 로그, Cloudflare 로그를 동일 ID로 상관분석

## 3) 구조화 로그 스키마

### 이벤트
- `request.received`
- `request.completed`
- `request.failed`

### 공통 필드
- `timestamp`
- `requestId`
- `method`
- `route`

### 추가 필드
- 요청: `headers`(민감정보 마스킹)
- 완료: `status`, `latencyMs`, `cacheStatus`
- 실패: `message`(민감 패턴 마스킹)

## 4) `waitUntil` 비동기 오프로드

응답과 무관한 작업은 `executionCtx.waitUntil()`로 이관:
- 로그 flush
- API micro-cache write/purge
- stale 캐시 백그라운드 revalidate

주의:
- `waitUntil`은 컨텍스트 객체에서 직접 호출(구조분해 호출 금지)하여 Illegal invocation 회피

## 5) 운영 모니터링 지표(권장)

1. API Latency
- p50 / p95 / p99 (`request.completed.latencyMs`)

2. Cache 효율
- `cacheStatus=hit|stale|miss|bypass|skip-store` 비율

3. 오류율
- 5xx 비율, `request.failed` 이벤트 급증

4. D1 안정성
- retry 발생 횟수, 재시도 후 실패 비율

## 6) Tail Worker / OTEL 선택지

- 현재: Workers Logs + persisted traces
- 확장:
  - Tail Worker로 로그 라우팅
  - OTEL collector 연동(필요 시)
  - Analytics Engine dataset으로 SLA 대시보드 구성
