# 방문자 분석(Visitor Insights) 설계

- 작성일: 2026-10-16
- 상태: 검토 대기
- 브랜치: `dev`

## 1. 목적과 성공 기준

`/dashboard/stats` 방문 통계를 "얼마나 봤나"에서 "누가, 언제, 어디서 와서, 어떻게 움직였나"까지 볼 수 있게 확장한다. 지표마다 데이터 특성에 맞는 차트를 bklit UI로 그리고, 세그먼트 필터로 사용 패턴을 나눠 볼 수 있게 한다.

성공 기준:

1. 순방문자, 세션, 페이지뷰, 세션당 페이지, 평균 체류 시간, 이탈률, 신규/재방문, 주별 재방문 코호트를 볼 수 있다.
2. 방문자 구분(전체/외부/회원), 기기, 유입 경로, 진입 페이지 종류로 걸러 볼 수 있고, 조회 조건이 모두 URL에 남는다.
3. 모든 차트에 같은 숫자를 담은 "표로 보기"가 있다. 색만으로 정보를 전달하지 않는다.
4. IP·UA 원문과 회원 ID를 저장하지 않는다.
5. 기존 홈 대시보드 위젯, `GET /api/admin/page-views/analytics`, MCP `page_view_analytics`의 동작이 바뀌지 않는다.

결정된 전제:

- 방문자 식별은 브라우저 localStorage의 무작위 ID로 한다(쿠키 아님).
- 회원 방문은 "회원 여부" 플래그로만 구분해 기록한다.
- 새 지표는 배포한 날부터 쌓인다. 과거로 소급하지 않는다.
- 현재 트래픽은 하루 평균 약 11 페이지뷰(2026-05 ~ 2026-10 합계 3,941회, 최고 239회/일)다.

## 2. 아키텍처 개요

```text
공개 페이지 (PageViewTracker)
  │ POST /api/public/page-views            (기존 본문 + visitorId, sessionId, pageviewId)
  │ POST /api/public/page-views/engagement (pageviewId, visitorId, engagedMs)
  ▼
API Worker
  ├─ 기존: page_views, page_view_entries 일 단위 누적 (변경 없음)
  └─ 신규: analytics_events 에 페이지뷰 1행
           ▲
GET /api/admin/page-views/insights?from&to&granularity&audience&device&referrer&landing
  │  이벤트 행을 읽어 순수 함수(insights 계산 모듈)로 집계
  ▼
/dashboard/stats (InsightsView, bklit 차트)
```

저장소는 D1 원시 이벤트 테이블 하나다. 집계는 조회 시점에 한다. Analytics Engine은 보관 기간(3개월)이 최대 조회 기간(731일)보다 짧아 쓰지 않는다. 야간 요약 테이블은 이 트래픽에서 필요 없다.

## 3. 수집

### 3.1 브라우저 식별값

`apps/web/features/public/analytics/visitor-identity.ts`(신규)가 관리한다.

| 키        | 저장 위치    | 값                               | 규칙                                                                                   |
| --------- | ------------ | -------------------------------- | -------------------------------------------------------------------------------------- |
| `yy_vid`  | localStorage | UUID v4                          | 없으면 생성. 이후 유지                                                                 |
| `yy_sess` | localStorage | `{ id: UUID, lastActiveAt: ms }` | `now - lastActiveAt > 30분`이면 새 id. 페이지뷰와 체류 전송 때마다 `lastActiveAt` 갱신 |

- localStorage 접근이 실패하면(프라이빗 모드, 차단) 모듈 변수에 만든 임시 ID를 쓴다. 그 문서가 살아 있는 동안만 유지된다.
- 탭이 여러 개여도 같은 localStorage를 보므로 한 세션으로 묶인다.

### 3.2 페이지뷰 전송

`PageViewTracker`가 기존 `POST /api/public/page-views` 본문에 세 필드를 더한다.

