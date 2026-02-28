# Cache Strategy

## API (Cloudflare Workers `caches.default`)

### Scope
- 대상: 익명 공개 GET 엔드포인트 (`/api/public/*`)
- 제외: 인증/개인화 가능 요청 (`Authorization`, `Cookie` 헤더 존재) 및 `Set-Cookie` 응답

### Key 정책
- 기본 키: `new Request(c.req.url, { method: "GET" })`
- 경로/쿼리 기반으로만 캐시 키 생성
- 사용자 식별 정보 기반 커스텀 키를 사용하지 않음(캐시 포이즈닝/데이터 누출 위험 회피)

### TTL / SWR
- Fresh TTL: `60s`
- Stale 허용 구간: `120s` (manual SWR)
- Cache API에서 `stale-while-revalidate` 지시어를 신뢰하지 않고, `X-Public-Cache-Cached-At` 메타데이터로 직접 stale 판단
- Stale 응답은 즉시 반환하고, 백그라운드 재검증은 `executionCtx.waitUntil()`로 수행

### Headers / 계측
- `Cache-Control: public, max-age=60, s-maxage=60`
- `X-Public-Cache-Cached-At: <epoch-ms>`
- `X-Public-Cache-Status: hit|miss|stale|bypass|skip-store`
- 구조화 로그에 `cacheStatus` 포함 (`request.completed`)

### Invalidation
- 데이터 변경 후 공개 캐시 무효화는 `purgePublicCachePath()`로 수행
- purge 작업도 `waitUntil()`에 위임하여 응답 경로 차단 최소화

## Web (Next.js 16 Cache Components)

### 적용 지점
- `apps/web/src/lib/public-api.ts`의 공개 데이터 로더
- `use cache` + `cacheLife({...})` + `cacheTag(...)` 적용

### Tag 정책
- `public:activities`
- `public:exhibitions`
- `public:linktree`
- `public:generations`
- `public:photographers`

### Invalidation API
- `apps/web/src/app/api/admin/revalidate/route.ts`
- `apps/web/src/app/api/internal/revalidate/route.ts`
- 태그 무효화 시 `revalidateTag(tag, "max")` 호출

## Upstream `fetch(..., { cf })` 검토 결과
- API Worker 내부에는 외부 upstream `fetch` 경로가 현재 없음
- 따라서 `cf.cacheTtl/cacheEverything` 적용 지점은 이번 변경 범위에서 없음
- 추후 외부 fetch 도입 시:
  - 공개 리소스만 제한적으로 `cf` 캐시 적용
  - 인증 헤더/쿠키 전달 요청에는 캐시 금지
  - 캐시 키 커스터마이징은 최소화