- `visitorId`, `sessionId`: 3.1의 값
- `pageviewId`: 이번 페이지뷰용 새 UUID
- 새 세션의 첫 페이지뷰이면 `sessionStart: true`를 보낸다. 이때 그 페이지뷰가 문서 로드의 첫 페이지뷰이고 외부 리퍼러가 있으면 `sessionReferrerHost`에 그 호스트를 담고, 아니면 생략한다(= 직접 접속).
- 서버는 `sessionStart`인 행에만 `referrer_host`를 채운다(`sessionReferrerHost`가 없으면 `direct`). 세션의 첫 이벤트에 `referrer_host`가 없으면(첫 요청 유실) 집계에서 `direct`로 본다.

기존 `entry`, `referrerHost` 필드와 일 단위 누적은 그대로 둔다.

### 3.3 체류 시간 전송

- 페이지가 보이는 동안의 시간만 누적한다(`visibilitychange`로 멈춤/재개).
- 탭이 숨겨질 때와 effect 정리 시점(클라이언트 내비게이션, 언마운트)에 **누적 총량**을 `POST /api/public/page-views/engagement`로 `keepalive` 전송한다.
- 총량을 보내므로 여러 번 보내도 결과가 같다(서버는 큰 값만 반영).

### 3.4 API 기록 규칙

`POST /api/public/page-views` (기존 라우트 확장):

1. 기존 검증·레이트리밋·일 단위 누적을 그대로 수행한다.
2. `visitorId`, `sessionId`, `pageviewId`가 모두 UUID일 때만 이벤트 행을 쓴다. 없으면(캐시된 옛 클라이언트) 건너뛴다.
3. UA가 봇 패턴(`bot|crawl|spider|slurp|headless|lighthouse|preview` 대소문자 무시)이면 이벤트 행을 쓰지 않는다. 기존 일 단위 누적은 지금처럼 쓴다.
4. 회원 여부는 `resolveActor(c)`가 사용자를 돌려주면 `true`. 승인 상태는 보지 않는다.
5. 기기는 기존 `classifyDevice`, 리퍼러는 기존 `normalizeReferrerHost`로 정규화한다.
6. `INSERT ... ON CONFLICT(id) DO NOTHING`으로 재전송 중복을 막는다.

`POST /api/public/page-views/engagement` (신규):

- 본문: `{ pageviewId: uuid, visitorId: uuid, engagedMs: int 0..1_800_000 }`
- 같은 레이트리미터(`allowPageViewWrite`)를 거친다. 실패해도 항상 `{ ok: true }` 200.
- `UPDATE analytics_events SET engaged_ms = max(coalesce(engaged_ms, 0), :engagedMs) WHERE id = :pageviewId AND visitor_id = :visitorId AND visited_at >= now - 24h`
- 페이지뷰 1회당 최대 30분으로 자른다. 자리 비움 탭이 평균을 왜곡하지 않게 한다.

### 3.5 테이블

`apps/api/src/platform/db/schema/analytics.ts`에 추가, 마이그레이션 `0015_analytics_events.sql`.

| 열              | 타입                   | 설명                                                |
| --------------- | ---------------------- | --------------------------------------------------- |
| `id`            | text PK                | pageviewId                                          |
| `visitor_id`    | text not null          |                                                     |
| `session_id`    | text not null          |                                                     |
| `visited_at`    | integer(ms) not null   | 서버 수신 시각                                      |
| `page_type`     | text not null          | home / activity / exhibition / notice               |
| `resource_id`   | text not null          | `normalizePageViewResourceId` 결과                  |
| `referrer_host` | text null              | 세션 첫 페이지뷰에만. `direct` 또는 정규화된 호스트 |
| `device`        | text not null          | mobile / tablet / desktop                           |
| `is_member`     | integer(bool) not null |                                                     |
| `engaged_ms`    | integer null           | null = 측정 안 됨                                   |

인덱스: `(visited_at)`, `(visitor_id, visited_at)`, `(session_id)`.

### 3.6 보관과 고지

- 기존 일일 크론(`scheduled`)에 `visited_at < now - 731일` 행 삭제를 더한다. R2 정리와 독립적으로 실패를 로그만 남긴다.
- 공개 사이트 푸터(`apps/web/app/(home)/_components/site-footer.tsx`)에 한 줄: "익명 방문 분석을 위해 브라우저에 무작위 식별값을 저장합니다. 개인을 식별하는 정보는 수집하지 않습니다."

## 4. 지표 정의

모든 날짜·시간은 KST다. 집계는 `apps/api/src/features/page-views/visitor-insights.ts`(신규)의 순수 함수가 이벤트 배열을 받아 계산한다.

| 지표           | 정의                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 페이지뷰       | 이벤트 행 수                                                                                                                                    |
| 순방문자       | 고유 `visitor_id` 수                                                                                                                            |
| 세션           | 고유 `session_id` 수. 세션의 기간 귀속은 첫 이벤트 시각 기준                                                                                    |
| 세션당 페이지  | 페이지뷰 / 세션                                                                                                                                 |
| 평균 체류 시간 | 세션별 `engaged_ms` 합의 평균. 측정된 이벤트가 하나도 없는 세션은 제외하고, 제외 수를 함께 돌려준다                                             |
| 이탈률         | 페이지뷰가 1개인 세션 / 세션                                                                                                                    |
| 신규 방문자    | 생애 첫 세션이 집계 대상(조회 기간 + 필터)에 들어온 방문자. 첫 세션이 필터에 걸려 빠지면 남은 세션은 재방문이다                                 |
| 재방문 방문자  | 조회 기간 방문자 중 신규가 아닌 방문자                                                                                                          |
| 진입           | 세션의 첫 이벤트                                                                                                                                |
| 주별 코호트    | 첫 방문 주(월요일 시작)별 방문자 집합. k주 후 재방문율 = 그 집합 중 (첫 주 + k)주에 이벤트가 있는 비율. k = 1..8. 조회 기간 끝을 넘는 칸은 null |

## 5. 조회 옵션

URL 쿼리(기존 `range`, `from`, `to`, `granularity`에 추가):

| 키         | 값                                                    | 기본    | 적용 단위                                               |
| ---------- | ----------------------------------------------------- | ------- | ------------------------------------------------------- |
| `audience` | `all` / `external` / `member`                         | `all`   | 세션. 세션 안에 회원 이벤트가 하나라도 있으면 회원 세션 |
| `device`   | `all` / `mobile` / `tablet` / `desktop`               | `all`   | 세션(첫 이벤트의 기기)                                  |
| `referrer` | `all` / `direct` / 호스트명                           | `all`   | 세션(첫 이벤트의 리퍼러)                                |
| `landing`  | `all` / `home` / `activity` / `exhibition` / `notice` | `all`   | 세션(첫 이벤트의 페이지 종류)                           |
| `metric`   | `views` / `visitors` / `sessions` / `duration`        | `views` | 추이 차트만. 웹 전용, API로 보내지 않음                 |

필터는 **세션 세그먼트**다. 조건에 맞는 세션을 고른 뒤 그 세션들의 모든 이벤트로 모든 지표를 계산한다. 그래서 "진입 페이지: 활동"을 고르면 활동 글로 들어온 세션이 그 뒤 본 홈·전시 조회도 함께 보인다. (설계 대화의 "페이지 종류 필터"를 세그먼트 모델과 맞추려고 "진입 페이지 종류"로 정의했다.)

유입 경로 선택지는 조회 기간 상위 10개 호스트와 `direct`로 API가 함께 돌려준다.

## 6. API: `GET /api/admin/page-views/insights`

- 권한: 기존 `analytics`와 같다(미승인 사용자 외 모든 회원).
- 쿼리: `from`, `to`, `granularity`(선택, 없으면 기존 규칙으로 자동), `audience`, `device`, `referrer`, `landing`.
- 기간 검증과 비교 기간 계산은 기존 `resolveAnalyticsRange`를 재사용한다.
- 처리: 조회 기간과 비교 기간의 이벤트를 좁은 열만 읽고, 방문자별 최초 방문 시각을 `GROUP BY visitor_id`로 따로 읽어 계산 모듈에 넘긴다.

응답(`packages/contracts`에 zod 스키마 추가):

```ts
{
  range, previousRange,                 // 기존 analytics와 같은 모양
  eventsTrackedSince: string | null,    // analytics_events 최초 KST 날짜
  segmented: boolean,                   // 필터가 하나라도 켜졌는지
  summary: {
    views, visitors, sessions, pagesPerSession, avgSessionMs, bounceRate,
    unmeasuredSessions, newVisitors, returningVisitors,
    prev: { views, visitors, sessions, pagesPerSession, avgSessionMs, bounceRate },
  },
  trend: Array<{
    bucket, views, visitors, sessions, avgSessionMs, newVisitors, returningVisitors,
    prevViews, prevVisitors, prevSessions, prevAvgSessionMs,
    collected: boolean,                 // 이 구간이 수집 시작 이후인지
  }>,
  hourly: Array<{ weekday: 0..6, hour: 0..23, views }>,       // 168칸, 월=0
  referrerFlow: Array<{ referrer, landing, sessions }>,       // 상위 6개 + other
  pathFlow: Array<{ step: 1|2, from, to, sessions }>,         // to = 페이지 종류 | "exit"
  content: Array<{ pageType, resourceId, title, views, visitors,
                   avgEngagedMs, entries, bounceRate }>,      // 조회수 상위 50
  devices: Array<{ device, sessions }>,
  audience: { member: number, external: number },             // 세션
  depth: Array<{ bucket: "1"|"2"|"3"|"4"|"5+", sessions }>,
  duration: Array<{ bucket: "<10s"|"10-30s"|"30s-1m"|"1-3m"|"3-10m"|"10m+", sessions }>,
  cohorts: Array<{ week: string, size: number, retention: Array<number | null> }>, // 8칸
  referrerOptions: string[],
}
```

과거 이력 규칙: `segmented = false`이면 `trend[].views`, `prevViews`, `summary.views`, `summary.prev.views`는 기존 `page_views` 합계에서 채운다(2026-05부터 전체 이력). 나머지 값과 `segmented = true`일 때의 모든 값은 이벤트에서 계산하고, `collected = false` 구간은 0이다.

알려진 한계: 조회 시 이벤트를 메모리로 읽는다. 한 요청에서 읽는 이벤트가 200,000행을 넘으면 SQL 사전 집계로 바꿔야 한다. 현재 트래픽으로는 2년치가 약 1만 행이다.

## 7. 화면

### 7.1 bklit UI 도입

- `apps/web/components.json`을 추가하고 bklit 레지스트리(`https://ui.bklit.com/r/{name}.json`)를 등록한 뒤 shadcn CLI로 필요한 항목만 가져온다: `utils`, `composed-chart`, `area-chart`, `line-chart`, `bar-chart`, `ring-chart`, `heatmap-chart`, `sankey-chart`, `chart-tooltip`, `legend`, `reference-area`, `x-axis`, `y-axis`, `grid`와 그 의존 항목.
- 소스는 `apps/web/components/charts/`(bklit 기본 위치), `cn`은 `apps/web/lib/utils.ts`에 둔다. 가져온 소스는 우리 코드로 취급해 수정할 수 있다.
- 색과 기본 토큰은 `app/(dashboard)/globals.css`에서만 정의한다. bklit이 쓰는 `--chart-1..5`, `--chart-grid`, `--chart-label`, `--chart-tooltip-*`, `--chart-crosshair` 등과 shadcn 기본 토큰(`--background`, `--foreground`, `--muted-foreground`, `--border` 등 실제로 쓰이는 것)을 기존 `--surface`, `--ink`, `--hairline`, `--primary` 계열에 연결하고 `.dark`에도 정의한다. 공개 사이트 CSS는 건드리지 않는다.
- 시리즈 색은 `dataviz` 스킬의 방법으로 라이트·다크 대비를 검증한다.
- 첫 구현 단계에서 히트맵이 범주형 격자(요일×시간, 코호트)를 그릴 수 있는지 확인한다. 안 되면 그 두 개만 같은 토큰으로 직접 그린 격자 컴포넌트로 대체한다.

### 7.2 레이아웃 (위에서 아래)

1. 헤더: 제목, 기간 설명, CSV 내려받기(추이 전체 지표)
2. 조회 옵션: 기존 기간 컨트롤 + 세그먼트 필터 4개 + 켜진 필터 칩(하나씩 해제, 전체 해제)
3. 수집 안내: `eventsTrackedSince` 이전 구간이 포함되면 한 줄 안내
4. KPI 6개: 기존 `StatTile` + 증감 + 지표별 미니 추이선(bklit line/area)
5. 추이: Composed. 선택 지표 실선, 이전 기간 점선, 방문자 지표일 때 신규/재방문 누적 영역, `collected = false` 구간은 회색 reference-area "수집 전"
6. 2열: 요일×시간 히트맵 | 구성 비율 Ring 3개(기기, 회원/외부, 신규/재방문)
7. 2열: 유입 경로 → 진입 페이지 Sankey | 세션 이동 경로 Sankey(1→2→3단계, 이탈 노드)
8. 2열: 세션 깊이 Bar | 체류 시간 분포 Bar
9. 주별 재방문 코호트 히트맵
10. 콘텐츠 표: 열 정렬, 활동·전시는 상세 링크

모바일에서는 모두 1열이다. 각 카드에 `<details>` "표로 보기"를 둔다(기존 추이 표 패턴). 데이터가 없는 카드는 이유를 담은 빈 상태를 보여 준다(수집 전 / 필터 결과 없음 / 기간에 기록 없음).

### 7.3 동작

- 서버 컴포넌트(`page.tsx`)가 첫 데이터를 읽고, 클라이언트 뷰가 기존처럼 오늘이 포함된 기간이면 10초마다 갱신한다.
- 필터 변경은 기존 `navigate` 패턴으로 URL을 바꾼다. `metric` 변경은 다시 불러오지 않고 클라이언트 상태와 URL만 바꾼다.
- 쿼리 파싱·직렬화는 `features/dashboard/stats/stats-range.ts`를 확장한다. 잘못된 값은 기본값으로 되돌린다.
- 기존 `stats-view.tsx`, `bar-list.tsx`, `top-content-list.tsx`는 새 화면으로 대체하고 쓰이지 않게 된 것은 지운다. `dashboard-page-views-chart.tsx`는 홈 위젯이 쓰므로 남긴다.

## 8. 테스트

API:

- `visitor-insights.ts` 단위 테스트: 세션 경계, 이탈률, 체류 미측정 제외, 신규/재방문, 코호트 null 칸, 세그먼트 필터, KST 요일·시간, 비교 기간.
- 라우트 테스트: UUID 없는 옛 본문은 이벤트를 쓰지 않음, 봇 UA 제외, 회원 플래그, 체류 전송의 max 반영과 30분 상한·24시간 창·visitor 불일치 무시, insights 쿼리 검증과 권한.
- D1 workers 테스트: 마이그레이션, 삽입 중복 무시, 보관 기간 삭제.
- OpenAPI 계약 스냅샷 갱신.

웹:

- `visitor-identity.ts` 단위 테스트: 생성, 유지, 30분 경계, localStorage 예외 시 임시 ID.
- `stats-range.ts` 확장 테스트: 필터 파싱·직렬화, 잘못된 값.
- e2e(목업 API): 필터 변경이 URL과 요청에 반영, 수집 전 안내, 빈 데이터, 표로 보기, axe 접근성 검사.

## 9. 작업 순서

1. 수집: 테이블·마이그레이션, 기록 API 확장, 체류 API, 트래커, 푸터 고지, 보관 크론. 먼저 배포해 데이터를 쌓기 시작한다.
2. 집계: 계산 모듈, insights API, 계약.
3. bklit 도입: components.json, 차트 소스, 토큰 연결, 히트맵 범주형 확인.
4. 화면: 조회 옵션, 섹션별 차트, 표로 보기, e2e.

## 10. 범위 밖

- MCP 도구 추가(필요하면 insights를 감싸는 도구를 따로 만든다)
- 실시간 접속자 수
- 개인 단위 방문 기록 조회
- 기존 `page_views`·`page_view_entries` 수집 중단이나 이전
