# 방문자 분석(Visitor Insights) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 사이트에서 익명 방문자·세션 단위 이벤트를 수집하고, `/dashboard/stats`를 세그먼트 필터와 bklit UI 차트로 사용 패턴을 분석하는 화면으로 바꾼다.

**Architecture:** 페이지뷰 1회를 D1 `analytics_events` 한 행으로 저장하고, 조회 시 이벤트를 읽어 순수 함수(`visitor-insights.ts`)로 모든 지표를 계산한다. 필터가 없을 때 페이지뷰는 기존 `page_views` 합계에서 가져와 과거 이력을 유지한다. 웹은 bklit 레지스트리 소스를 `components/charts`에 가져와 대시보드 토큰으로 색을 입힌다.

**Tech Stack:** Cloudflare Workers + Hono(zod-openapi) + Drizzle/D1, Next.js 16 App Router, React 19, Tailwind 4, bklit UI(visx 4, motion), Vitest 4/5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-visitor-insights-design.md`

## Global Constraints

- 모든 작업은 `dev` 브랜치에서 한다. 태스크마다 커밋한다. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 날짜·요일·시간은 모두 KST. 주 시작은 월요일(월=0).
- 세션 만료: 마지막 활동 후 **30분** (`SESSION_TIMEOUT_MS = 1_800_000`).
- 체류 시간 상한: 페이지뷰당 **30분** (`MAX_ENGAGED_MS = 1_800_000`). 체류 전송은 페이지뷰 후 **24시간** 안의 행만 갱신.
- 원시 이벤트 보관: **731일**. 조회 최대 기간도 731일(기존 `MAX_ANALYTICS_RANGE_DAYS`).
- IP·UA 원문, 회원 ID를 저장하지 않는다. 회원 여부는 boolean만.
- 봇 UA 패턴: `/bot|crawl|spider|slurp|headless|lighthouse|preview/i`. 이벤트만 거르고 기존 일 단위 합계는 그대로.
- 코호트 8주, 콘텐츠 표 상위 50, 유입 흐름 상위 6 + `other`, 유입 선택지 상위 10.
- 기존 `GET /api/admin/page-views/analytics`, `/stats`, `/dashboard` 엔드포인트, MCP 도구, 홈 위젯(`dashboard-page-views-chart.tsx`)은 바꾸지 않는다.
- 새 색은 `app/(dashboard)/globals.css`에만 정의한다. 공개 사이트 CSS(`app/(home)/globals.css`)는 건드리지 않는다.
- 차트 색(검증 완료, dataviz 검증기 6개 검사 통과):
  - 라이트(surface `#ffffff`): `--chart-1 #0075de`, `--chart-2 #dd5b00`, `--chart-3 #009b8f`, `--chart-4 #9b5fd0`, `--chart-5 var(--ink-muted)`
  - 다크(surface `#232322`): `--chart-1 #3b8fe8`, `--chart-2 #e2701f`, `--chart-3 #13a89a`, `--chart-4 #9d6fd6`, `--chart-5 var(--ink-muted)`
  - 색 배정은 엔티티 고정: 홈=1, 활동=2, 전시=3, 공지=4, 이탈/기타=5 · 모바일=1, 데스크톱=2, 태블릿=3 · 외부=1, 회원=2 · 신규=1, 재방문=3 · 선택 기간=1, 이전 기간=5(점선)
- 모든 차트 카드에 `<details>` "표로 보기"를 둔다. 텍스트는 차트 색이 아니라 ink 토큰을 쓴다.
- 코드 주석은 "왜"만 쓴다(antislop). 기존 파일의 스타일·주석 밀도를 따른다.

## Review Focus

- **localStorage가 막힌 브라우저**(Safari 프라이빗, 저장소 차단): 예외 없이 임시 ID로 이벤트를 보내고 기존 합계도 기록돼야 한다. → Task 4 `throwing storage` 테스트.
- **수집 시작 전 기간 + 필터 켬**: 오류 없이 모든 섹션이 0/빈 배열이고 추이가 `collected: false`여야 한다. → Task 6 `빈 입력` 테스트, Task 14 e2e `수집 전 안내`.
- **캐시된 옛 클라이언트가 ID 없이 보낸 요청**: 기존 합계는 기록되고 이벤트는 쓰지 않아야 한다. → Task 2 테스트.
- **주 단위 + 목요일 시작 기간**: 첫 버킷 라벨이 기간 첫날이고 이전 기간이 같은 길이 구간과 짝지어져야 한다. → Task 6 `주 단위 추이` 테스트.
- **다크 테마·모바일 폭에서 차트**: 가로 넘침 없고 글자 대비가 유지돼야 한다. → Task 14 e2e 테마 테스트(기존 유지).

---

## File Structure

API (`apps/api`)

| 파일 | 책임 |
|---|---|
| `src/platform/db/schema/analytics.ts` (수정) | `analyticsEvents` 테이블 |
| `drizzle/0015_analytics_events.sql` (생성) | 마이그레이션 |
| `src/lib/views/page-view-target.ts` (수정) | `isUuid`, `isBotUserAgent` |
| `src/lib/services/types.ts` (수정) | 이벤트·세그먼트·인사이트 타입, DataService 메서드 |
| `src/features/page-views/visitor-events.repository.ts` (생성) | 이벤트 쓰기·체류 갱신·보관 삭제·인사이트 조회 |
| `src/features/page-views/visitor-insights.ts` (생성) | 순수 집계 함수 |
| `src/features/page-views/page-view-analytics.ts` (수정) | `bucketKey`, `mondayOf` export |
| `src/features/page-views/page-view.contract.ts` (수정) | 요청·응답 스키마 |
| `src/features/page-views/page-view.routes.ts` (수정) | 기록 확장, 체류·인사이트 라우트 |
| `src/platform/db/data-service-composition.ts` (수정) | 배선 |
| `src/index.ts` (수정) | 보관 크론 |
| `src/tests/visitor-insights.test.ts` (생성) | 집계 단위 테스트 |
| `src/tests/page-views.routes.test.ts` (수정) | 라우트 테스트 |
| `tests/integration/visitor-events.runtime.test.ts` (생성) | D1 테스트 |

Contracts (`packages/contracts`)

| 파일 | 책임 |
|---|---|
| `src/api/dashboard.ts` (수정) | `apiVisitorInsightsSchema`, 타입 |
| `src/api-contracts.ts`, `src/api-schemas.ts` (수정) | export |

Web (`apps/web`)

| 파일 | 책임 |
|---|---|
| `features/public/analytics/visitor-identity.ts` (생성) | 방문자·세션 ID |
| `features/public/analytics/engagement-timer.ts` (생성) | 보이는 시간 누적 |
| `app/_components/page-view-tracker.tsx` (수정) | ID·체류 전송 |
| `app/(home)/_components/site-footer.tsx` (수정) | 고지 문구 |
| `features/dashboard/stats/stats-range.ts` (수정) | 필터·지표 URL 파싱 |
| `features/dashboard/stats/insights-format.ts` (생성) | 라벨·숫자 포맷·CSV |
| `features/dashboard/stats/insights-chart-data.ts` (생성) | API 응답 → 차트 데이터 |
| `features/dashboard/services/admin-read-service.ts` (수정) | `getAdminVisitorInsights` |
| `components.json`, `lib/utils.ts`, `components/charts/**` (생성) | bklit 소스 |
| `app/(dashboard)/globals.css` (수정) | 차트 토큰 |
| `app/(dashboard)/dashboard/stats/page.tsx` (수정) | 인사이트 조회 |
| `app/(dashboard)/dashboard/stats/stats-view.tsx` (재작성) | 화면 조립·폴링 |
| `app/(dashboard)/dashboard/stats/_components/*.tsx` | 섹션 컴포넌트 |
| `tests/e2e/mock-api/server.ts`, `tests/e2e/page-view-stats.spec.ts` (수정) | e2e |

---

## Phase A: 수집 (Task 1–5) — 끝나면 배포해 데이터를 쌓기 시작한다

### Task 1: `analytics_events` 테이블과 쓰기 저장소

**Files:**
- Modify: `apps/api/src/platform/db/schema/analytics.ts`
- Create: `apps/api/drizzle/0015_analytics_events.sql` (drizzle-kit 생성)
- Modify: `apps/api/src/lib/services/types.ts`
- Create: `apps/api/src/features/page-views/visitor-events.repository.ts`
- Test: `apps/api/tests/integration/visitor-events.runtime.test.ts`

**Interfaces:**
- Produces:
  - `type AnalyticsEventRow = { id: string; visitorId: string; sessionId: string; visitedAt: number; pageType: PageViewType; resourceId: string; referrerHost: string | null; device: PageViewDevice; isMember: boolean; engagedMs: number | null }`
  - `type NewAnalyticsEvent = Omit<AnalyticsEventRow, "engagedMs">`
  - `createVisitorEventRepository(db)` → `{ recordAnalyticsEvent(event: NewAnalyticsEvent): Promise<void>; recordEngagement(input: { pageviewId: string; visitorId: string; engagedMs: number; nowMs: number }): Promise<void>; purgeAnalyticsEventsBefore(cutoffMs: number): Promise<void> }`
  - `MAX_ENGAGED_MS = 1_800_000`, `ANALYTICS_EVENT_RETENTION_MS = 731 * 86_400_000`

- [ ] **Step 1: 스키마 추가**

`apps/api/src/platform/db/schema/analytics.ts` 끝에 추가:

```ts
/**
 * 페이지뷰 1회 = 1행. 방문자·세션 ID는 브라우저가 만든 무작위 UUID라 개인을 가리키지 않는다.
 * referrer_host는 세션 첫 페이지뷰에만 채운다.
 */
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id").notNull(),
    visitedAt: integer("visited_at", { mode: "timestamp_ms" }).notNull(),
    pageType: text("page_type").notNull(),
    resourceId: text("resource_id").notNull(),
    referrerHost: text("referrer_host"),
    device: text("device").notNull(),
    isMember: integer("is_member", { mode: "boolean" }).notNull(),
    engagedMs: integer("engaged_ms"),
  },
  (table) => [
    index("analytics_events_visited_at_idx").on(table.visitedAt),
    index("analytics_events_visitor_visited_at_idx").on(
      table.visitorId,
      table.visitedAt,
    ),
    index("analytics_events_session_idx").on(table.sessionId),
  ],
);
```

`schema/index.ts`는 이미 `export * from "./analytics"`이므로 수정할 필요 없다.

- [ ] **Step 2: 마이그레이션 생성**

Run: `pnpm --filter @yonyoung/api exec drizzle-kit generate --name analytics_events`
Expected: `apps/api/drizzle/0015_analytics_events.sql`, `drizzle/meta/0015_snapshot.json`, `_journal.json` 갱신. SQL에 `CREATE TABLE \`analytics_events\``와 인덱스 3개만 있는지 확인한다. 다른 테이블 변경이 섞여 있으면 멈추고 원인을 확인한다.

- [ ] **Step 3: 타입 추가**

`apps/api/src/lib/services/types.ts`의 `PageViewAnalyticsEntity` 정의 아래에 추가:

```ts
export type AnalyticsEventRow = {
  id: string;
  visitorId: string;
  sessionId: string;
  visitedAt: number;
  pageType: PageViewType;
  resourceId: string;
  referrerHost: string | null;
  device: PageViewDevice;
  isMember: boolean;
  engagedMs: number | null;
};

export type NewAnalyticsEvent = Omit<AnalyticsEventRow, "engagedMs">;
```

- [ ] **Step 4: 실패하는 D1 테스트 작성**

`apps/api/tests/integration/visitor-events.runtime.test.ts`:

```ts
import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createVisitorEventRepository } from "../../src/features/page-views/visitor-events.repository";
import createDB from "../../src/lib/db";

const db = env.db as D1Database;
const HOUR_MS = 60 * 60 * 1000;
const V1 = "11111111-1111-4111-8111-111111111111";
const S1 = "22222222-2222-4222-8222-222222222222";

const event = (id: string, visitedAt: number) => ({
  id,
  visitorId: V1,
  sessionId: S1,
  visitedAt,
  pageType: "home" as const,
  resourceId: "home",
  referrerHost: "direct",
  device: "desktop" as const,
  isMember: false,
});

const readEngaged = async (id: string) =>
  (
    await db
      .prepare("SELECT engaged_ms FROM analytics_events WHERE id = ?")
      .bind(id)
      .first<{ engaged_ms: number | null }>()
  )?.engaged_ms;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
});

describe("analytics_events 쓰기", () => {
  it("같은 pageviewId를 두 번 보내도 한 행만 남는다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("dup-1", now));
    await repository.recordAnalyticsEvent(event("dup-1", now));

    const row = await db
      .prepare("SELECT count(*) AS n FROM analytics_events WHERE id = 'dup-1'")
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
  });

  it("체류 시간은 큰 값만 반영하고 30분으로 자른다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("eng-1", now));

    await repository.recordEngagement({ pageviewId: "eng-1", visitorId: V1, engagedMs: 5000, nowMs: now });
    await repository.recordEngagement({ pageviewId: "eng-1", visitorId: V1, engagedMs: 3000, nowMs: now });
    expect(await readEngaged("eng-1")).toBe(5000);

    await repository.recordEngagement({ pageviewId: "eng-1", visitorId: V1, engagedMs: 99 * 60 * 1000, nowMs: now });
    expect(await readEngaged("eng-1")).toBe(30 * 60 * 1000);
  });

  it("다른 방문자나 24시간이 지난 페이지뷰의 체류는 무시한다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("eng-2", now - 25 * HOUR_MS));
    await repository.recordAnalyticsEvent(event("eng-3", now));

    await repository.recordEngagement({ pageviewId: "eng-2", visitorId: V1, engagedMs: 5000, nowMs: now });
    await repository.recordEngagement({
      pageviewId: "eng-3",
      visitorId: "33333333-3333-4333-8333-333333333333",
      engagedMs: 5000,
      nowMs: now,
    });

    expect(await readEngaged("eng-2")).toBeNull();
    expect(await readEngaged("eng-3")).toBeNull();
  });

  it("보관 기간이 지난 행만 지운다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("old-1", now - 800 * 24 * HOUR_MS));
    await repository.recordAnalyticsEvent(event("new-1", now));

    await repository.purgeAnalyticsEventsBefore(now - 731 * 24 * HOUR_MS);

    const ids = await db
      .prepare("SELECT id FROM analytics_events WHERE id IN ('old-1', 'new-1')")
      .all<{ id: string }>();
    expect(ids.results.map((row) => row.id)).toEqual(["new-1"]);
  });
});
```

- [ ] **Step 5: 실패 확인**

Run: `pnpm --filter @yonyoung/api test:workers -- visitor-events`
Expected: FAIL — `visitor-events.repository` 모듈 없음.

- [ ] **Step 6: 저장소 구현**

`apps/api/src/features/page-views/visitor-events.repository.ts`:

```ts
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type createDB from "../../lib/db";
import { analyticsEvents } from "../../platform/db/schema";
import type { NewAnalyticsEvent } from "../../lib/services/types";

type Database = ReturnType<typeof createDB>;

const DAY_MS = 24 * 60 * 60 * 1000;
// 체류 전송은 페이지를 떠날 때 오므로 하루가 지난 행을 고칠 이유가 없다. 공개 엔드포인트라 갱신 범위를 좁힌다.
const ENGAGEMENT_WINDOW_MS = DAY_MS;
/** 자리 비움 탭이 평균을 부풀리지 않도록 페이지뷰 1회 체류를 자른다. */
export const MAX_ENGAGED_MS = 30 * 60 * 1000;
export const ANALYTICS_EVENT_RETENTION_MS = 731 * DAY_MS;

export const createVisitorEventRepository = (db: Database) => ({
  async recordAnalyticsEvent(event: NewAnalyticsEvent): Promise<void> {
    await db
      .insert(analyticsEvents)
      .values({ ...event, visitedAt: new Date(event.visitedAt) })
      .onConflictDoNothing({ target: analyticsEvents.id });
  },

  /** 클라이언트는 누적 총량을 보낸다. 큰 값만 남기므로 재전송·순서 뒤바뀜에 안전하다. */
  async recordEngagement(input: {
    pageviewId: string;
    visitorId: string;
    engagedMs: number;
    nowMs: number;
  }): Promise<void> {
    const engagedMs = Math.min(input.engagedMs, MAX_ENGAGED_MS);
    await db
      .update(analyticsEvents)
      .set({
        engagedMs: sql`max(coalesce(${analyticsEvents.engagedMs}, 0), ${engagedMs})`,
      })
      .where(
        and(
          eq(analyticsEvents.id, input.pageviewId),
          eq(analyticsEvents.visitorId, input.visitorId),
          gte(analyticsEvents.visitedAt, new Date(input.nowMs - ENGAGEMENT_WINDOW_MS)),
        ),
      );
  },

  async purgeAnalyticsEventsBefore(cutoffMs: number): Promise<void> {
    await db
      .delete(analyticsEvents)
      .where(lt(analyticsEvents.visitedAt, new Date(cutoffMs)));
  },
});
```

- [ ] **Step 7: 통과 확인**

Run: `pnpm --filter @yonyoung/api test:workers -- visitor-events`
Expected: PASS 4개.

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/platform/db/schema/analytics.ts apps/api/drizzle apps/api/src/lib/services/types.ts apps/api/src/features/page-views/visitor-events.repository.ts apps/api/tests/integration/visitor-events.runtime.test.ts
git commit -m "feat: 방문자 이벤트 테이블과 쓰기 저장소 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 기록 라우트 확장과 체류 시간 라우트

**Files:**
- Modify: `apps/api/src/lib/views/page-view-target.ts`
- Modify: `apps/api/src/features/page-views/page-view.contract.ts`
- Modify: `apps/api/src/features/page-views/page-view.routes.ts`
- Modify: `apps/api/src/lib/services/types.ts` (DataService)
- Modify: `apps/api/src/platform/db/data-service-composition.ts`
- Test: `apps/api/src/tests/page-views.routes.test.ts`
- Update: `apps/api/src/tests/__snapshots__/openapi-contract.snapshot.test.ts.snap`

**Interfaces:**
- Consumes: Task 1 `createVisitorEventRepository`, `NewAnalyticsEvent`
- Produces:
  - `isUuid(value: string | undefined): value is string`, `isBotUserAgent(userAgent: string | undefined): boolean`
  - DataService: `recordAnalyticsEvent(event: NewAnalyticsEvent): Promise<void>`, `recordEngagement(input: { pageviewId: string; visitorId: string; engagedMs: number; nowMs: number }): Promise<void>`
  - 요청 본문 필드: `visitorId?`, `sessionId?`, `pageviewId?`, `sessionStart?: boolean`, `sessionReferrerHost?`
  - `POST /api/public/page-views/engagement` 본문 `{ pageviewId: uuid; visitorId: uuid; engagedMs: int 0..1_800_000 }` → `{ ok: true }`

- [ ] **Step 1: 실패하는 라우트 테스트 작성**

`apps/api/src/tests/page-views.routes.test.ts` 맨 아래 `describe("page-views routes", ...)` 블록 안에 추가:

```ts
  describe("방문자 이벤트 기록", () => {
    const VISIT = {
      visitorId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      pageviewId: "33333333-3333-4333-8333-333333333333",
    };
    const post = (
      app: ReturnType<typeof createTestApp>,
      body: unknown,
      userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
    ) =>
      app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": userAgent },
        body: JSON.stringify(body),
      });

    it("세션 첫 페이지뷰는 유입 경로·기기·회원 여부와 함께 이벤트로 남긴다", async () => {
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({
          recordPageView: async () => undefined,
          recordAnalyticsEvent,
        }),
      });

      await post(app, {
        pageType: "home",
        ...VISIT,
        sessionStart: true,
        sessionReferrerHost: "www.Google.com",
      });

      expect(recordAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: VISIT.pageviewId,
          visitorId: VISIT.visitorId,
          sessionId: VISIT.sessionId,
          pageType: "home",
          resourceId: "home",
          referrerHost: "google.com",
          device: "mobile",
          isMember: true,
        }),
      );
    });

    it("세션 중간 페이지뷰는 유입 경로를 비우고, 비로그인은 회원이 아니다", async () => {
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: async () => undefined,
          recordAnalyticsEvent,
        }),
      });

      await post(app, { pageType: "home", ...VISIT });

      expect(recordAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({ referrerHost: null, isMember: false }),
      );
    });

    it("세션 시작인데 유입 경로가 없으면 직접 접속으로 남긴다", async () => {
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: async () => undefined,
          recordAnalyticsEvent,
        }),
      });

      await post(app, { pageType: "home", ...VISIT, sessionStart: true });

      expect(recordAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({ referrerHost: "direct" }),
      );
    });

    it("ID가 없는 옛 클라이언트 요청은 합계만 기록하고 이벤트는 남기지 않는다", async () => {
      const recordPageView = fn(async () => undefined);
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordPageView, recordAnalyticsEvent }),
      });

      const response = await post(app, { pageType: "home", visitorId: "not-a-uuid" });

      expect(response.status).toBe(200);
      expect(recordPageView).toHaveBeenCalledWith("home", "home");
      expect(recordAnalyticsEvent).not.toHaveBeenCalled();
    });

    it("봇 UA는 이벤트를 남기지 않는다", async () => {
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: async () => undefined,
          recordAnalyticsEvent,
        }),
      });

      await post(
        app,
        { pageType: "home", ...VISIT },
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      );

      expect(recordAnalyticsEvent).not.toHaveBeenCalled();
    });

    it("회원 확인이 실패해도 비회원으로 기록한다", async () => {
      const recordAnalyticsEvent = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        resolveActor: async () => {
          throw new Error("session lookup failed");
        },
        dataService: createDataServiceMock({
          recordPageView: async () => undefined,
          recordAnalyticsEvent,
        }),
      });

      await post(app, { pageType: "home", ...VISIT });

      expect(recordAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({ isMember: false }),
      );
    });
  });

  describe("POST /api/public/page-views/engagement", () => {
    const BODY = {
      pageviewId: "33333333-3333-4333-8333-333333333333",
      visitorId: "11111111-1111-4111-8111-111111111111",
      engagedMs: 12_000,
    };
    const post = (app: ReturnType<typeof createTestApp>, body: unknown) =>
      app.request("/api/public/page-views/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    it("체류 시간을 기록한다", async () => {
      const recordEngagement = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordEngagement }),
      });

      const response = await post(app, BODY);

      expect(response.status).toBe(200);
      expect(recordEngagement).toHaveBeenCalledWith(
        expect.objectContaining({ ...BODY, nowMs: expect.any(Number) }),
      );
    });

    it("형식이 틀리면 400이다", async () => {
      const app = createTestApp({ actor: null });
      const response = await post(app, { ...BODY, engagedMs: -1 });
      await expectErrorCode(response, 400);
    });

    it("레이트리밋에 걸리면 기록하지 않고 200을 돌려준다", async () => {
      const recordEngagement = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        allowPageViewWrite: () => false,
        dataService: createDataServiceMock({ recordEngagement }),
      });

      const response = await post(app, BODY);

      expect(response.status).toBe(200);
      expect(recordEngagement).not.toHaveBeenCalled();
    });
  });
```

`expectErrorCode`의 실제 시그니처를 `src/tests/test-helpers.ts`에서 확인하고, 두 번째 인자가 상태 코드가 아니라 에러 코드 문자열이면 같은 파일의 기존 400 테스트와 같은 형태로 맞춘다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @yonyoung/api test:node -- page-views.routes`
Expected: FAIL — `recordAnalyticsEvent` 호출 없음, engagement 404.

- [ ] **Step 3: 식별·봇 판정 함수**

`apps/api/src/lib/views/page-view-target.ts` 끝에 추가:

```ts
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string | undefined): value is string =>
  value !== undefined && UUID_PATTERN.test(value);

// 자바스크립트를 실행하는 크롤러(구글 렌더러 등)도 트래커를 돌린다. 방문자 지표에서만 뺀다.
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview/i;

export const isBotUserAgent = (userAgent: string | undefined): boolean =>
  userAgent !== undefined && BOT_PATTERN.test(userAgent);
```

- [ ] **Step 4: 계약 확장**

`apps/api/src/features/page-views/page-view.contract.ts`의 `ApiRecordPageViewRequestSchema` 객체에서 `referrerHost` 필드 다음에 추가:

```ts
    // UUID 검증은 라우트가 한다. 형식이 틀려도 기존 합계 기록은 400 없이 살려야 하기 때문이다.
    visitorId: z.string().max(64).optional().openapi({
      description: "브라우저가 만든 익명 방문자 UUID",
      example: "11111111-1111-4111-8111-111111111111",
    }),
    sessionId: z.string().max(64).optional().openapi({
      description: "30분 비활성 기준 세션 UUID",
      example: "22222222-2222-4222-8222-222222222222",
    }),
    pageviewId: z.string().max(64).optional().openapi({
      description: "이번 페이지뷰 UUID. 체류 시간 전송에 쓴다",
      example: "33333333-3333-4333-8333-333333333333",
    }),
    sessionStart: z.boolean().optional().openapi({
      description: "새 세션의 첫 페이지뷰이면 true",
      example: true,
    }),
    sessionReferrerHost: z.string().max(253).optional().openapi({
      description: "세션 시작 시 외부 유입 호스트명. 직접 접속이면 생략",
      example: "google.com",
    }),
```

같은 파일의 `ApiRecordPageViewRequestSchema` 정의 다음에 추가:

```ts
export const ApiRecordEngagementRequestSchema = z
  .object({
    pageviewId: z.string().uuid().openapi({ example: "33333333-3333-4333-8333-333333333333" }),
    visitorId: z.string().uuid().openapi({ example: "11111111-1111-4111-8111-111111111111" }),
    engagedMs: z.number().int().min(0).max(1_800_000).openapi({
      description: "페이지가 보인 누적 시간(ms). 페이지뷰당 최대 30분",
      example: 12000,
    }),
  })
  .strict()
  .openapi("ApiRecordEngagementRequest");
```

- [ ] **Step 5: DataService 타입과 배선**

`apps/api/src/lib/services/types.ts`의 DataService 타입에서 `recordPageViewEntry` 선언 다음에 추가(파일 상단 import에 `NewAnalyticsEvent`는 같은 파일이므로 불필요):

```ts
  recordAnalyticsEvent: (event: NewAnalyticsEvent) => Promise<void>;
  recordEngagement: (input: {
    pageviewId: string;
    visitorId: string;
    engagedMs: number;
    nowMs: number;
  }) => Promise<void>;
```

`apps/api/src/platform/db/data-service-composition.ts`:

```ts
import { createVisitorEventRepository } from "../../features/page-views/visitor-events.repository";
```

`const pageViewRepository = createPageViewRepository(db);` 다음 줄:

```ts
  const visitorEventRepository = createVisitorEventRepository(db);
```

`getPageViewAnalytics: pageViewRepository.getPageViewAnalytics,` 다음 줄:

```ts
    recordAnalyticsEvent: visitorEventRepository.recordAnalyticsEvent,
    recordEngagement: visitorEventRepository.recordEngagement,
```

- [ ] **Step 6: 라우트 구현**

`apps/api/src/features/page-views/page-view.routes.ts`:

import 수정:

```ts
import {
  ApiDashboardPageViewStatsSchema,
  ApiPageViewAnalyticsQuerySchema,
  ApiPageViewAnalyticsSchema,
  ApiPageViewStatsSchema,
  ApiRecordEngagementRequestSchema,
  ApiRecordPageViewRequestSchema,
} from "./page-view.contract";
```

```ts
import {
  classifyDevice,
  isBotUserAgent,
  isUuid,
  normalizePageViewResourceId,
  normalizeReferrerHost,
} from "../../lib/views/page-view-target";
```

`recordPageViewRoute` 정의 다음에 추가:

```ts
const recordEngagementRoute = createRoute({
  method: "post",
  path: "/api/public/page-views/engagement",
  tags: ["Public"],
  operationId: "recordPageViewEngagement",
  request: {
    body: jsonBody(ApiRecordEngagementRequestSchema, "체류 시간 기록 요청 본문"),
  },
  responses: {
    200: {
      description: "체류 시간 기록 처리 결과 (실패해도 200으로 응답)",
      content: {
        "application/json": {
          schema: RecordPageViewResponseSchema,
        },
      },
    },
    400: errorResponses[400],
  },
});
```

`recordPageViewRoute` 핸들러에서 `// 2. aggregated count 업데이트` 블록이 끝난 뒤, `return c.json({ ok: true } as const, 200);` 바로 앞에 추가:

```ts
    const { visitorId, sessionId, pageviewId } = parsed.data;
    const userAgent = c.req.header("user-agent");
    if (
      isUuid(visitorId) &&
      isUuid(sessionId) &&
      isUuid(pageviewId) &&
      !isBotUserAgent(userAgent)
    ) {
      let isMember = false;
      try {
        isMember = (await dependencies.resolveActor(c)) !== null;
      } catch {
        // 세션 조회가 실패해도 방문 기록은 남긴다.
      }
      try {
        await dataService.recordAnalyticsEvent({
          id: pageviewId,
          visitorId,
          sessionId,
          visitedAt: Date.now(),
          pageType,
          resourceId,
          referrerHost:
            parsed.data.sessionStart === true
              ? normalizeReferrerHost(parsed.data.sessionReferrerHost)
              : null,
          device: classifyDevice(userAgent),
          isMember,
        });
      } catch {
        // fire-and-forget: 기록 실패는 무시
      }
    }
```

`registerPageViewRoutes` 안, `app.openapi(getPageViewStatsRoute, ...)` 앞에 추가:

```ts
  app.openapi(recordEngagementRoute, async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw AppError.badRequest("잘못된 요청 본문입니다.");
    }

    const parsed = ApiRecordEngagementRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.badRequest(
        parsed.error.issues[0]?.message ?? "잘못된 요청입니다.",
      );
    }

    if (!(await dependencies.allowPageViewWrite(c))) {
      return c.json({ ok: true } as const, 200);
    }

    try {
      await dependencies
        .getDataService(c)
        .recordEngagement({ ...parsed.data, nowMs: Date.now() });
    } catch {
      // fire-and-forget: 기록 실패는 무시
    }
    return c.json({ ok: true } as const, 200);
  });
```

- [ ] **Step 7: 통과 확인**

Run: `pnpm --filter @yonyoung/api test:node -- page-views.routes`
Expected: PASS (기존 + 신규 9개)

- [ ] **Step 8: OpenAPI 스냅샷 갱신**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/openapi-contract.snapshot.test.ts -u`
Expected: 스냅샷에 `ApiRecordEngagementRequest`, `/api/public/page-views/engagement`, 요청 본문 신규 필드만 추가. 다른 변경이 있으면 멈추고 확인한다.

Run: `pnpm --filter @yonyoung/api test:node && pnpm --filter @yonyoung/api typecheck`
Expected: 전부 PASS.

- [ ] **Step 9: 커밋**

```bash
git add apps/api/src
git commit -m "feat: 방문자 이벤트와 체류 시간 기록 API 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 원시 이벤트 보관 크론

**Files:**
- Modify: `apps/api/src/index.ts`

**Interfaces:**
- Consumes: Task 1 `createVisitorEventRepository`, `ANALYTICS_EVENT_RETENTION_MS`

삭제 로직은 Task 1의 D1 테스트(`보관 기간이 지난 행만 지운다`)가 검증했다. 이 태스크는 크론 배선만 한다.

- [ ] **Step 1: 크론에 추가**

`apps/api/src/index.ts` 상단 import에 추가(기존 `resolveD1Database` import는 이미 있음):

```ts
import createDB from "./lib/db";
import {
  ANALYTICS_EVENT_RETENTION_MS,
  createVisitorEventRepository,
} from "./features/page-views/visitor-events.repository";
```

`scheduled` 핸들러의 기존 `ctx.waitUntil(...)` 다음에 추가:

```ts
  // R2 정리와 독립적으로 돌린다. 한쪽 실패가 다른 쪽을 막지 않게 한다.
  ctx.waitUntil(
    createVisitorEventRepository(createDB(resolveD1Database(env)))
      .purgeAnalyticsEventsBefore(Date.now() - ANALYTICS_EVENT_RETENTION_MS)
      .catch((error: unknown) => {
        logger.error({
          event: "analytics.retention_purge.failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }),
  );
```

`createDB`의 실제 경로·기본 export 여부를 `src/lib/db` 파일에서 확인하고 맞춘다(다른 파일들은 `import createDB from "../../lib/db"`를 쓴다).

- [ ] **Step 2: 검증**

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api test`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/index.ts
git commit -m "feat: 731일 지난 방문자 이벤트를 매일 정리

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 브라우저 방문자 식별과 체류 타이머

**Files:**
- Create: `apps/web/features/public/analytics/visitor-identity.ts`
- Create: `apps/web/features/public/analytics/engagement-timer.ts`
- Test: `apps/web/tests/unit/features/public/visitor-identity.test.ts`
- Test: `apps/web/tests/unit/features/public/engagement-timer.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_TIMEOUT_MS = 1_800_000`
  - `createVisitIdentity(storage: StorageLike | null, newId?: () => string)` → `{ resolve(nowMs: number): { visitorId: string; sessionId: string; sessionStart: boolean }; touch(nowMs: number): void }`
  - `createEngagementTimer(nowMs: number, visible: boolean)` → `{ pause(nowMs): void; resume(nowMs): void; total(nowMs): number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/tests/unit/features/public/visitor-identity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SESSION_TIMEOUT_MS,
  createVisitIdentity,
} from "@/features/public/analytics/visitor-identity";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

const sequentialIds = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};

describe("createVisitIdentity", () => {
  it("첫 방문에 방문자와 세션을 만들고 세션 시작으로 표시한다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const visit = identity.resolve(1_000);
    expect(visit).toEqual({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      sessionStart: true,
    });
  });

  it("30분 안의 다음 페이지뷰는 같은 세션이다", () => {
    const storage = memoryStorage();
    const identity = createVisitIdentity(storage, sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(SESSION_TIMEOUT_MS);
    expect(second).toEqual({ ...first, sessionStart: false });
  });

  it("30분이 넘게 쉬면 같은 방문자의 새 세션이다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(SESSION_TIMEOUT_MS + 1);
    expect(second.visitorId).toBe(first.visitorId);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.sessionStart).toBe(true);
  });

  it("touch는 세션 만료 시점을 늦춘다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const first = identity.resolve(0);
    identity.touch(SESSION_TIMEOUT_MS);
    const second = identity.resolve(SESSION_TIMEOUT_MS * 2);
    expect(second.sessionId).toBe(first.sessionId);
  });

  it("다른 탭(같은 저장소)도 같은 방문자·세션을 본다", () => {
    const storage = memoryStorage();
    const ids = sequentialIds();
    const first = createVisitIdentity(storage, ids).resolve(0);
    const otherTab = createVisitIdentity(storage, ids).resolve(1_000);
    expect(otherTab).toEqual({ ...first, sessionStart: false });
  });

  it("저장소가 예외를 던져도 메모리 ID로 계속 동작한다", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const identity = createVisitIdentity(throwing, sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(1_000);
    expect(second).toEqual({ ...first, sessionStart: false });
  });

  it("손상된 저장값은 버리고 새로 만든다", () => {
    const storage = memoryStorage();
    storage.setItem("yy_vid", "not-a-uuid");
    storage.setItem("yy_sess", "{broken");
    const visit = createVisitIdentity(storage, sequentialIds()).resolve(0);
    expect(visit.visitorId).toBe("00000000-0000-4000-8000-000000000001");
    expect(visit.sessionStart).toBe(true);
  });
});
```

`apps/web/tests/unit/features/public/engagement-timer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEngagementTimer } from "@/features/public/analytics/engagement-timer";

describe("createEngagementTimer", () => {
  it("보이는 동안의 시간만 더한다", () => {
    const timer = createEngagementTimer(0, true);
    timer.pause(1_000);
    timer.resume(5_000);
    expect(timer.total(7_000)).toBe(3_000);
  });

  it("숨겨진 상태로 시작하면 resume 전까지 0이다", () => {
    const timer = createEngagementTimer(0, false);
    expect(timer.total(10_000)).toBe(0);
    timer.resume(10_000);
    expect(timer.total(12_000)).toBe(2_000);
  });

  it("pause·resume을 거듭 불러도 중복으로 세지 않는다", () => {
    const timer = createEngagementTimer(0, true);
    timer.pause(1_000);
    timer.pause(2_000);
    timer.resume(3_000);
    timer.resume(4_000);
    expect(timer.total(5_000)).toBe(3_000);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/public`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`apps/web/features/public/analytics/visitor-identity.ts`:

```ts
/** 업계 표준 세션 경계. 마지막 활동 후 이 시간이 지나면 새 세션이다. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const VISITOR_KEY = "yy_vid";
const SESSION_KEY = "yy_sess";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StoredSession = { id: string; lastActiveAt: number };

export type VisitContext = {
  visitorId: string;
  sessionId: string;
  sessionStart: boolean;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

// 프라이빗 모드나 저장소 차단에서는 접근 자체가 예외를 던진다. 그때는 메모리 값으로 이어 간다.
const read = (storage: StorageLike | null, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (storage: StorageLike | null, key: string, value: string) => {
  try {
    storage?.setItem(key, value);
  } catch {
    // 메모리 값이 남아 있으므로 이 문서 안에서는 계속 같은 ID를 쓴다.
  }
};

const parseSession = (raw: string | null): StoredSession | null => {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "lastActiveAt" in value &&
      isUuid(value.id) &&
      typeof value.lastActiveAt === "number"
    ) {
      return { id: value.id, lastActiveAt: value.lastActiveAt };
    }
  } catch {
    // 손상된 값은 새 세션으로 덮어쓴다.
  }
  return null;
};

export const createVisitIdentity = (
  storage: StorageLike | null,
  newId: () => string = () => crypto.randomUUID(),
) => {
  const memory: { visitorId: string | null; session: StoredSession | null } = {
    visitorId: null,
    session: null,
  };

  const saveSession = (session: StoredSession) => {
    memory.session = session;
    write(storage, SESSION_KEY, JSON.stringify(session));
  };

  return {
    resolve(nowMs: number): VisitContext {
      const storedVisitor = read(storage, VISITOR_KEY);
      const visitorId = isUuid(storedVisitor)
        ? storedVisitor
        : (memory.visitorId ?? newId());
      memory.visitorId = visitorId;
      write(storage, VISITOR_KEY, visitorId);

      const previous = parseSession(read(storage, SESSION_KEY)) ?? memory.session;
      const sessionStart =
        previous === null || nowMs - previous.lastActiveAt > SESSION_TIMEOUT_MS;
      const session = {
        id: sessionStart || previous === null ? newId() : previous.id,
        lastActiveAt: nowMs,
      };
      saveSession(session);
      return { visitorId, sessionId: session.id, sessionStart };
    },

    touch(nowMs: number) {
      const current = parseSession(read(storage, SESSION_KEY)) ?? memory.session;
      if (current !== null) saveSession({ ...current, lastActiveAt: nowMs });
    },
  };
};
```

`apps/web/features/public/analytics/engagement-timer.ts`:

```ts
/** 탭이 보이는 동안의 시간만 누적한다. 시각은 performance.now() 같은 단조 증가 값을 넘긴다. */
export const createEngagementTimer = (nowMs: number, visible: boolean) => {
  let accumulated = 0;
  let visibleSince: number | null = visible ? nowMs : null;

  return {
    pause(now: number) {
      if (visibleSince === null) return;
      accumulated += now - visibleSince;
      visibleSince = null;
    },
    resume(now: number) {
      if (visibleSince === null) visibleSince = now;
    },
    total(now: number): number {
      return accumulated + (visibleSince === null ? 0 : now - visibleSince);
    },
  };
};
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/public`
Expected: PASS 10개.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/features/public/analytics apps/web/tests/unit/features/public
git commit -m "feat: 브라우저 익명 방문자·세션 식별과 체류 타이머 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 트래커 연결과 푸터 고지

**Files:**
- Modify: `apps/web/app/_components/page-view-tracker.tsx`
- Modify: `apps/web/app/(home)/_components/site-footer.tsx`
- Test: `apps/web/tests/e2e/page-views.spec.ts`

**Interfaces:**
- Consumes: Task 4 `createVisitIdentity`, `createEngagementTimer`; Task 2 요청 필드와 engagement 엔드포인트

- [ ] **Step 1: 기존 e2e가 무엇을 검증하는지 확인**

Run: `sed -n 1,200p apps/web/tests/e2e/page-views.spec.ts`
요청 본문을 가로채 검사하는 기존 패턴(예: `page.waitForRequest`)을 찾아 다음 단계 테스트에 그대로 쓴다.

- [ ] **Step 2: 실패하는 e2e 추가**

`apps/web/tests/e2e/page-views.spec.ts`의 최상위 `test.describe` 안에 추가:

```ts
  test("페이지뷰에 익명 방문자·세션 ID를 함께 보내고, 숨길 때 체류 시간을 보낸다", async ({ page }) => {
    const uuid = /^[0-9a-f-]{36}$/;
    const viewRequest = page.waitForRequest(
      (request) => request.url().endsWith("/api/public/page-views") && request.method() === "POST",
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = (await viewRequest).postDataJSON() as Record<string, unknown>;

    expect(body.visitorId).toMatch(uuid);
    expect(body.sessionId).toMatch(uuid);
    expect(body.pageviewId).toMatch(uuid);
    expect(body.sessionStart).toBe(true);

    const engagementRequest = page.waitForRequest((request) =>
      request.url().endsWith("/api/public/page-views/engagement"),
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const engagement = (await engagementRequest).postDataJSON() as Record<string, unknown>;
    expect(engagement.pageviewId).toBe(body.pageviewId);
    expect(engagement.visitorId).toBe(body.visitorId);
    expect(typeof engagement.engagedMs).toBe("number");
  });

  test("푸터에 익명 방문 분석 안내가 있다", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("public-footer")).toContainText("익명 방문 분석");
  });
```

목업 API(`tests/e2e/mock-api/server.ts`)가 `/api/public/page-views/engagement`에 응답하지 않아도 요청 자체는 잡힌다. 404로 콘솔 에러가 나서 다른 테스트가 실패하면 기존 `/api/public/page-views` 처리 분기 옆에 같은 형태로 `{ ok: true }`를 돌려주는 분기를 추가한다.

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @yonyoung/web exec ./scripts/run-playwright.sh test tests/e2e/page-views.spec.ts`
Expected: 새 테스트 2개 FAIL.

- [ ] **Step 4: 트래커 수정**

`apps/web/app/_components/page-view-tracker.tsx` 전체를 다음으로 바꾼다(기존 주석은 유지):

```tsx
"use client";

import { useEffect } from "react";
import { createEngagementTimer } from "@/features/public/analytics/engagement-timer";
import { createVisitIdentity } from "@/features/public/analytics/visitor-identity";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

type PageViewTrackerProps = {
  pageType: "home" | "activity" | "exhibition" | "about" | "donate" | "linktree";
  resourceId?: string;
};

/** API 상한과 같다. 넘는 값은 400이 되므로 보내기 전에 자른다. */
const MAX_ENGAGED_MS = 30 * 60 * 1000;

/**
 * 페이지뷰 집계.
 *
 * **반드시 `useEffect` 안에서만 보낸다.** 프리페치나 App Shell 생성 시점에 실행되면
 * 실제로 보지 않은 페이지가 조회수로 잡힌다. 렌더 중이나 서버에서 부르는 형태로
 * 바꾸지 말 것.
 *
 * `navigator.sendBeacon` 을 쓰지 않는 이유: API 가 CSRF 헤더를 요구하는데 beacon 은
 * 커스텀 헤더를 붙일 수 없다. 대신 `keepalive` 로 같은 성질(페이지를 떠나도 전송이
 * 살아남음)을 얻는다.
 *
 * 전송 시점을 한 프레임 미루는 이유: 하이드레이션 커밋과 같은 프레임에서 요청을
 * 띄우면 첫 화면 이미지와 대역폭·연결을 다투게 된다. 한 프레임(≈16ms)이면 첫
 * 페인트 뒤로 밀리면서도, 사용자가 그 사이에 페이지를 떠나 집계가 누락될 위험은
 * 사실상 없다(`keepalive` 가 남은 경우도 처리한다).
 */
// 문서 로드당 한 번만 진입으로 보낸다. 클라이언트 내비게이션에서는 document.referrer가
// 첫 유입 경로로 남아 있어서, 매 페이지뷰마다 보내면 같은 유입이 중복으로 잡힌다.
let entryReported = false;

/**
 * 진입 정보. 같은 사이트에서 온 새로고침은 진입이 아니므로 null을 돌려준다.
 * 외부 유입은 경로·쿼리를 빼고 호스트명만 보낸다.
 */
const readEntry = (): { entry: true; referrerHost?: string } | null => {
  if (entryReported) return null;
  entryReported = true;

  if (document.referrer === "") return { entry: true };
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return null;
    return { entry: true, referrerHost: referrer.hostname };
  } catch {
    return { entry: true };
  }
};

let visitIdentity: ReturnType<typeof createVisitIdentity> | null = null;

// localStorage 접근은 일부 브라우저 설정에서 getter 자체가 예외를 던진다.
const getVisitIdentity = () => {
  if (visitIdentity === null) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    visitIdentity = createVisitIdentity(storage);
  }
  return visitIdentity;
};

export default function PageViewTracker({ pageType, resourceId }: PageViewTrackerProps) {
  useEffect(() => {
    const post = (path: string, body: unknown) => {
      fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    };

    const identity = getVisitIdentity();
    const pageviewId = crypto.randomUUID();
    const timer = createEngagementTimer(
      performance.now(),
      document.visibilityState === "visible",
    );
    let visitorId: string | null = null;
    let lastSentMs = 0;

    // 누적 총량을 보낸다. 서버가 큰 값만 남기므로 탭을 여러 번 오가도 안전하다.
    const sendEngagement = () => {
      if (visitorId === null) return;
      const engagedMs = Math.min(Math.round(timer.total(performance.now())), MAX_ENGAGED_MS);
      if (engagedMs <= lastSentMs) return;
      lastSentMs = engagedMs;
      identity.touch(Date.now());
      post("/api/public/page-views/engagement", { pageviewId, visitorId, engagedMs });
    };

    const frame = requestAnimationFrame(() => {
      // 조회수 API — activity / exhibition 리소스만
      if ((pageType === "activity" || pageType === "exhibition") && resourceId) {
        post("/api/public/views", { resourceType: pageType, resourceId });
      }

      const entry = readEntry();
      const visit = identity.resolve(Date.now());
      visitorId = visit.visitorId;
      // 세션 유입 경로는 문서 로드 첫 페이지뷰의 외부 리퍼러만 인정한다. 사이트 안 이동 뒤 시작된 세션은 직접 접속이다.
      const session = visit.sessionStart
        ? {
            sessionStart: true,
            ...(entry?.referrerHost !== undefined
              ? { sessionReferrerHost: entry.referrerHost }
              : {}),
          }
        : {};

      // 내부 Analytics Engine 집계
      post("/api/public/page-views", {
        pageType,
        resourceId,
        ...entry,
        visitorId: visit.visitorId,
        sessionId: visit.sessionId,
        pageviewId,
        ...session,
      });
    });

    const onVisibilityChange = () => {
      const now = performance.now();
      if (document.visibilityState === "hidden") {
        timer.pause(now);
        sendEngagement();
      } else {
        timer.resume(now);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      timer.pause(performance.now());
      sendEngagement();
    };
  }, [pageType, resourceId]);

  return null;
}
```

- [ ] **Step 5: 푸터 고지**

`apps/web/app/(home)/_components/site-footer.tsx`에서 저작권 `<p>`를 담은 `<div className="border-t ...">` 안, 저작권 `<p>` 다음에 추가:

```tsx
          <p className="mt-2 text-[0.75rem] leading-normal text-(--footer-muted)">
            익명 방문 분석을 위해 브라우저에 무작위 식별값을 저장합니다. 개인을 식별하는 정보는 수집하지 않습니다.
          </p>
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm --filter @yonyoung/web exec ./scripts/run-playwright.sh test tests/e2e/page-views.spec.ts tests/e2e/home.spec.ts`
Expected: PASS.

Run: `pnpm --filter @yonyoung/web lint && pnpm --filter @yonyoung/web typecheck`
Expected: PASS.

- [ ] **Step 7: 커밋 후 수집 단계 배포 준비**

```bash
git add apps/web/app/_components/page-view-tracker.tsx "apps/web/app/(home)/_components/site-footer.tsx" apps/web/tests/e2e
git commit -m "feat: 공개 페이지에서 익명 방문자·세션·체류 시간 전송

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin dev
```

여기서 사용자에게 알린다: "수집 단계가 끝났습니다. `pnpm db:migrate:remote`와 API·웹 배포를 하면 데이터가 쌓이기 시작합니다." 원격 마이그레이션과 배포는 사용자 확인 없이 실행하지 않는다.

---

## Phase B: 집계 API (Task 6–8)

### Task 6: 집계 순수 함수

**Files:**
- Modify: `apps/api/src/features/page-views/page-view-analytics.ts`
- Modify: `apps/api/src/lib/services/types.ts`
- Create: `apps/api/src/features/page-views/visitor-insights.ts`
- Test: `apps/api/src/tests/visitor-insights.test.ts`

**Interfaces:**
- Consumes: Task 1 `AnalyticsEventRow`; 기존 `PageViewAnalyticsRange`, `addDays`, `kstDateStartMs`, `toKstDate`, `KST_OFFSET_MS`
- Produces:
  - `page-view-analytics.ts`: `export const bucketKey(date: string, granularity: PageViewGranularity): string`, `export const mondayOf(date: string): string`
  - `types.ts`: `InsightsSegment`, `InsightsCore`, `VisitorInsightsEntity`, `DurationBucket`, `DepthBucket`
  - `visitor-insights.ts`: `isSegmented(segment: InsightsSegment): boolean`, `computeVisitorInsights(input: VisitorInsightsInput): ComputedVisitorInsights`, `type ComputedVisitorInsights = Omit<VisitorInsightsEntity, "content"> & { content: Array<Omit<VisitorInsightsEntity["content"][number], "title">> }`

- [ ] **Step 1: 헬퍼 export**

`apps/api/src/features/page-views/page-view-analytics.ts`에서 `const bucketKey = ...`를 `export const bucketKey = ...`로 바꾸고, 그 바로 아래에 추가:

```ts
export const mondayOf = (date: string): string =>
  addDays(date, -mondayBasedWeekday(date));
```

- [ ] **Step 2: 타입 추가**

`apps/api/src/lib/services/types.ts`의 `NewAnalyticsEvent` 아래에 추가:

```ts
export type InsightsSegment = {
  audience: "all" | "external" | "member";
  device: "all" | PageViewDevice;
  /** "all" | "direct" | "other" | 정규화된 호스트명 */
  referrer: string;
  landing: "all" | PageViewType;
};

export type InsightsCore = {
  views: number;
  visitors: number;
  sessions: number;
  pagesPerSession: number;
  avgSessionMs: number;
  /** 0..1 */
  bounceRate: number;
};

export type DepthBucket = "1" | "2" | "3" | "4" | "5+";
export type DurationBucket = "<10s" | "10-30s" | "30s-1m" | "1-3m" | "3-10m" | "10m+";

export type VisitorInsightsEntity = {
  range: { from: string; to: string; days: number; granularity: PageViewGranularity };
  previousRange: { from: string; to: string };
  eventsTrackedSince: string | null;
  segmented: boolean;
  summary: InsightsCore & {
    unmeasuredSessions: number;
    newVisitors: number;
    returningVisitors: number;
    prev: InsightsCore;
  };
  trend: Array<{
    bucket: string;
    views: number;
    visitors: number;
    sessions: number;
    avgSessionMs: number;
    newVisitors: number;
    returningVisitors: number;
    prevViews: number;
    prevVisitors: number;
    prevSessions: number;
    prevAvgSessionMs: number;
    collected: boolean;
  }>;
  hourly: Array<{ weekday: number; hour: number; views: number }>;
  referrerFlow: Array<{ referrer: string; landing: PageViewType; sessions: number }>;
  pathFlow: Array<{ step: 1 | 2; from: PageViewType; to: PageViewType | "exit"; sessions: number }>;
  content: Array<{
    pageType: PageViewType;
    resourceId: string;
    title: string | null;
    views: number;
    visitors: number;
    avgEngagedMs: number | null;
    entries: number;
    bounceRate: number | null;
  }>;
  devices: Array<{ device: PageViewDevice; sessions: number }>;
  audience: { member: number; external: number };
  depth: Array<{ bucket: DepthBucket; sessions: number }>;
  duration: Array<{ bucket: DurationBucket; sessions: number }>;
  cohorts: Array<{ week: string; size: number; retention: Array<number | null> }>;
  referrerOptions: string[];
};
```

- [ ] **Step 3: 실패하는 테스트 작성**

`apps/api/src/tests/visitor-insights.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeVisitorInsights,
  type VisitorInsightsInput,
} from "../features/page-views/visitor-insights";
import type {
  AnalyticsEventRow,
  InsightsSegment,
  PageViewAnalyticsRange,
} from "../lib/services/types";

const RANGE: PageViewAnalyticsRange = {
  from: "2026-10-01",
  to: "2026-10-07",
  days: 7,
  granularity: "day",
  previous: { from: "2026-09-24", to: "2026-09-30" },
};
const ALL: InsightsSegment = { audience: "all", device: "all", referrer: "all", landing: "all" };

/** "2026-10-01T10:00" 같은 KST 시각을 epoch ms로 */
const at = (kst: string) => Date.parse(`${kst}:00+09:00`);

let seq = 0;
const ev = (
  fields: Partial<AnalyticsEventRow> & Pick<AnalyticsEventRow, "sessionId" | "visitedAt">,
): AnalyticsEventRow => ({
  id: `e${++seq}`,
  visitorId: "v1",
  pageType: "home",
  resourceId: "home",
  referrerHost: null,
  device: "desktop",
  isMember: false,
  engagedMs: null,
  ...fields,
});

const run = (events: AnalyticsEventRow[], extra: Partial<VisitorInsightsInput> = {}) =>
  computeVisitorInsights({
    range: RANGE,
    segment: ALL,
    events,
    firstSeen: new Map(),
    trackedSinceMs: at("2026-09-01T00:00"),
    legacy: null,
    ...extra,
  });

const BASIC = () => [
  ev({ sessionId: "s1", visitedAt: at("2026-10-01T10:00"), referrerHost: "google.com", engagedMs: 5_000 }),
  ev({ sessionId: "s1", visitedAt: at("2026-10-01T10:02"), pageType: "activity", resourceId: "a1", engagedMs: 20_000 }),
  ev({ sessionId: "s2", visitorId: "v2", visitedAt: at("2026-10-02T12:00"), pageType: "exhibition", resourceId: "x1", referrerHost: "direct", device: "mobile" }),
  ev({ sessionId: "s3", visitedAt: at("2026-10-03T09:00"), referrerHost: "direct", engagedMs: 40_000, isMember: true }),
];

describe("computeVisitorInsights", () => {
  it("세션 지표를 계산하고 체류 미측정 세션은 평균에서 뺀다", () => {
    const { summary } = run(BASIC());
    expect(summary).toMatchObject({
      views: 4,
      visitors: 2,
      sessions: 3,
      pagesPerSession: 1.3,
      avgSessionMs: 32_500,
      unmeasuredSessions: 1,
      bounceRate: 0.6667,
    });
  });

  it("세그먼트는 세션 단위로 거른다", () => {
    expect(run(BASIC(), { segment: { ...ALL, audience: "member" } }).summary.sessions).toBe(1);
    expect(run(BASIC(), { segment: { ...ALL, audience: "external" } }).summary.sessions).toBe(2);
    expect(run(BASIC(), { segment: { ...ALL, landing: "exhibition" } }).summary.sessions).toBe(1);
    expect(run(BASIC(), { segment: { ...ALL, device: "mobile" } }).summary.sessions).toBe(1);
    // 활동 페이지는 s1 의 두 번째 페이지라 진입 페이지 필터에 걸리지 않는다.
    expect(run(BASIC(), { segment: { ...ALL, landing: "activity" } }).summary.sessions).toBe(0);
    const google = run(BASIC(), { segment: { ...ALL, referrer: "google.com" } });
    expect(google.summary).toMatchObject({ sessions: 1, views: 2 });
  });

  it("기간 전 첫 방문이면 재방문, 기간 안이면 신규다", () => {
    const { summary } = run(BASIC(), {
      firstSeen: new Map([
        ["v1", at("2026-09-20T00:00")],
        ["v2", at("2026-10-02T12:00")],
      ]),
    });
    expect(summary).toMatchObject({ newVisitors: 1, returningVisitors: 1 });
  });

  it("주 단위 추이는 기간 첫날을 첫 버킷 라벨로 쓰고 이전 기간을 같은 순번 날짜에 맞춘다", () => {
    const range: PageViewAnalyticsRange = {
      from: "2026-10-01",
      to: "2026-10-14",
      days: 14,
      granularity: "week",
      previous: { from: "2026-09-17", to: "2026-09-30" },
    };
    const result = run(
      [
        ev({ sessionId: "c1", visitedAt: at("2026-10-02T10:00") }),
        ev({ sessionId: "c2", visitedAt: at("2026-10-06T10:00") }),
        ev({ sessionId: "p1", visitedAt: at("2026-09-17T10:00") }),
        ev({ sessionId: "p2", visitedAt: at("2026-09-22T10:00") }),
      ],
      { range, trackedSinceMs: at("2026-10-06T00:00") },
    );
    expect(result.trend).toEqual([
      expect.objectContaining({ bucket: "2026-10-01", sessions: 1, prevSessions: 1, collected: false }),
      expect.objectContaining({ bucket: "2026-10-05", sessions: 1, prevSessions: 1, collected: true }),
      expect.objectContaining({ bucket: "2026-10-12", sessions: 0, prevSessions: 0, collected: true }),
    ]);
  });

  it("필터가 없으면 페이지뷰를 기존 합계에서 가져온다", () => {
    const current = ["01", "02", "03", "04", "05", "06", "07"].map((d, i) => ({
      date: `2026-10-${d}`,
      count: i + 1,
    }));
    const previous = ["24", "25", "26", "27", "28", "29", "30"].map((d) => ({
      date: `2026-09-${d}`,
      count: 2,
    }));
    const result = run(BASIC(), { legacy: { current, previous } });
    expect(result.summary.views).toBe(28);
    expect(result.summary.prev.views).toBe(14);
    expect(result.trend[0]).toMatchObject({ views: 1, prevViews: 2, sessions: 1 });
  });

  it("요일·시간은 KST 기준이다", () => {
    const { hourly } = run([
      ev({ sessionId: "h1", visitedAt: at("2026-10-05T08:30") }),
      ev({ sessionId: "h2", visitedAt: at("2026-10-04T23:59") }),
    ]);
    expect(hourly).toHaveLength(168);
    expect(hourly[8]).toEqual({ weekday: 0, hour: 8, views: 1 });
    expect(hourly[167]).toEqual({ weekday: 6, hour: 23, views: 1 });
  });

  it("유입 흐름은 상위 6개 밖을 other로 접는다", () => {
    const hosts: Array<[string, number]> = [
      ["a.com", 7], ["b.com", 6], ["c.com", 5], ["d.com", 4], ["e.com", 3], ["f.com", 2], ["g.com", 1],
    ];
    const events = hosts.flatMap(([host, count]) =>
      Array.from({ length: count }, (_, i) =>
        ev({ sessionId: `${host}-${i}`, visitorId: `${host}-${i}`, visitedAt: at("2026-10-01T10:00"), referrerHost: host }),
      ),
    );
    const { referrerFlow, referrerOptions } = run(events);
    expect(referrerFlow).toContainEqual({ referrer: "other", landing: "home", sessions: 1 });
    expect(referrerFlow.some((row) => row.referrer === "g.com")).toBe(false);
    expect(referrerOptions[0]).toBe("a.com");
    expect(referrerOptions).toContain("g.com");
  });

  it("이동 경로는 1·2단계와 이탈을 센다", () => {
    const { pathFlow } = run([
      ev({ sessionId: "p", visitedAt: at("2026-10-01T10:00") }),
      ev({ sessionId: "p", visitedAt: at("2026-10-01T10:01"), pageType: "activity", resourceId: "a1" }),
      ev({ sessionId: "p", visitedAt: at("2026-10-01T10:02"), pageType: "exhibition", resourceId: "x1" }),
      ev({ sessionId: "q", visitorId: "v2", visitedAt: at("2026-10-01T11:00") }),
    ]);
    expect(pathFlow).toEqual(
      expect.arrayContaining([
        { step: 1, from: "home", to: "activity", sessions: 1 },
        { step: 1, from: "home", to: "exit", sessions: 1 },
        { step: 2, from: "activity", to: "exhibition", sessions: 1 },
      ]),
    );
    expect(pathFlow).toHaveLength(3);
  });

  it("콘텐츠별 조회·방문자·체류·진입·이탈을 모은다", () => {
    const { content } = run([
      ev({ sessionId: "a", visitedAt: at("2026-10-01T10:00"), engagedMs: 1_000 }),
      ev({ sessionId: "a", visitedAt: at("2026-10-01T10:01"), pageType: "activity", resourceId: "a1" }),
      ev({ sessionId: "b", visitorId: "v2", visitedAt: at("2026-10-01T11:00"), pageType: "activity", resourceId: "a1", engagedMs: 3_000 }),
    ]);
    expect(content).toEqual([
      { pageType: "activity", resourceId: "a1", views: 2, visitors: 2, avgEngagedMs: 3_000, entries: 1, bounceRate: 1 },
      { pageType: "home", resourceId: "home", views: 1, visitors: 1, avgEngagedMs: 1_000, entries: 1, bounceRate: 0 },
    ]);
  });

  it("세션 깊이와 체류 분포 구간을 채운다", () => {
    const deep = Array.from({ length: 6 }, (_, i) =>
      ev({ sessionId: "deep", visitorId: "v3", visitedAt: at("2026-10-02T10:00") + i * 1000 }),
    );
    const { depth, duration } = run([
      ev({ sessionId: "one", visitedAt: at("2026-10-01T10:00"), engagedMs: 5_000 }),
      ev({ sessionId: "two", visitorId: "v2", visitedAt: at("2026-10-01T11:00"), engagedMs: 20_000 }),
      ev({ sessionId: "two", visitorId: "v2", visitedAt: at("2026-10-01T11:01"), engagedMs: 20_000 }),
      ...deep,
    ]);
    expect(depth).toEqual([
      { bucket: "1", sessions: 1 },
      { bucket: "2", sessions: 1 },
      { bucket: "3", sessions: 0 },
      { bucket: "4", sessions: 0 },
      { bucket: "5+", sessions: 1 },
    ]);
    expect(duration).toEqual([
      { bucket: "<10s", sessions: 1 },
      { bucket: "10-30s", sessions: 0 },
      { bucket: "30s-1m", sessions: 1 },
      { bucket: "1-3m", sessions: 0 },
      { bucket: "3-10m", sessions: 0 },
      { bucket: "10m+", sessions: 0 },
    ]);
  });

  it("주별 코호트는 기간 끝을 넘는 칸을 null로 둔다", () => {
    const range: PageViewAnalyticsRange = {
      from: "2026-10-01",
      to: "2026-10-21",
      days: 21,
      granularity: "week",
      previous: { from: "2026-09-10", to: "2026-09-30" },
    };
    const { cohorts } = run(
      [
        ev({ sessionId: "c1", visitedAt: at("2026-10-01T10:00") }),
        ev({ sessionId: "c2", visitedAt: at("2026-10-06T10:00") }),
        ev({ sessionId: "old", visitorId: "v2", visitedAt: at("2026-10-02T10:00") }),
      ],
      {
        range,
        firstSeen: new Map([
          ["v1", at("2026-10-01T10:00")],
          ["v2", at("2026-08-01T10:00")],
        ]),
      },
    );
    expect(cohorts).toEqual([
      { week: "2026-09-28", size: 1, retention: [1, 0, 0, null, null, null, null, null] },
    ]);
  });

  it("이벤트가 없고 수집 전이면 모든 값이 비어 있다", () => {
    const result = run([], { trackedSinceMs: null, segment: { ...ALL, audience: "member" } });
    expect(result.summary).toMatchObject({ views: 0, sessions: 0, bounceRate: 0, avgSessionMs: 0 });
    expect(result.segmented).toBe(true);
    expect(result.eventsTrackedSince).toBeNull();
    expect(result.trend).toHaveLength(7);
    expect(result.trend.every((point) => !point.collected)).toBe(true);
    expect(result.hourly.every((cell) => cell.views === 0)).toBe(true);
    expect(result.cohorts).toEqual([]);
    expect(result.content).toEqual([]);
    expect(result.referrerOptions).toEqual([]);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `pnpm --filter @yonyoung/api test:node -- visitor-insights`
Expected: FAIL — 모듈 없음.

- [ ] **Step 5: 구현**

`apps/api/src/features/page-views/visitor-insights.ts`:

```ts
import type {
  AnalyticsEventRow,
  DepthBucket,
  DurationBucket,
  InsightsCore,
  InsightsSegment,
  PageViewAnalyticsRange,
  VisitorInsightsEntity,
} from "../../lib/services/types";
import type { PageViewDevice, PageViewType } from "../../lib/views/page-view-target";
import {
  KST_OFFSET_MS,
  addDays,
  bucketKey,
  kstDateStartMs,
  mondayOf,
  toKstDate,
} from "./page-view-analytics";

type DailyPoint = { date: string; count: number };

export type VisitorInsightsInput = {
  range: PageViewAnalyticsRange;
  segment: InsightsSegment;
  /** 이전 기간 시작 ~ 조회 기간 끝의 이벤트 */
  events: readonly AnalyticsEventRow[];
  /** 조회 기간 방문자의 전체 기간 첫 이벤트 시각 */
  firstSeen: ReadonlyMap<string, number>;
  trackedSinceMs: number | null;
  /** 필터가 없을 때만 넘긴다. 기존 page_views 합계(빈 날 0 채움) */
  legacy: { current: readonly DailyPoint[]; previous: readonly DailyPoint[] } | null;
};

type ContentRow = Omit<VisitorInsightsEntity["content"][number], "title">;
export type ComputedVisitorInsights = Omit<VisitorInsightsEntity, "content"> & {
  content: ContentRow[];
};

type Session = {
  id: string;
  visitorId: string;
  events: AnalyticsEventRow[];
  start: number;
  isMember: boolean;
  device: PageViewDevice;
  referrer: string;
  landing: PageViewType;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const COHORT_WEEKS = 8;
const CONTENT_LIMIT = 50;
const REFERRER_FLOW_LIMIT = 6;
const REFERRER_OPTION_LIMIT = 10;
const DEPTH_BUCKETS: readonly DepthBucket[] = ["1", "2", "3", "4", "5+"];
const DURATION_BUCKETS: ReadonlyArray<{ bucket: DurationBucket; underMs: number }> = [
  { bucket: "<10s", underMs: 10_000 },
  { bucket: "10-30s", underMs: 30_000 },
  { bucket: "30s-1m", underMs: 60_000 },
  { bucket: "1-3m", underMs: 180_000 },
  { bucket: "3-10m", underMs: 600_000 },
  { bucket: "10m+", underMs: Number.POSITIVE_INFINITY },
];

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const ratio = (part: number, whole: number) => (whole === 0 ? 0 : round(part / whole, 4));

export const isSegmented = (segment: InsightsSegment): boolean =>
  segment.audience !== "all" ||
  segment.device !== "all" ||
  segment.referrer !== "all" ||
  segment.landing !== "all";

const toSessions = (events: readonly AnalyticsEventRow[]): Session[] => {
  const grouped = new Map<string, AnalyticsEventRow[]>();
  for (const event of events) {
    const list = grouped.get(event.sessionId);
    if (list) list.push(event);
    else grouped.set(event.sessionId, [event]);
  }
  return [...grouped.entries()].map(([id, list]) => {
    list.sort((a, b) => a.visitedAt - b.visitedAt);
    const first = list[0]!;
    return {
      id,
      visitorId: first.visitorId,
      events: list,
      start: first.visitedAt,
      isMember: list.some((event) => event.isMember),
      device: first.device,
      // 첫 요청이 유실돼 유입 경로가 비면 직접 접속으로 본다.
      referrer: first.referrerHost ?? "direct",
      landing: first.pageType,
    };
  });
};

const matchesSegment = (session: Session, segment: InsightsSegment) =>
  (segment.audience === "all" || (segment.audience === "member") === session.isMember) &&
  (segment.device === "all" || segment.device === session.device) &&
  (segment.referrer === "all" || segment.referrer === session.referrer) &&
  (segment.landing === "all" || segment.landing === session.landing);

const isMeasured = (session: Session) => session.events.some((event) => event.engagedMs !== null);
const engagedMsOf = (session: Session) =>
  session.events.reduce((sum, event) => sum + (event.engagedMs ?? 0), 0);

const summarize = (sessions: readonly Session[]): InsightsCore & { unmeasuredSessions: number } => {
  const views = sessions.reduce((sum, session) => sum + session.events.length, 0);
  const measured = sessions.filter(isMeasured);
  const bounces = sessions.filter((session) => session.events.length === 1).length;
  return {
    views,
    visitors: new Set(sessions.map((session) => session.visitorId)).size,
    sessions: sessions.length,
    pagesPerSession: sessions.length === 0 ? 0 : round(views / sessions.length, 1),
    avgSessionMs:
      measured.length === 0
        ? 0
        : Math.round(measured.reduce((sum, session) => sum + engagedMsOf(session), 0) / measured.length),
    bounceRate: ratio(bounces, sessions.length),
    unmeasuredSessions: sessions.length - measured.length,
  };
};

const countBy = <T>(items: readonly T[], keyOf: (item: T) => string) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const byCountDesc = (counts: Map<string, number>) =>
  [...counts.entries()].sort((a, b) => b[1] - a[1]);

const sum = (days: readonly DailyPoint[]) => days.reduce((total, day) => total + day.count, 0);

export const computeVisitorInsights = (input: VisitorInsightsInput): ComputedVisitorInsights => {
  const { range, segment, legacy } = input;
  const currentStart = kstDateStartMs(range.from);
  const currentEnd = kstDateStartMs(addDays(range.to, 1));
  const previousStart = kstDateStartMs(range.previous.from);

  // 세션은 첫 이벤트 시각으로 기간에 귀속한다.
  const sessions = toSessions(input.events);
  const currentAll = sessions.filter((s) => s.start >= currentStart && s.start < currentEnd);
  const current = currentAll.filter((s) => matchesSegment(s, segment));
  const previous = sessions.filter(
    (s) => s.start >= previousStart && s.start < currentStart && matchesSegment(s, segment),
  );
  // 첫 방문 기록이 없으면 이번이 첫 방문이다.
  const firstSeenOf = (visitorId: string) => input.firstSeen.get(visitorId) ?? currentStart;
  const trackedSince = input.trackedSinceMs === null ? null : toKstDate(input.trackedSinceMs);

  // ── 추이 ──
  const dates: string[] = [];
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) dates.push(date);
  type Bucket = {
    label: string;
    lastDate: string;
    current: Session[];
    previous: Session[];
    legacyViews: number;
    legacyPrevViews: number;
  };
  const buckets = new Map<string, Bucket>();
  const keyOfDate = new Map<string, string>();
  for (const date of dates) {
    const key = bucketKey(date, range.granularity);
    const bucket = buckets.get(key) ?? {
      // 주 버킷 라벨은 기간 안 첫날이다. 첫 주가 잘려도 기간 밖 날짜가 보이지 않는다.
      label: range.granularity === "month" ? key : date,
      lastDate: date,
      current: [],
      previous: [],
      legacyViews: 0,
      legacyPrevViews: 0,
    };
    bucket.lastDate = date;
    buckets.set(key, bucket);
    keyOfDate.set(date, key);
  }
  const bucketOf = (date: string | undefined) =>
    date === undefined ? undefined : buckets.get(keyOfDate.get(date) ?? "");
  const dayOffset = (fromDate: string, ms: number) =>
    Math.round((kstDateStartMs(toKstDate(ms)) - kstDateStartMs(fromDate)) / DAY_MS);

  for (const session of current) bucketOf(toKstDate(session.start))?.current.push(session);
  // 이전 기간 i번째 날은 현재 기간 i번째 날과 같은 버킷에 넣는다.
  for (const session of previous) {
    bucketOf(dates[dayOffset(range.previous.from, session.start)])?.previous.push(session);
  }
  if (legacy !== null) {
    dates.forEach((date, index) => {
      const bucket = bucketOf(date)!;
      bucket.legacyViews += legacy.current[index]?.count ?? 0;
      bucket.legacyPrevViews += legacy.previous[index]?.count ?? 0;
    });
  }

  const trend = [...buckets.entries()].map(([key, bucket]) => {
    const cur = summarize(bucket.current);
    const prev = summarize(bucket.previous);
    const visitorIds = new Set(bucket.current.map((s) => s.visitorId));
    const newVisitors = [...visitorIds].filter((visitorId) => {
      const first = firstSeenOf(visitorId);
      return first >= currentStart && keyOfDate.get(toKstDate(first)) === key;
    }).length;
    return {
      bucket: bucket.label,
      views: legacy !== null ? bucket.legacyViews : cur.views,
      visitors: cur.visitors,
      sessions: cur.sessions,
      avgSessionMs: cur.avgSessionMs,
      newVisitors,
      returningVisitors: visitorIds.size - newVisitors,
      prevViews: legacy !== null ? bucket.legacyPrevViews : prev.views,
      prevVisitors: prev.visitors,
      prevSessions: prev.sessions,
      prevAvgSessionMs: prev.avgSessionMs,
      collected: trackedSince !== null && bucket.lastDate >= trackedSince,
    };
  });

  // ── 요약 ──
  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);
  const previousCore: InsightsCore = {
    views: previousSummary.views,
    visitors: previousSummary.visitors,
    sessions: previousSummary.sessions,
    pagesPerSession: previousSummary.pagesPerSession,
    avgSessionMs: previousSummary.avgSessionMs,
    bounceRate: previousSummary.bounceRate,
  };
  const visitorIds = new Set(current.map((s) => s.visitorId));
  const newVisitors = [...visitorIds].filter((v) => firstSeenOf(v) >= currentStart).length;

  // ── 요일 × 시간 ──
  const hourly = Array.from({ length: 168 }, (_, index) => ({
    weekday: Math.floor(index / 24),
    hour: index % 24,
    views: 0,
  }));
  for (const session of current) {
    for (const event of session.events) {
      const kst = new Date(event.visitedAt + KST_OFFSET_MS);
      const weekday = (kst.getUTCDay() + 6) % 7;
      hourly[weekday * 24 + kst.getUTCHours()]!.views += 1;
    }
  }

  // ── 유입 → 진입 흐름 ──
  const topReferrers = new Set(
    byCountDesc(countBy(current, (s) => s.referrer))
      .filter(([host]) => host !== "other")
      .slice(0, REFERRER_FLOW_LIMIT)
      .map(([host]) => host),
  );
  const flows = new Map<string, { referrer: string; landing: PageViewType; sessions: number }>();
  for (const session of current) {
    const referrer = topReferrers.has(session.referrer) ? session.referrer : "other";
    const key = `${referrer}|${session.landing}`;
    const row = flows.get(key) ?? { referrer, landing: session.landing, sessions: 0 };
    row.sessions += 1;
    flows.set(key, row);
  }

  // ── 이동 경로 ──
  type PathRow = VisitorInsightsEntity["pathFlow"][number];
  const paths = new Map<string, PathRow>();
  const addPath = (step: 1 | 2, from: PageViewType, to: PageViewType | "exit") => {
    const key = `${step}|${from}|${to}`;
    const row = paths.get(key) ?? { step, from, to, sessions: 0 };
    row.sessions += 1;
    paths.set(key, row);
  };
  for (const session of current) {
    const pages = session.events.map((event) => event.pageType);
    addPath(1, pages[0]!, pages[1] ?? "exit");
    if (pages.length >= 2) addPath(2, pages[1]!, pages[2] ?? "exit");
  }

  // ── 콘텐츠 ──
  type ContentAcc = {
    pageType: PageViewType;
    resourceId: string;
    views: number;
    visitors: Set<string>;
    engagedSum: number;
    engagedCount: number;
    entries: number;
    bounces: number;
  };
  const contents = new Map<string, ContentAcc>();
  for (const session of current) {
    session.events.forEach((event, index) => {
      const key = `${event.pageType}|${event.resourceId}`;
      const acc = contents.get(key) ?? {
        pageType: event.pageType,
        resourceId: event.resourceId,
        views: 0,
        visitors: new Set<string>(),
        engagedSum: 0,
        engagedCount: 0,
        entries: 0,
        bounces: 0,
      };
      acc.views += 1;
      acc.visitors.add(event.visitorId);
      if (event.engagedMs !== null) {
        acc.engagedSum += event.engagedMs;
        acc.engagedCount += 1;
      }
      if (index === 0) {
        acc.entries += 1;
        if (session.events.length === 1) acc.bounces += 1;
      }
      contents.set(key, acc);
    });
  }
  const content: ContentRow[] = [...contents.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, CONTENT_LIMIT)
    .map((acc) => ({
      pageType: acc.pageType,
      resourceId: acc.resourceId,
      views: acc.views,
      visitors: acc.visitors.size,
      avgEngagedMs: acc.engagedCount === 0 ? null : Math.round(acc.engagedSum / acc.engagedCount),
      entries: acc.entries,
      bounceRate: acc.entries === 0 ? null : ratio(acc.bounces, acc.entries),
    }));

  // ── 분포 ──
  const depthCounts = countBy(current, (s) =>
    s.events.length >= 5 ? "5+" : String(s.events.length),
  );
  const durationCounts = countBy(current.filter(isMeasured), (s) => {
    const engaged = engagedMsOf(s);
    return DURATION_BUCKETS.find((bucket) => engaged < bucket.underMs)!.bucket;
  });

  // ── 코호트 ──
  const activeWeeks = new Map<string, Set<string>>();
  for (const session of current) {
    for (const event of session.events) {
      const weeks = activeWeeks.get(event.visitorId) ?? new Set<string>();
      weeks.add(mondayOf(toKstDate(event.visitedAt)));
      activeWeeks.set(event.visitorId, weeks);
    }
  }
  const cohortMembers = new Map<string, string[]>();
  for (const visitorId of visitorIds) {
    const first = firstSeenOf(visitorId);
    if (first < currentStart) continue;
    const week = mondayOf(toKstDate(first));
    cohortMembers.set(week, [...(cohortMembers.get(week) ?? []), visitorId]);
  }
  const cohorts = [...cohortMembers.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, members]) => ({
      week,
      size: members.length,
      retention: Array.from({ length: COHORT_WEEKS }, (_, index) => {
        const target = addDays(week, 7 * (index + 1));
        if (target > range.to) return null;
        const returned = members.filter((v) => activeWeeks.get(v)?.has(target)).length;
        return ratio(returned, members.length);
      }),
    }));

  return {
    range: { from: range.from, to: range.to, days: range.days, granularity: range.granularity },
    previousRange: { from: range.previous.from, to: range.previous.to },
    eventsTrackedSince: trackedSince,
    segmented: isSegmented(segment),
    summary: {
      ...currentSummary,
      views: legacy !== null ? sum(legacy.current) : currentSummary.views,
      newVisitors,
      returningVisitors: visitorIds.size - newVisitors,
      prev: { ...previousCore, views: legacy !== null ? sum(legacy.previous) : previousCore.views },
    },
    trend,
    hourly,
    referrerFlow: [...flows.values()].sort((a, b) => b.sessions - a.sessions),
    pathFlow: [...paths.values()].sort((a, b) => a.step - b.step || b.sessions - a.sessions),
    content,
    devices: byCountDesc(countBy(current, (s) => s.device)).map(([device, count]) => ({
      device: device as PageViewDevice,
      sessions: count,
    })),
    audience: {
      member: current.filter((s) => s.isMember).length,
      external: current.filter((s) => !s.isMember).length,
    },
    depth: DEPTH_BUCKETS.map((bucket) => ({ bucket, sessions: depthCounts.get(bucket) ?? 0 })),
    duration: DURATION_BUCKETS.map(({ bucket }) => ({
      bucket,
      sessions: durationCounts.get(bucket) ?? 0,
    })),
    cohorts,
    // 필터를 바꿀 선택지이므로 현재 세그먼트와 무관하게 전체 세션에서 뽑는다.
    referrerOptions: byCountDesc(countBy(currentAll, (s) => s.referrer))
      .filter(([host]) => host !== "other")
      .slice(0, REFERRER_OPTION_LIMIT)
      .map(([host]) => host),
  };
};
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm --filter @yonyoung/api test:node -- visitor-insights page-view-analytics`
Expected: PASS (기존 page-view-analytics 테스트 포함).

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/features/page-views apps/api/src/lib/services/types.ts apps/api/src/tests/visitor-insights.test.ts
git commit -m "feat: 방문자·세션·코호트 집계 함수 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 인사이트 조회 저장소

**Files:**
- Modify: `apps/api/src/features/page-views/visitor-events.repository.ts`
- Test: `apps/api/tests/integration/visitor-events.runtime.test.ts`

**Interfaces:**
- Consumes: Task 6 `computeVisitorInsights`, `isSegmented`, `VisitorInsightsEntity`, `InsightsSegment`
- Produces: `repository.getVisitorInsights(range: PageViewAnalyticsRange, segment: InsightsSegment): Promise<VisitorInsightsEntity>`

- [ ] **Step 1: 실패하는 D1 테스트 추가**

`apps/api/tests/integration/visitor-events.runtime.test.ts` 끝에 추가:

```ts
describe("방문자 인사이트 조회", () => {
  const kst = (value: string) => Date.parse(`${value}:00+09:00`);
  const kstMidnight = (date: string) => Date.parse(`${date}T00:00:00+09:00`);
  const ALL = { audience: "all", device: "all", referrer: "all", landing: "all" } as const;
  const RANGE = {
    from: "2026-08-01",
    to: "2026-08-07",
    days: 7,
    granularity: "day" as const,
    previous: { from: "2026-07-25", to: "2026-07-31" },
  };

  beforeAll(async () => {
    const repository = createVisitorEventRepository(createDB(db));
    await db.batch([
      db.prepare(
        "INSERT INTO generations (id, name, sort_order, start_date, end_date) VALUES ('vg1', '61기', 61, 0, 0)",
      ),
      db.prepare(
        "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id) VALUES ('va1', '여름 출사', '', 0, 0, '', 'vg1')",
      ),
      db.prepare(
        "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id, deleted_at) VALUES ('va2', '삭제된 활동', '', 0, 0, '', 'vg1', 1)",
      ),
      db
        .prepare(
          "INSERT INTO page_views (id, page_type, resource_id, view_count, visited_at) VALUES ('pv-1', 'home', 'home', 9, ?)",
        )
        .bind(kstMidnight("2026-08-02")),
    ]);
    const base = { sessionId: "is1", visitorId: "iv1", device: "desktop" as const, isMember: false };
    await repository.recordAnalyticsEvent({ ...base, id: "i1", visitedAt: kst("2026-07-20T10:00"), pageType: "home", resourceId: "home", referrerHost: "direct", sessionId: "is0" });
    await repository.recordAnalyticsEvent({ ...base, id: "i2", visitedAt: kst("2026-08-02T10:00"), pageType: "home", resourceId: "home", referrerHost: "google.com" });
    await repository.recordAnalyticsEvent({ ...base, id: "i3", visitedAt: kst("2026-08-02T10:01"), pageType: "activity", resourceId: "va1", referrerHost: null });
    await repository.recordAnalyticsEvent({ ...base, id: "i4", visitedAt: kst("2026-08-02T10:02"), pageType: "activity", resourceId: "va2", referrerHost: null });
  });

  it("필터가 없으면 합계 페이지뷰와 이벤트 지표를 함께 돌려주고 제목을 붙인다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const result = await repository.getVisitorInsights(RANGE, ALL);

    expect(result.segmented).toBe(false);
    expect(result.summary).toMatchObject({ views: 9, sessions: 1, visitors: 1, returningVisitors: 1 });
    expect(result.content).toEqual([
      expect.objectContaining({ pageType: "home", resourceId: "home", title: null }),
      expect.objectContaining({ pageType: "activity", resourceId: "va1", title: "여름 출사" }),
    ]);
    expect(result.eventsTrackedSince).not.toBeNull();
  });

  it("필터가 있으면 페이지뷰도 이벤트에서 센다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const result = await repository.getVisitorInsights(RANGE, { ...ALL, referrer: "google.com" });

    expect(result.segmented).toBe(true);
    expect(result.summary.views).toBe(3);
  });
});
```

`eventsTrackedSince`는 이 파일 앞 테스트가 넣은 `Date.now()` 근처 행 때문에 값이 달라질 수 있어 `not.toBeNull()`만 검사한다. 같은 이유로 이 describe의 기간(2026-08)은 앞 테스트의 행과 겹치지 않는다. `activities` 테이블 열 목록은 기존 `page-view-analytics.runtime.test.ts`의 INSERT와 같다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @yonyoung/api test:workers -- visitor-events`
Expected: FAIL — `getVisitorInsights is not a function`.

- [ ] **Step 3: 구현**

`visitor-events.repository.ts` import를 다음으로 바꾼다:

```ts
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type createDB from "../../lib/db";
import { activities, analyticsEvents, exhibitions, pageViews } from "../../platform/db/schema";
import type {
  InsightsSegment,
  NewAnalyticsEvent,
  PageViewAnalyticsRange,
  VisitorInsightsEntity,
} from "../../lib/services/types";
import type { PageViewDevice, PageViewType } from "../../lib/views/page-view-target";
import { KST_OFFSET_MS, addDays, fillDailySeries, kstDateStartMs } from "./page-view-analytics";
import { computeVisitorInsights, isSegmented } from "./visitor-insights";
```

`createVisitorEventRepository` 객체에 메서드 추가(`purgeAnalyticsEventsBefore` 다음):

```ts
  async getVisitorInsights(
    range: PageViewAnalyticsRange,
    segment: InsightsSegment,
  ): Promise<VisitorInsightsEntity> {
    const previousStart = new Date(kstDateStartMs(range.previous.from));
    const currentStart = new Date(kstDateStartMs(range.from));
    const currentEnd = new Date(kstDateStartMs(addDays(range.to, 1)));
    const segmented = isSegmented(segment);
    const kstDay = sql<string>`date((${pageViews.visitedAt} + ${KST_OFFSET_MS}) / 1000, 'unixepoch')`;

    const visitorsInRange = db
      .selectDistinct({ visitorId: analyticsEvents.visitorId })
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.visitedAt, currentStart), lt(analyticsEvents.visitedAt, currentEnd)));

    const [eventRows, firstSeenRows, trackedRows, legacyRows] = await Promise.all([
      db
        .select()
        .from(analyticsEvents)
        .where(and(gte(analyticsEvents.visitedAt, previousStart), lt(analyticsEvents.visitedAt, currentEnd))),
      db
        .select({
          visitorId: analyticsEvents.visitorId,
          first: sql<number>`min(${analyticsEvents.visitedAt})`,
        })
        .from(analyticsEvents)
        .where(inArray(analyticsEvents.visitorId, visitorsInRange))
        .groupBy(analyticsEvents.visitorId),
      db.select({ first: sql<number | null>`min(${analyticsEvents.visitedAt})` }).from(analyticsEvents),
      // 필터가 켜지면 합계 테이블은 나눌 수 없으므로 읽지 않는다.
      segmented
        ? Promise.resolve([] as Array<{ date: string; count: number }>)
        : db
            .select({ date: kstDay, count: sql<number>`coalesce(sum(${pageViews.viewCount}), 0)` })
            .from(pageViews)
            .where(and(gte(pageViews.visitedAt, previousStart), lt(pageViews.visitedAt, currentEnd)))
            .groupBy(kstDay),
    ]);

    const daily = legacyRows.map((row) => ({ date: row.date, count: Number(row.count) || 0 }));
    const tracked = trackedRows[0]?.first;
    const computed = computeVisitorInsights({
      range,
      segment,
      events: eventRows.map((row) => ({
        ...row,
        visitedAt: row.visitedAt.getTime(),
        pageType: row.pageType as PageViewType,
        device: row.device as PageViewDevice,
      })),
      firstSeen: new Map(firstSeenRows.map((row) => [row.visitorId, Number(row.first)])),
      trackedSinceMs: tracked === null || tracked === undefined ? null : Number(tracked),
      legacy: segmented
        ? null
        : {
            current: fillDailySeries(daily, range.from, range.to),
            previous: fillDailySeries(daily, range.previous.from, range.previous.to),
          },
    });

    // 삭제됐거나 없는 활동·전시는 링크할 곳이 없으므로 표에서 뺀다.
    const titlesOf = async (table: typeof activities | typeof exhibitions, pageType: PageViewType) => {
      const ids = computed.content.filter((row) => row.pageType === pageType).map((row) => row.resourceId);
      if (ids.length === 0) return new Map<string, string>();
      const rows = await db
        .select({ id: table.id, title: table.title })
        .from(table)
        .where(and(inArray(table.id, ids), isNull(table.deletedAt)));
      return new Map(rows.map((row) => [row.id, row.title]));
    };
    const [activityTitles, exhibitionTitles] = await Promise.all([
      titlesOf(activities, "activity"),
      titlesOf(exhibitions, "exhibition"),
    ]);

    return {
      ...computed,
      content: computed.content.flatMap((row) => {
        if (row.pageType === "activity" || row.pageType === "exhibition") {
          const title = (row.pageType === "activity" ? activityTitles : exhibitionTitles).get(row.resourceId);
          return title === undefined ? [] : [{ ...row, title }];
        }
        return [{ ...row, title: null }];
      }),
    };
  },
```

`min(visited_at)`는 D1에서 정수로 오지만 드라이버에 따라 문자열일 수 있어 `Number()`로 감싼다. `eq`를 더 이상 쓰지 않게 되면 import에서 빼지 말 것(recordEngagement가 쓴다).

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @yonyoung/api test:workers -- visitor-events`
Expected: PASS 6개.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/features/page-views/visitor-events.repository.ts apps/api/tests/integration/visitor-events.runtime.test.ts
git commit -m "feat: 방문자 인사이트 D1 조회 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 인사이트 API와 공유 계약

**Files:**
- Modify: `apps/api/src/features/page-views/page-view.contract.ts`
- Modify: `apps/api/src/features/page-views/page-view.routes.ts`
- Modify: `apps/api/src/lib/services/types.ts` (DataService)
- Modify: `apps/api/src/platform/db/data-service-composition.ts`
- Modify: `packages/contracts/src/api/dashboard.ts`, `src/api-contracts.ts`, `src/api-schemas.ts`
- Test: `apps/api/src/tests/page-views.routes.test.ts`, `packages/contracts/tests/api-schemas.test.ts`
- Update: OpenAPI 스냅샷, `apps/api/docs/dashboard-stats-api.md`

**Interfaces:**
- Consumes: Task 7 `getVisitorInsights`
- Produces:
  - `GET /api/admin/page-views/insights?from&to&granularity&audience&device&referrer&landing` → `{ data: VisitorInsights }`
  - DataService: `getVisitorInsights(range: PageViewAnalyticsRange, segment: InsightsSegment): Promise<VisitorInsightsEntity>`
  - `@yonyoung/contracts`: `ApiVisitorInsights` 타입, `apiVisitorInsightsSchema` (`/schemas`)

- [ ] **Step 1: 실패하는 라우트 테스트 추가**

`page-views.routes.test.ts`에 추가:

```ts
  describe("GET /api/admin/page-views/insights", () => {
    it("미승인 사용자는 403이다", async () => {
      const app = createTestApp({ actor: createActor("unverified", IDs.member) });
      const response = await app.request("/api/admin/page-views/insights");
      await expectErrorCode(response, 403);
    });

    it("기간과 세그먼트를 해석해 넘긴다", async () => {
      const getVisitorInsights = fn(async () => ({}) as never);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({ getVisitorInsights }),
      });

      const response = await app.request(
        "/api/admin/page-views/insights?from=2026-10-01&to=2026-10-07&audience=external&device=mobile&referrer=WWW.Google.com&landing=activity",
      );

      expect(response.status).toBe(200);
      expect(getVisitorInsights).toHaveBeenCalledWith(
        expect.objectContaining({ from: "2026-10-01", to: "2026-10-07", granularity: "day" }),
        { audience: "external", device: "mobile", referrer: "google.com", landing: "activity" },
      );
    });

    it("세그먼트를 생략하면 전부 all이다", async () => {
      const getVisitorInsights = fn(async () => ({}) as never);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({ getVisitorInsights }),
      });

      await app.request("/api/admin/page-views/insights?from=2026-10-01&to=2026-10-07");

      expect(getVisitorInsights).toHaveBeenCalledWith(expect.anything(), {
        audience: "all",
        device: "all",
        referrer: "all",
        landing: "all",
      });
    });

    it("허용되지 않은 값은 400이다", async () => {
      const app = createTestApp({ actor: createActor("regular_member", IDs.member) });
      const response = await app.request("/api/admin/page-views/insights?audience=robots");
      await expectErrorCode(response, 400);
    });
  });
```

응답 스키마 검증 때문에 `{}` 반환이 500이 되면 `getVisitorInsights` 목이 `computeVisitorInsights`로 만든 실제 빈 결과를 돌려주게 바꾼다:

```ts
import { computeVisitorInsights } from "../features/page-views/visitor-insights";
const emptyInsights = computeVisitorInsights({
  range: { from: "2026-10-01", to: "2026-10-07", days: 7, granularity: "day", previous: { from: "2026-09-24", to: "2026-09-30" } },
  segment: { audience: "all", device: "all", referrer: "all", landing: "all" },
  events: [],
  firstSeen: new Map(),
  trackedSinceMs: null,
  legacy: null,
});
// fn(async () => ({ ...emptyInsights, content: [] }))
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @yonyoung/api test:node -- page-views.routes`
Expected: FAIL — 404.

- [ ] **Step 3: API 계약**

`page-view.contract.ts` 끝에 추가:

```ts
const pageTypeEnum = z.enum(["home", "activity", "exhibition", "notice"]);
const deviceEnum = z.enum(["mobile", "tablet", "desktop"]);
const rate = z.number().min(0).max(1);

// .extend()는 원본의 openapi 이름(ApiPageViewAnalyticsQuery)까지 물려받을 수 있어 필드만 펼쳐 새로 만든다.
export const ApiVisitorInsightsQuerySchema = z.object({
  ...ApiPageViewAnalyticsQuerySchema.shape,
  audience: z.enum(["all", "external", "member"]).optional().openapi({
    description: "방문자 구분. 회원 이벤트가 하나라도 있는 세션은 회원 세션",
    example: "external",
  }),
  device: z.enum(["all", "mobile", "tablet", "desktop"]).optional().openapi({
    description: "세션 첫 페이지뷰의 기기",
    example: "mobile",
  }),
  referrer: z.string().max(253).optional().openapi({
    description: "세션 유입 경로. all, direct, 또는 호스트명",
    example: "google.com",
  }),
  landing: z.enum(["all", "home", "activity", "exhibition", "notice"]).optional().openapi({
    description: "세션 첫 페이지 종류",
    example: "activity",
  }),
}).openapi("ApiVisitorInsightsQuery");

const insightsCore = z.object({
  views: nonNegativeInt,
  visitors: nonNegativeInt,
  sessions: nonNegativeInt,
  pagesPerSession: z.number().nonnegative(),
  avgSessionMs: nonNegativeInt,
  bounceRate: rate,
});

export const ApiVisitorInsightsSchema = z
  .object({
    range: z.object({
      from: z.string(),
      to: z.string(),
      days: nonNegativeInt,
      granularity: z.enum(["day", "week", "month"]),
    }),
    previousRange: z.object({ from: z.string(), to: z.string() }),
    eventsTrackedSince: z.string().nullable().openapi({ description: "방문자 이벤트 수집 시작일(KST)" }),
    segmented: z.boolean().openapi({ description: "필터가 하나라도 켜졌는지" }),
    summary: insightsCore.extend({
      unmeasuredSessions: nonNegativeInt,
      newVisitors: nonNegativeInt,
      returningVisitors: nonNegativeInt,
      prev: insightsCore,
    }),
    trend: z.array(
      z.object({
        bucket: z.string(),
        views: nonNegativeInt,
        visitors: nonNegativeInt,
        sessions: nonNegativeInt,
        avgSessionMs: nonNegativeInt,
        newVisitors: nonNegativeInt,
        returningVisitors: nonNegativeInt,
        prevViews: nonNegativeInt,
        prevVisitors: nonNegativeInt,
        prevSessions: nonNegativeInt,
        prevAvgSessionMs: nonNegativeInt,
        collected: z.boolean(),
      }),
    ),
    hourly: z.array(
      z.object({ weekday: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23), views: nonNegativeInt }),
    ),
    referrerFlow: z.array(z.object({ referrer: z.string(), landing: pageTypeEnum, sessions: nonNegativeInt })),
    pathFlow: z.array(
      z.object({
        step: z.union([z.literal(1), z.literal(2)]),
        from: pageTypeEnum,
        to: z.union([pageTypeEnum, z.literal("exit")]),
        sessions: nonNegativeInt,
      }),
    ),
    content: z.array(
      z.object({
        pageType: pageTypeEnum,
        resourceId: z.string(),
        title: z.string().nullable(),
        views: nonNegativeInt,
        visitors: nonNegativeInt,
        avgEngagedMs: nonNegativeInt.nullable(),
        entries: nonNegativeInt,
        bounceRate: rate.nullable(),
      }),
    ),
    devices: z.array(z.object({ device: deviceEnum, sessions: nonNegativeInt })),
    audience: z.object({ member: nonNegativeInt, external: nonNegativeInt }),
    depth: z.array(z.object({ bucket: z.enum(["1", "2", "3", "4", "5+"]), sessions: nonNegativeInt })),
    duration: z.array(
      z.object({
        bucket: z.enum(["<10s", "10-30s", "30s-1m", "1-3m", "3-10m", "10m+"]),
        sessions: nonNegativeInt,
      }),
    ),
    cohorts: z.array(
      z.object({ week: z.string(), size: nonNegativeInt, retention: z.array(rate.nullable()) }),
    ),
    referrerOptions: z.array(z.string()),
  })
  .openapi("ApiVisitorInsights");
```

- [ ] **Step 4: DataService와 라우트**

`types.ts` DataService에 `getPageViewAnalytics` 다음:

```ts
  getVisitorInsights: (
    range: PageViewAnalyticsRange,
    segment: InsightsSegment,
  ) => Promise<VisitorInsightsEntity>;
```

`data-service-composition.ts`에 `recordEngagement` 다음:

```ts
    getVisitorInsights: visitorEventRepository.getVisitorInsights,
```

`page-view.routes.ts` import에 `ApiVisitorInsightsQuerySchema`, `ApiVisitorInsightsSchema` 추가. `getPageViewAnalyticsRoute` 다음에:

```ts
const getVisitorInsightsRoute = createRoute({
  method: "get",
  path: "/api/admin/page-views/insights",
  tags: ["Dashboard"],
  operationId: "getVisitorInsights",
  security: [{ cookieAuth: [] }],
  request: {
    query: ApiVisitorInsightsQuerySchema,
  },
  responses: {
    200: dataResponse(ApiVisitorInsightsSchema, "방문자 분석 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});
```

`registerPageViewRoutes` 끝(analytics 핸들러 다음)에:

```ts
  app.openapi(getVisitorInsightsRoute, async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);

    if (actor.role === "unverified") {
      throw AppError.forbidden();
    }

    const query = readValidated(c, "query", ApiVisitorInsightsQuerySchema);
    const range = resolveAnalyticsRange(query, Date.now());
    const insights = await dependencies.getDataService(c).getVisitorInsights(range, {
      audience: query.audience ?? "all",
      device: query.device ?? "all",
      // 저장할 때와 같은 규칙으로 정규화해야 www. 같은 표기 차이로 결과가 비지 않는다.
      referrer:
        query.referrer === undefined || query.referrer === "all"
          ? "all"
          : normalizeReferrerHost(query.referrer),
      landing: query.landing ?? "all",
    });
    return ok(c, insights);
  });
```

- [ ] **Step 5: 공유 계약**

`packages/contracts/src/api/dashboard.ts` 끝에 추가:

```ts
const insightsPageTypeSchema = z.enum(["home", "activity", "exhibition", "notice"]);
const insightsRateSchema = z.number().min(0).max(1);
const insightsCoreSchema = z.object({
  views: z.number().int(),
  visitors: z.number().int(),
  sessions: z.number().int(),
  pagesPerSession: z.number(),
  avgSessionMs: z.number().int(),
  bounceRate: insightsRateSchema,
});

export const apiVisitorInsightsSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    days: z.number().int(),
    granularity: pageViewGranularitySchema,
  }),
  previousRange: z.object({ from: z.string(), to: z.string() }),
  eventsTrackedSince: z.string().nullable(),
  segmented: z.boolean(),
  summary: insightsCoreSchema.extend({
    unmeasuredSessions: z.number().int(),
    newVisitors: z.number().int(),
    returningVisitors: z.number().int(),
    prev: insightsCoreSchema,
  }),
  trend: z.array(
    z.object({
      bucket: z.string(),
      views: z.number().int(),
      visitors: z.number().int(),
      sessions: z.number().int(),
      avgSessionMs: z.number().int(),
      newVisitors: z.number().int(),
      returningVisitors: z.number().int(),
      prevViews: z.number().int(),
      prevVisitors: z.number().int(),
      prevSessions: z.number().int(),
      prevAvgSessionMs: z.number().int(),
      collected: z.boolean(),
    }),
  ),
  hourly: z.array(z.object({ weekday: z.number().int(), hour: z.number().int(), views: z.number().int() })),
  referrerFlow: z.array(
    z.object({ referrer: z.string(), landing: insightsPageTypeSchema, sessions: z.number().int() }),
  ),
  pathFlow: z.array(
    z.object({
      step: z.union([z.literal(1), z.literal(2)]),
      from: insightsPageTypeSchema,
      to: z.union([insightsPageTypeSchema, z.literal("exit")]),
      sessions: z.number().int(),
    }),
  ),
  content: z.array(
    z.object({
      pageType: insightsPageTypeSchema,
      resourceId: z.string(),
      title: z.string().nullable(),
      views: z.number().int(),
      visitors: z.number().int(),
      avgEngagedMs: z.number().int().nullable(),
      entries: z.number().int(),
      bounceRate: insightsRateSchema.nullable(),
    }),
  ),
  devices: z.array(
    z.object({ device: z.enum(["mobile", "tablet", "desktop"]), sessions: z.number().int() }),
  ),
  audience: z.object({ member: z.number().int(), external: z.number().int() }),
  depth: z.array(z.object({ bucket: z.enum(["1", "2", "3", "4", "5+"]), sessions: z.number().int() })),
  duration: z.array(
    z.object({
      bucket: z.enum(["<10s", "10-30s", "30s-1m", "1-3m", "3-10m", "10m+"]),
      sessions: z.number().int(),
    }),
  ),
  cohorts: z.array(
    z.object({ week: z.string(), size: z.number().int(), retention: z.array(insightsRateSchema.nullable()) }),
  ),
  referrerOptions: z.array(z.string()),
});

export type ApiVisitorInsights = z.infer<typeof apiVisitorInsightsSchema>;
export type ApiInsightsPageType = z.infer<typeof insightsPageTypeSchema>;
```

`src/api-contracts.ts`의 `ApiPageViewStats,` 다음 줄에 `ApiVisitorInsights,`와 `ApiInsightsPageType,`를, `src/api-schemas.ts`의 `apiPageViewStatsSchema,` 다음 줄에 `apiVisitorInsightsSchema,`를 기존 export 목록 형식대로 추가한다.

`packages/contracts/tests/api-schemas.test.ts`에 추가(파일의 기존 import 형식을 따른다):

```ts
it("방문자 인사이트 스키마는 코호트의 null 칸과 이탈 노드를 받는다", () => {
  const parsed = apiVisitorInsightsSchema.safeParse({
    range: { from: "2026-10-01", to: "2026-10-07", days: 7, granularity: "day" },
    previousRange: { from: "2026-09-24", to: "2026-09-30" },
    eventsTrackedSince: null,
    segmented: false,
    summary: {
      views: 0, visitors: 0, sessions: 0, pagesPerSession: 0, avgSessionMs: 0, bounceRate: 0,
      unmeasuredSessions: 0, newVisitors: 0, returningVisitors: 0,
      prev: { views: 0, visitors: 0, sessions: 0, pagesPerSession: 0, avgSessionMs: 0, bounceRate: 0 },
    },
    trend: [],
    hourly: [],
    referrerFlow: [],
    pathFlow: [{ step: 1, from: "home", to: "exit", sessions: 1 }],
    content: [],
    devices: [],
    audience: { member: 0, external: 0 },
    depth: [],
    duration: [],
    cohorts: [{ week: "2026-09-28", size: 1, retention: [1, null] }],
    referrerOptions: [],
  });
  expect(parsed.success).toBe(true);
});
```

- [ ] **Step 6: 통과 확인, 스냅샷, 문서**

Run: `pnpm --filter @yonyoung/api test:node -- page-views.routes && pnpm --filter @yonyoung/contracts test`
Expected: PASS.

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/openapi-contract.snapshot.test.ts -u`
Expected: `/api/admin/page-views/insights`, `ApiVisitorInsights*`만 추가.

`apps/api/docs/dashboard-stats-api.md` 끝에 섹션 추가: 엔드포인트, 쿼리 표(스펙 5절), 지표 정의 표(스펙 4절), "필터가 없으면 views는 page_views 합계" 규칙. 스펙 문서의 해당 표를 그대로 옮긴다.

Run: `pnpm typecheck && pnpm --filter @yonyoung/api test`
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add apps/api packages/contracts
git commit -m "feat: GET /api/admin/page-views/insights 방문자 분석 API 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase C: 웹 화면 (Task 9–14)

### Task 9: 조회 옵션 URL 모델과 읽기 서비스

**Files:**
- Modify: `apps/web/features/dashboard/stats/stats-range.ts`
- Modify: `apps/web/features/dashboard/services/admin-read-service.ts`
- Test: `apps/web/tests/unit/features/dashboard/stats-range.test.ts`

**Interfaces:**
- Consumes: Task 8 `ApiVisitorInsights`, `apiVisitorInsightsSchema`
- Produces:
  - `type StatsFilters = { audience: "all" | "external" | "member"; device: "all" | "mobile" | "tablet" | "desktop"; referrer: string; landing: "all" | ApiInsightsPageType }`
  - `type StatsMetric = "views" | "visitors" | "sessions" | "duration"`
  - `StatsQuery`에 `filters: StatsFilters; metric: StatsMetric` 추가
  - `DEFAULT_FILTERS`, `toInsightsApiSearch(query: StatsQuery): string`, `activeFilterCount(filters: StatsFilters): number`
  - `getAdminVisitorInsights(cookieHeader: string | null, apiSearch: string): Promise<AdminReadResult<ApiVisitorInsights>>`
  - `toAnalyticsApiSearch`, `trendToCsv`, `trendCsvFileName` 삭제(Task 13에서 대체; 이 태스크 이후 `stats-view.tsx` 컴파일이 깨지지 않도록 Step 4 참고)

- [ ] **Step 1: 실패하는 테스트 작성**

`stats-range.test.ts`에서 기존 테스트 중 `StatsQuery` 객체를 `toEqual`로 비교하는 기대값에 `filters: DEFAULT_FILTERS, metric: "views"`를 더한다. `toAnalyticsApiSearch`를 쓰던 테스트(`직접 지정은 날짜를, API 요청은 항상 절대 날짜를 보낸다`)는 `toInsightsApiSearch`로 이름만 바꾼다. `trendToCsv` 테스트(`BOM과 CRLF가 붙은 CSV를 만든다`)는 지운다(Task 10의 `insights-format` 테스트로 옮겨 간다). 그리고 추가:

```ts
describe("조회 옵션 필터", () => {
  const today = "2026-10-16";

  it("필터와 지표를 URL에서 읽는다", () => {
    const query = parseStatsSearchParams(
      { audience: "member", device: "mobile", referrer: "google.com", landing: "activity", metric: "duration" },
      today,
    );
    expect(query.filters).toEqual({ audience: "member", device: "mobile", referrer: "google.com", landing: "activity" });
    expect(query.metric).toBe("duration");
  });

  it("잘못된 값은 기본값으로 돌린다", () => {
    const query = parseStatsSearchParams(
      { audience: "robots", device: "fridge", referrer: "https://evil/path", landing: "admin", metric: "money" },
      today,
    );
    expect(query.filters).toEqual(DEFAULT_FILTERS);
    expect(query.metric).toBe("views");
  });

  it("기본값이 아닌 필터만 URL에 남기고 왕복해도 같다", () => {
    const query = {
      ...presetQuery("30d", today),
      filters: { ...DEFAULT_FILTERS, audience: "external" as const, referrer: "direct" },
      metric: "visitors" as const,
    };
    const search = toStatsSearch(query);
    expect(search).toBe("audience=external&referrer=direct&metric=visitors");
    expect(parseStatsSearchParams(Object.fromEntries(new URLSearchParams(search)), today)).toEqual(query);
  });

  it("API 요청에는 지표를 빼고 필터만 보낸다", () => {
    const query = {
      ...presetQuery("7d", today),
      filters: { ...DEFAULT_FILTERS, landing: "exhibition" as const },
      metric: "sessions" as const,
    };
    expect(toInsightsApiSearch(query)).toBe("from=2026-10-10&to=2026-10-16&landing=exhibition");
  });

  it("켜진 필터 수를 센다", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, device: "tablet", referrer: "direct" })).toBe(2);
  });
});
```

테스트 파일 import에 `activeFilterCount`, `DEFAULT_FILTERS`, `toInsightsApiSearch`를 추가하고 `toAnalyticsApiSearch`, `trendToCsv`를 뺀다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/dashboard/stats-range.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`stats-range.ts` 상단 import를 `import type { ApiInsightsPageType, ApiPageViewGranularity } from "@yonyoung/contracts";`로 바꾸고, `StatsQuery` 타입을 다음으로 교체:

```ts
export type StatsFilters = {
  audience: "all" | "external" | "member";
  device: "all" | "mobile" | "tablet" | "desktop";
  /** "all" | "direct" | 호스트명 */
  referrer: string;
  landing: "all" | ApiInsightsPageType;
};

export type StatsMetric = "views" | "visitors" | "sessions" | "duration";

export const DEFAULT_FILTERS: StatsFilters = {
  audience: "all",
  device: "all",
  referrer: "all",
  landing: "all",
};

/**
 * 프리셋은 URL에 `range=6m`처럼 상대값으로 남긴다. 공유한 링크를 나중에 열어도 "최근 6개월"로 보인다.
 * granularity가 null이면 API가 기간 길이에 맞춰 고른다.
 * metric은 화면 전용이라 API로 보내지 않는다.
 */
export type StatsQuery = {
  preset: StatsPreset | "custom";
  from: string;
  to: string;
  granularity: ApiPageViewGranularity | null;
  filters: StatsFilters;
  metric: StatsMetric;
};
```

파일 아래쪽 헬퍼 근처에 추가:

```ts
const AUDIENCES = ["all", "external", "member"] as const;
const DEVICES = ["all", "mobile", "tablet", "desktop"] as const;
const LANDINGS = ["all", "home", "activity", "exhibition", "notice"] as const;
const METRICS = ["views", "visitors", "sessions", "duration"] as const;
// API의 normalizeReferrerHost가 저장하는 형태(소문자 호스트, direct)만 받는다.
const REFERRER_PATTERN = /^(all|direct|[a-z0-9-]+(\.[a-z0-9-]+)+)$/;

const pick = <T extends string>(allowed: readonly T[], value: string | undefined, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const parseFilters = (params: SearchParamsRecord): StatsFilters => {
  const referrer = readParam(params, "referrer");
  return {
    audience: pick(AUDIENCES, readParam(params, "audience"), "all"),
    device: pick(DEVICES, readParam(params, "device"), "all"),
    referrer: referrer !== undefined && REFERRER_PATTERN.test(referrer) ? referrer : "all",
    landing: pick(LANDINGS, readParam(params, "landing"), "all"),
  };
};

const FILTER_KEYS = ["audience", "device", "referrer", "landing"] as const;

const appendFilters = (params: URLSearchParams, filters: StatsFilters) => {
  for (const key of FILTER_KEYS) {
    if (filters[key] !== "all") params.set(key, filters[key]);
  }
};

export const activeFilterCount = (filters: StatsFilters): number =>
  FILTER_KEYS.filter((key) => filters[key] !== "all").length;
```

`presetQuery`를:

```ts
export const presetQuery = (preset: StatsPreset, today: string): StatsQuery => ({
  preset,
  ...presetRange(preset, today),
  granularity: null,
  filters: DEFAULT_FILTERS,
  metric: "views",
});
```

`parseStatsSearchParams`에서 두 return을 각각:

```ts
  const filters = parseFilters(params);
  const metric = pick(METRICS, readParam(params, "metric"), "views");
  ...
    return { preset: "custom", from, to, granularity, filters, metric };
  ...
  return { ...presetQuery(preset, today), granularity, filters, metric };
```

`toStatsSearch`의 `granularity` 처리 다음에:

```ts
  appendFilters(params, query.filters);
  if (query.metric !== "views") {
    params.set("metric", query.metric);
  }
```

`toAnalyticsApiSearch`, `trendToCsv`, `trendCsvFileName`을 지우고 추가:

```ts
/** API 요청용. 프리셋도 절대 날짜로 풀어 보낸다. */
export const toInsightsApiSearch = (query: StatsQuery): string => {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.granularity !== null) {
    params.set("granularity", query.granularity);
  }
  appendFilters(params, query.filters);
  return params.toString();
};
```

`admin-read-service.ts`의 contracts import에 `ApiVisitorInsights`, schemas import에 `apiVisitorInsightsSchema`를 추가하고, `getAdminPageViewAnalytics` 다음에:

```ts
/** apiSearch는 stats-range의 toInsightsApiSearch 결과다. */
export const getAdminVisitorInsights = (
  cookieHeader: string | null,
  apiSearch: string,
): Promise<AdminReadResult<ApiVisitorInsights>> =>
  readAdminResource(
    `/admin/page-views/insights?${apiSearch}`,
    cookieHeader,
    apiVisitorInsightsSchema,
  );
```

`getAdminPageViewAnalytics`는 Task 13 이후 쓰는 곳이 없어지면 그때 지운다.

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/dashboard/stats-range.test.ts`
Expected: PASS.

이 시점에 `stats-view.tsx`와 `page.tsx`는 지운 함수를 import하므로 웹 typecheck가 깨진다. Task 13에서 화면을 교체하며 고친다. 이 태스크는 단위 테스트만 통과 기준으로 삼고, 커밋 메시지에 그 사실을 적는다.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/features/dashboard apps/web/tests/unit/features/dashboard/stats-range.test.ts
git commit -m "feat: 방문 통계 세그먼트 필터·지표 URL 모델 추가

화면 교체(Task 13) 전까지 stats-view의 import가 깨진 상태다.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: bklit UI 도입, 차트 토큰, 데이터 변환·포맷 함수

**Files:**
- Create: `apps/web/components.json`, `apps/web/lib/utils.ts`(CLI 생성), `apps/web/components/charts/**`(CLI 생성)
- Modify: `apps/web/package.json`(CLI가 의존성 추가), `apps/web/app/(dashboard)/globals.css`
- Create: `apps/web/features/dashboard/stats/insights-format.ts`, `apps/web/features/dashboard/stats/insights-chart-data.ts`
- Test: `apps/web/tests/unit/features/dashboard/insights-format.test.ts`, `apps/web/tests/unit/features/dashboard/insights-chart-data.test.ts`

**Interfaces:**
- Produces (`insights-format.ts`):
  - `PAGE_TYPE_LABEL`, `DEVICE_LABEL`, `AUDIENCE_LABEL`, `WEEKDAY_LABEL`, `PAGE_TYPE_COLOR`, `DEVICE_COLOR`
  - `referrerLabel(host: string): string`, `formatDuration(ms: number): string`, `formatPercent(ratio: number): string`, `formatCount(n: number): string`
  - `insightsTrendToCsv(insights: ApiVisitorInsights): string`, `insightsCsvFileName(insights: ApiVisitorInsights): string`
- Produces (`insights-chart-data.ts`):
  - `bucketToDate(bucket: string): Date`
  - `metricValue(point, metric: StatsMetric): { current: number; previous: number }`
  - `toHourlyColumns(hourly): HeatmapColumnData[]` (24열 × 7행)
  - `toReferrerSankey(rows): SankeyData`, `toPathSankey(rows): SankeyData` (`{ nodes: { name: string }[]; links: { source: number; target: number; value: number }[] }`)
  - `uncollectedRange(trend): { from: Date; to: Date } | null`

- [ ] **Step 1: shadcn 설정 추가**

`apps/web/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/(dashboard)/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "@bklit": "https://ui.bklit.com/r/{name}.json"
  }
}
```

- [ ] **Step 2: 차트 소스 가져오기**

Run (apps/web에서):

```bash
cd apps/web && pnpm dlx shadcn@latest add @bklit/composed-chart @bklit/line-chart @bklit/bar-chart @bklit/ring-chart @bklit/heatmap-chart @bklit/sankey-chart @bklit/reference-area @bklit/y-axis @bklit/legend --yes
```

Expected: `components/charts/**`, `lib/utils.ts` 생성, `package.json`에 visx·motion·d3·number-flow·clsx·tailwind-merge 등 추가.

Run: `git status --short && git diff --stat`
확인할 것:
- `components/ui/skeleton.tsx` 등 기존 파일이 바뀌었으면 `git checkout -- <파일>`로 되돌린다.
- `app/(dashboard)/globals.css`에 CLI가 `:root`/`.dark`/`@theme inline` 블록을 넣었으면 **그 블록을 지운다**(Step 3에서 프로젝트 토큰으로 직접 정의한다).
- `app/(home)/globals.css`가 바뀌었으면 되돌린다.

- [ ] **Step 3: 차트 토큰 정의**

`app/(dashboard)/globals.css`의 `:root { ... }` 블록 끝(닫는 `}` 직전)에 추가:

```css
  /* ── 차트 (bklit UI) ──
   * 분류 색은 dataviz 검증기로 라이트 surface(#fff) 기준 6개 검사를 통과했다.
   * 색은 엔티티에 고정한다(홈=1, 활동=2, 전시=3, 공지=4, 이탈·기타·이전 기간=5). */
  --chart-1: #0075de;
  --chart-2: #dd5b00;
  --chart-3: #009b8f;
  --chart-4: #9b5fd0;
  --chart-5: var(--ink-muted);
  --chart-background: var(--surface);
  --chart-foreground: var(--ink);
  --chart-foreground-muted: var(--ink-muted);
  --chart-label: var(--ink-muted);
  --chart-grid: var(--hairline);
  --chart-crosshair: var(--ink-faint);
  --chart-brush-border: var(--hairline);
  --chart-line-primary: var(--chart-1);
  --chart-line-secondary: var(--chart-5);
  --chart-indicator-color: var(--ink-faint);
  --chart-indicator-secondary-color: var(--hairline);
  --chart-tooltip-background: var(--surface-raised);
  --chart-tooltip-foreground: var(--ink);
  --chart-tooltip-muted: var(--ink-muted);
  --chart-marker-background: var(--surface-sunken);
  --chart-marker-border: var(--hairline-strong);
  --chart-marker-foreground: var(--ink-secondary);
  --chart-marker-badge-background: var(--surface-raised);
  --chart-marker-badge-foreground: var(--ink);
  --chart-segment-background: var(--surface-sunken);
  --chart-segment-line: var(--hairline);
  /* 크기(순차) 스케일: 파랑 한 색상, 밝음 → 어두움 */
  --chart-scale-01: #e8f2fd;
  --chart-scale-02: #b6d9f8;
  --chart-scale-03: #62aef0;
  --chart-scale-04: #0075de;
  --chart-scale-05: #005bab;
  --chart-scale-pattern-color: var(--surface-sunken);
  --legend: var(--surface);
  --legend-foreground: var(--ink);
  --legend-muted: var(--surface-sunken);
  --legend-muted-foreground: var(--ink-muted);
  --legend-track: var(--hairline);
  /* bklit 소스가 쓰는 shadcn 기본 이름 */
  --foreground: var(--ink);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--ink-muted);
  --border: var(--hairline);
  --popover: var(--surface-raised);
  --popover-foreground: var(--ink);
```

`.dark { ... }` 블록 끝에 추가:

```css
  /* 다크 분류 색: surface(#232322) 기준 6개 검사 통과. 라이트 값을 뒤집지 않고 따로 고른 단계다. */
  --chart-1: #3b8fe8;
  --chart-2: #e2701f;
  --chart-3: #13a89a;
  --chart-4: #9d6fd6;
  /* 다크에서는 많을수록 밝다 */
  --chart-scale-01: #1d2a3a;
  --chart-scale-02: #2c527d;
  --chart-scale-03: #1668c4;
  --chart-scale-04: #3b8fe8;
  --chart-scale-05: #8cc0f5;
```

`@theme inline { ... }` 블록 끝에 추가(bklit 클래스 `text-chart-label`, `bg-chart-tooltip-background`, `text-foreground`, `bg-muted` 등이 동작하도록):

```css
  --color-chart-label: var(--chart-label);
  --color-chart-tooltip-background: var(--chart-tooltip-background);
  --color-chart-tooltip-foreground: var(--chart-tooltip-foreground);
  --color-chart-tooltip-muted: var(--chart-tooltip-muted);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
```

검증: `node /tmp/claude-1000/bundled-skills/*/*/dataviz/scripts/validate_palette.js "#0075de,#dd5b00,#009b8f,#9b5fd0" --mode light --surface "#ffffff"`와 다크 값(`--mode dark --surface "#232322"`)이 모두 PASS인지 다시 확인한다(스킬 경로는 `dataviz` 스킬을 불러 확인).

- [ ] **Step 4: 한국어 포맷과 히트맵 라벨 확장**

가져온 소스는 우리 코드다. 다음을 고친다.

1. `components/charts/chart-formatters.ts`: `"en-US"`를 모두 `"ko-KR"`로 바꾼다.
2. `components/charts/heatmap/heatmap-y-axis.tsx`: props에 `labels?: readonly string[]`를 추가하고, `getHeatmapDayLabels(weekStartDay)`를 `(labels ?? getHeatmapDayLabels(weekStartDay))`로 바꾼다. `useMemo` 의존성 배열에 `labels`를 넣는다.
3. `components/charts/heatmap/heatmap-x-axis.tsx`: props에 `formatColumn?: (columnIndex: number) => string | null`를 추가한다. `labels` 계산 맨 앞에:

```tsx
    if (formatColumn) {
      return data.flatMap((_, columnIndex) => {
        const label = formatColumn(columnIndex);
        return label === null
          ? []
          : [{ label, x: margin.left + xScale(columnIndex), key: String(columnIndex) }];
      });
    }
```

   의존성 배열에 `formatColumn`을 넣는다.
4. `components/charts/heatmap/heatmap-tooltip.tsx`: props에 `formatHeader?: (cell: { column: number; row: number }) => React.ReactNode`를 추가하고, `<TooltipHeader>` 안을 `formatHeader ? formatHeader(displayData) : (기존 날짜·요일 두 줄)`로 바꾼다.

- [ ] **Step 5: 설치 검증**

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint`

가져온 소스에서 오류가 나면:
- 타입 오류(엄격 옵션, `noUncheckedIndexedAccess` 등)는 해당 줄을 최소 수정한다.
- 린트 규칙 위반이 소스 전반에 걸쳐 많으면 `apps/web/eslint.config.mjs`의 ignore 목록에 `components/charts/**`를 "bklit 레지스트리에서 가져온 소스" 주석과 함께 추가한다.
- `stats-view.tsx`/`page.tsx`의 import 오류(Task 9)는 Task 13에서 고치므로 남겨 둔다. 그 외 오류는 0이어야 한다.

- [ ] **Step 6: 실패하는 포맷·변환 테스트 작성**

`apps/web/tests/unit/features/dashboard/insights-format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  formatDuration,
  formatPercent,
  insightsCsvFileName,
  insightsTrendToCsv,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";

describe("insights-format", () => {
  it("체류 시간을 초·분으로 쓴다", () => {
    expect(formatDuration(0)).toBe("0초");
    expect(formatDuration(42_400)).toBe("42초");
    expect(formatDuration(60_000)).toBe("1분");
    expect(formatDuration(95_000)).toBe("1분 35초");
  });

  it("비율을 소수 한 자리 퍼센트로 쓴다", () => {
    expect(formatPercent(0.6667)).toBe("66.7%");
  });

  it("유입 경로 예약어를 한국어로 바꾼다", () => {
    expect(referrerLabel("direct")).toBe("직접 접속");
    expect(referrerLabel("other")).toBe("기타");
    expect(referrerLabel("google.com")).toBe("google.com");
  });

  it("추이 CSV는 BOM·CRLF와 모든 지표 열을 담는다", () => {
    const insights = {
      range: { from: "2026-10-01", to: "2026-10-02", days: 2, granularity: "day" },
      previousRange: { from: "2026-09-29", to: "2026-09-30" },
      trend: [
        {
          bucket: "2026-10-01", views: 10, visitors: 4, sessions: 5, avgSessionMs: 61_000,
          newVisitors: 3, returningVisitors: 1, prevViews: 8, prevVisitors: 3, prevSessions: 4,
          prevAvgSessionMs: 30_000, collected: true,
        },
      ],
    } as unknown as ApiVisitorInsights;

    const csv = insightsTrendToCsv(insights);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain("구간,페이지뷰,방문자,세션,평균 체류(초),신규 방문자,재방문 방문자,이전 페이지뷰,이전 방문자,이전 세션,이전 평균 체류(초),수집 여부");
    expect(csv).toContain("2026-10-01,10,4,5,61,3,1,8,3,4,30,수집");
    expect(insightsCsvFileName(insights)).toBe("visitor-insights_2026-10-01_2026-10-02_day.csv");
  });
});
```

`apps/web/tests/unit/features/dashboard/insights-chart-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  bucketToDate,
  metricValue,
  toHourlyColumns,
  toPathSankey,
  toReferrerSankey,
  uncollectedRange,
} from "@/features/dashboard/stats/insights-chart-data";

const point = {
  bucket: "2026-10-01", views: 10, visitors: 4, sessions: 5, avgSessionMs: 60_000,
  newVisitors: 3, returningVisitors: 1, prevViews: 8, prevVisitors: 3, prevSessions: 4,
  prevAvgSessionMs: 30_000, collected: true,
};

describe("insights-chart-data", () => {
  it("버킷 문자열을 KST 자정 Date로 바꾼다", () => {
    expect(bucketToDate("2026-10-01").toISOString()).toBe("2026-09-30T15:00:00.000Z");
    expect(bucketToDate("2026-10").toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });

  it("지표별 현재·이전 값을 고른다. 체류는 초 단위다", () => {
    expect(metricValue(point, "views")).toEqual({ current: 10, previous: 8 });
    expect(metricValue(point, "duration")).toEqual({ current: 60, previous: 30 });
  });

  it("요일×시간 168칸을 24열 7행으로 만든다", () => {
    const hourly = Array.from({ length: 168 }, (_, i) => ({
      weekday: Math.floor(i / 24),
      hour: i % 24,
      views: i,
    }));
    const columns = toHourlyColumns(hourly);
    expect(columns).toHaveLength(24);
    expect(columns[8]!.bins).toHaveLength(7);
    expect(columns[8]!.bins[2]!.count).toBe(2 * 24 + 8);
  });

  it("유입 흐름 Sankey는 유입 노드 다음에 페이지 종류 노드를 둔다", () => {
    const data = toReferrerSankey([
      { referrer: "google.com", landing: "home", sessions: 3 },
      { referrer: "direct", landing: "activity", sessions: 2 },
    ]);
    expect(data.nodes.map((node) => node.name)).toEqual(["google.com", "직접 접속", "홈", "활동"]);
    expect(data.links).toEqual([
      { source: 0, target: 2, value: 3 },
      { source: 1, target: 3, value: 2 },
    ]);
  });

  it("이동 경로 Sankey는 단계별로 노드를 나누고 이탈을 따로 둔다", () => {
    const data = toPathSankey([
      { step: 1, from: "home", to: "activity", sessions: 2 },
      { step: 1, from: "home", to: "exit", sessions: 1 },
      { step: 2, from: "activity", to: "exit", sessions: 2 },
    ]);
    expect(data.nodes.map((node) => node.name)).toEqual([
      "진입: 홈",
      "2번째: 활동",
      "2번째: 이탈",
      "3번째: 이탈",
    ]);
    expect(data.links).toEqual([
      { source: 0, target: 1, value: 2 },
      { source: 0, target: 2, value: 1 },
      { source: 1, target: 3, value: 2 },
    ]);
  });

  it("수집 전 구간의 처음과 끝을 돌려준다", () => {
    expect(
      uncollectedRange([
        { ...point, bucket: "2026-10-01", collected: false },
        { ...point, bucket: "2026-10-02", collected: false },
        { ...point, bucket: "2026-10-03", collected: true },
      ]),
    ).toEqual({ from: bucketToDate("2026-10-01"), to: bucketToDate("2026-10-02") });
    expect(uncollectedRange([point])).toBeNull();
  });
});
```

- [ ] **Step 7: 실패 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/dashboard/insights-format.test.ts tests/unit/features/dashboard/insights-chart-data.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 8: 구현**

`apps/web/features/dashboard/stats/insights-format.ts`:

```ts
import type { ApiVisitorInsights } from "@yonyoung/contracts";

export const PAGE_TYPE_LABEL = {
  home: "홈",
  activity: "활동",
  exhibition: "전시",
  notice: "공지",
} as const;

export const DEVICE_LABEL = { mobile: "모바일", tablet: "태블릿", desktop: "데스크톱" } as const;
export const AUDIENCE_LABEL = { all: "전체", external: "외부 방문자", member: "회원" } as const;
export const WEEKDAY_LABEL = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 색은 엔티티에 고정한다. 필터로 항목 수가 바뀌어도 남은 항목 색이 바뀌지 않는다. */
export const PAGE_TYPE_COLOR = {
  home: "var(--chart-1)",
  activity: "var(--chart-2)",
  exhibition: "var(--chart-3)",
  notice: "var(--chart-4)",
} as const;
export const DEVICE_COLOR = {
  mobile: "var(--chart-1)",
  desktop: "var(--chart-2)",
  tablet: "var(--chart-3)",
} as const;
export const NEUTRAL_COLOR = "var(--chart-5)";

export const referrerLabel = (host: string): string => {
  if (host === "direct") return "직접 접속";
  if (host === "other") return "기타";
  return host;
};

export const formatCount = (value: number): string => value.toLocaleString("ko-KR");

export const formatPercent = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`;

export const formatDuration = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
};

export const insightsTrendToCsv = (insights: ApiVisitorInsights): string => {
  const seconds = (ms: number) => String(Math.round(ms / 1000));
  const rows = [
    [
      "구간",
      "페이지뷰",
      "방문자",
      "세션",
      "평균 체류(초)",
      "신규 방문자",
      "재방문 방문자",
      "이전 페이지뷰",
      "이전 방문자",
      "이전 세션",
      "이전 평균 체류(초)",
      "수집 여부",
    ],
    ...insights.trend.map((point) => [
      point.bucket,
      String(point.views),
      String(point.visitors),
      String(point.sessions),
      seconds(point.avgSessionMs),
      String(point.newVisitors),
      String(point.returningVisitors),
      String(point.prevViews),
      String(point.prevVisitors),
      String(point.prevSessions),
      seconds(point.prevAvgSessionMs),
      point.collected ? "수집" : "수집 전",
    ]),
  ];
  // Excel이 UTF-8 한글을 깨뜨리지 않도록 BOM을 붙이고, 줄바꿈도 Excel 기본값인 CRLF를 쓴다.
  return `﻿${rows.map((row) => row.join(",")).join("\r\n")}\r\n`;
};

export const insightsCsvFileName = (insights: ApiVisitorInsights): string =>
  `visitor-insights_${insights.range.from}_${insights.range.to}_${insights.range.granularity}.csv`;
```

`apps/web/features/dashboard/stats/insights-chart-data.ts`:

```ts
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import type { StatsMetric } from "./stats-range";
import { PAGE_TYPE_LABEL, referrerLabel } from "./insights-format";

type TrendPoint = ApiVisitorInsights["trend"][number];

export type SankeyData = {
  nodes: Array<{ name: string }>;
  links: Array<{ source: number; target: number; value: number }>;
};

/** 버킷은 KST 날짜(YYYY-MM-DD) 또는 월(YYYY-MM)이다. */
export const bucketToDate = (bucket: string): Date =>
  new Date(`${bucket.length === 7 ? `${bucket}-01` : bucket}T00:00:00+09:00`);

export const metricValue = (point: TrendPoint, metric: StatsMetric) => {
  switch (metric) {
    case "views":
      return { current: point.views, previous: point.prevViews };
    case "visitors":
      return { current: point.visitors, previous: point.prevVisitors };
    case "sessions":
      return { current: point.sessions, previous: point.prevSessions };
    case "duration":
      return {
        current: Math.round(point.avgSessionMs / 1000),
        previous: Math.round(point.prevAvgSessionMs / 1000),
      };
  }
};

// bklit 히트맵은 날짜 격자용이라 칸마다 Date가 필요하다. 2024-01-01(월)부터의 고정 주를 써서 요일 순서만 맞춘다.
const REFERENCE_MONDAY_UTC = Date.UTC(2024, 0, 1);

export const toHourlyColumns = (hourly: ApiVisitorInsights["hourly"]) =>
  Array.from({ length: 24 }, (_, hour) => ({
    bin: hour,
    bins: Array.from({ length: 7 }, (_, weekday) => ({
      bin: weekday,
      count: hourly.find((cell) => cell.weekday === weekday && cell.hour === hour)?.views ?? 0,
      date: new Date(REFERENCE_MONDAY_UTC + (weekday * 24 + hour) * 3_600_000),
    })),
  }));

const buildSankey = (
  links: Array<{ from: string; to: string; value: number }>,
): SankeyData => {
  const index = new Map<string, number>();
  const nodeOf = (name: string) => {
    if (!index.has(name)) index.set(name, index.size);
    return index.get(name)!;
  };
  // 출발 노드를 먼저 등록해 왼쪽 열이 앞번호를 갖게 한다.
  links.forEach((link) => nodeOf(link.from));
  const sankeyLinks = links.map((link) => ({
    source: nodeOf(link.from),
    target: nodeOf(link.to),
    value: link.value,
  }));
  return { nodes: [...index.keys()].map((name) => ({ name })), links: sankeyLinks };
};

export const toReferrerSankey = (rows: ApiVisitorInsights["referrerFlow"]): SankeyData =>
  buildSankey(
    rows.map((row) => ({
      from: referrerLabel(row.referrer),
      to: PAGE_TYPE_LABEL[row.landing],
      value: row.sessions,
    })),
  );

const STEP_LABEL = { 1: "진입", 2: "2번째", 3: "3번째" } as const;
const pageLabel = (page: keyof typeof PAGE_TYPE_LABEL | "exit") =>
  page === "exit" ? "이탈" : PAGE_TYPE_LABEL[page];

export const toPathSankey = (rows: ApiVisitorInsights["pathFlow"]): SankeyData =>
  buildSankey(
    [...rows]
      .sort((a, b) => a.step - b.step)
      .map((row) => ({
        from: `${STEP_LABEL[row.step]}: ${pageLabel(row.from)}`,
        to: `${STEP_LABEL[(row.step + 1) as 2 | 3]}: ${pageLabel(row.to)}`,
        value: row.sessions,
      })),
  );

export const uncollectedRange = (trend: readonly TrendPoint[]) => {
  const pending = trend.filter((point) => !point.collected);
  if (pending.length === 0) return null;
  return {
    from: bucketToDate(pending[0]!.bucket),
    to: bucketToDate(pending[pending.length - 1]!.bucket),
  };
};
```

`toPathSankey` 테스트의 노드 순서("진입: 홈", "2번째: 활동", "2번째: 이탈", "3번째: 이탈")는 `buildSankey`가 출발 노드를 먼저 등록하는 순서에 의존한다. 1단계 출발(진입: 홈), 2단계 출발(2번째: 활동), 그다음 도착 노드 순이다. 테스트가 다른 순서를 기대하면 테스트가 아니라 등록 순서 규칙을 확인하고 기대값을 이 규칙대로 고친다.

- [ ] **Step 9: 통과 확인**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/dashboard`
Expected: PASS.

- [ ] **Step 10: 커밋**

```bash
git add apps/web/components.json apps/web/lib apps/web/components/charts apps/web/package.json pnpm-lock.yaml "apps/web/app/(dashboard)/globals.css" apps/web/features/dashboard/stats apps/web/tests/unit/features/dashboard apps/web/eslint.config.mjs
git commit -m "feat: bklit UI 차트 도입과 대시보드 차트 토큰·데이터 변환 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 공통 카드, KPI, 추이 차트

**Files:**
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/chart-card.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/delta.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/kpi-grid.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/trend-card.tsx`
- Modify: `apps/web/app/(dashboard)/_components/ui/stat-tile.tsx` (`footer` prop)

**Interfaces:**
- Consumes: Task 10 포맷·변환 함수, bklit `ComposedChart`, `LineChart`, `Line`, `SeriesBar`, `Grid`, `XAxis`, `YAxis`, `ChartTooltip`, `ReferenceArea`
- Produces:
  - `<ChartCard title description? actions? empty?: string | null table?: { columns: string[]; rows: Array<Array<string>> } testId?>{children}</ChartCard>`
  - `<Delta current previous kind?: "relative" | "points" lowerIsBetter? />`
  - `<KpiGrid insights />`
  - `<TrendCard insights metric onMetricChange />`

UI 태스크는 e2e(Task 14)로 검증한다. 각 컴포넌트를 쓴 뒤 `typecheck`·`lint`로 확인한다.

- [ ] **Step 1: bklit API 확인**

Run: `ls apps/web/components/charts && grep -n "export interface \(Line\|SeriesBar\|ChartTooltip\|ReferenceArea\|LineChart\)Props" -A30 apps/web/components/charts/*.tsx apps/web/components/charts/**/*.tsx | grep -n "dataKey\|stroke\|strokeDasharray\|rows\|aspectRatio\|x1\|x2\|fill"`

아래 코드의 prop 이름(`strokeDasharray`, `rows`, `aspectRatio`, `x1`/`x2`)이 실제와 다르면 실제 이름으로 바꾼다. `ChartTooltip`의 `rows` 반환 타입(`TooltipRow`)의 필드명도 확인한다.

- [ ] **Step 2: 공통 카드**

`chart-card.tsx`:

```tsx
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";

type ChartCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** 값이 있으면 차트 대신 이 문구를 보여 준다. */
  empty?: string | null;
  /** 같은 숫자를 표로도 제공해 색이나 모양만으로 읽지 않아도 되게 한다. */
  table?: { columns: readonly string[]; rows: ReadonlyArray<readonly string[]> };
  testId?: string;
  children: ReactNode;
};

export default function ChartCard({ title, description, actions, empty, table, testId, children }: ChartCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className="mt-4">
        {empty ? <p className="text-caption text-ink-muted">{empty}</p> : children}
      </div>
      {!empty && table && table.rows.length > 0 && (
        <details className="mt-4 text-body-sm">
          <summary className="min-h-11 cursor-pointer content-center rounded-xs text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
            표로 보기
          </summary>
          <div className="mt-2 max-h-80 overflow-auto rounded-md border border-hairline">
            <table className="w-full text-left tabular-nums">
              <thead className="sticky top-0 bg-canvas-soft text-caption text-ink-muted">
                <tr>
                  {table.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`px-3 py-2 font-medium ${index === 0 ? "" : "text-right"}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {table.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, index) => (
                      <td
                        key={`${index}-${cell}`}
                        className={`px-3 py-2 text-ink ${index === 0 ? "" : "text-right"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
```

`Card`가 `data-testid`를 넘기지 않으면 바깥을 `<div data-testid={testId}>`로 감싼다.

- [ ] **Step 3: 증감 표시**

`delta.tsx`(기존 `stats-view.tsx`의 `Delta`를 옮기고 비율 지표를 지원):

```tsx
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

type DeltaProps = {
  current: number;
  previous: number;
  /** relative: 증감률(%), points: 비율 지표의 %p 차이 */
  kind?: "relative" | "points";
  /** 이탈률처럼 줄어야 좋은 지표 */
  lowerIsBetter?: boolean;
};

/**
 * 이전 기간 대비 증감. 이전 값이 0이면 비율이 의미가 없어 "+100%" 같은 숫자를 만들지 않고 문장으로 쓴다.
 * 화살표와 부호를 함께 써서 색만으로 증감을 전달하지 않는다.
 */
export default function Delta({ current, previous, kind = "relative", lowerIsBetter = false }: DeltaProps) {
  if (kind === "relative" && previous === 0) {
    return <>이전 기간 기록 없음</>;
  }
  const change = kind === "points" ? (current - previous) * 100 : ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  const isGood = isUp !== lowerIsBetter;
  return (
    <span className="break-keep">
      <span
        className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold tabular-nums ${
          isGood ? "text-success-text" : "text-danger-text"
        }`}
      >
        {isUp ? (
          <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
        )}
        {isUp ? "+" : "-"}
        {Math.abs(change).toFixed(1)}
        {kind === "points" ? "%p" : "%"}
      </span>{" "}
      이전 기간 대비
    </span>
  );
}
```

- [ ] **Step 4: KPI 6개**

`StatTile`은 caption을 `<p>`로 감싼다. 차트(`<div>`, `<svg>`)를 caption에 넣으면 잘못된 HTML이라 하이드레이션 오류가 난다. `stat-tile.tsx`에 블록 슬롯을 더한다.

`StatTileProps`에 추가:

```ts
  /** caption 아래 블록 요소(스파크라인 등). caption은 <p> 안이라 블록을 넣을 수 없다. */
  footer?: ReactNode;
```

구조 분해에 `footer`를 더하고, caption `<p>` 다음 줄에:

```tsx
      {footer !== undefined && <div className="mt-2">{footer}</div>}
```

`kpi-grid.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { BarChart3Icon, ClockIcon, LayersIcon, LogOutIcon, MousePointerClickIcon, UsersIcon } from "lucide-react";
import { Line, LineChart } from "@/components/charts";
import { StatTile } from "@/app/(dashboard)/_components/ui/stat-tile";
import { bucketToDate } from "@/features/dashboard/stats/insights-chart-data";
import { formatCount, formatDuration, formatPercent } from "@/features/dashboard/stats/insights-format";
import Delta from "./delta";

type TrendKey = "views" | "visitors" | "sessions" | "avgSessionMs";

const Sparkline = ({ insights, dataKey }: { insights: ApiVisitorInsights; dataKey: TrendKey }) => (
  // 숫자는 타일이 전달한다. 스파크라인은 흐름만 보여 주는 장식이라 보조 기술에서 숨긴다.
  <div aria-hidden="true" className="h-8 w-full">
    <LineChart
      data={insights.trend.map((point) => ({ date: bucketToDate(point.bucket), value: point[dataKey] }))}
      aspectRatio="6 / 1"
      margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
    >
      <Line dataKey="value" stroke="var(--chart-1)" />
    </LineChart>
  </div>
);

export default function KpiGrid({ insights }: { insights: ApiVisitorInsights }) {
  const { summary } = insights;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="stats-kpis">
      <StatTile
        label="순방문자"
        value={formatCount(summary.visitors)}
        caption={<Delta current={summary.visitors} previous={summary.prev.visitors} />}
        footer={<Sparkline insights={insights} dataKey="visitors" />}
        Icon={UsersIcon}
        accent="sky"
      />
      <StatTile
        label="세션"
        value={formatCount(summary.sessions)}
        caption={<Delta current={summary.sessions} previous={summary.prev.sessions} />}
        footer={<Sparkline insights={insights} dataKey="sessions" />}
        Icon={LayersIcon}
        accent="teal"
      />
      <StatTile
        label="페이지뷰"
        value={formatCount(summary.views)}
        caption={<Delta current={summary.views} previous={summary.prev.views} />}
        footer={<Sparkline insights={insights} dataKey="views" />}
        Icon={BarChart3Icon}
        accent="purple"
      />
      <StatTile
        label="세션당 페이지"
        value={summary.pagesPerSession.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
        caption={<Delta current={summary.pagesPerSession} previous={summary.prev.pagesPerSession} />}
        Icon={MousePointerClickIcon}
        accent="green"
      />
      <StatTile
        label="평균 체류 시간"
        value={formatDuration(summary.avgSessionMs)}
        caption={
          <>
            <Delta current={summary.avgSessionMs} previous={summary.prev.avgSessionMs} />
            {summary.unmeasuredSessions > 0 && (
              <span className="block">측정 안 된 세션 {formatCount(summary.unmeasuredSessions)}개 제외</span>
            )}
          </>
        }
        footer={<Sparkline insights={insights} dataKey="avgSessionMs" />}
        Icon={ClockIcon}
        accent="orange"
      />
      <StatTile
        label="이탈률"
        value={formatPercent(summary.bounceRate)}
        caption={
          <>
            <Delta current={summary.bounceRate} previous={summary.prev.bounceRate} kind="points" lowerIsBetter />
            <span className="block">페이지 1개만 본 세션 비율</span>
          </>
        }
        Icon={LogOutIcon}
        accent="pink"
      />
    </div>
  );
}
```

`StickerAccent`에 `"pink"`, `"green"`이 없으면 `sticker.ts`에서 허용 값을 확인해 있는 값으로 바꾼다. `@/components/charts`에 barrel(`index.ts`)이 없으면 각 파일 경로(`@/components/charts/line-chart` 등)로 import한다.

- [ ] **Step 5: 추이 카드**

`trend-card.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { ChartTooltip, ComposedChart, Grid, Line, ReferenceArea, SeriesBar, XAxis, YAxis } from "@/components/charts";
import { SegmentedControl } from "@/app/(dashboard)/_components/ui/segmented-control";
import { bucketToDate, metricValue, uncollectedRange } from "@/features/dashboard/stats/insights-chart-data";
import { formatCount, NEUTRAL_COLOR } from "@/features/dashboard/stats/insights-format";
import type { StatsMetric } from "@/features/dashboard/stats/stats-range";
import ChartCard from "./chart-card";

const GRANULARITY_LABEL = { day: "일", week: "주", month: "월" } as const;
const METRIC_OPTIONS: ReadonlyArray<{ value: StatsMetric; label: string }> = [
  { value: "views", label: "페이지뷰" },
  { value: "visitors", label: "방문자" },
  { value: "sessions", label: "세션" },
  { value: "duration", label: "평균 체류" },
];
const UNIT: Record<StatsMetric, string> = { views: "회", visitors: "명", sessions: "회", duration: "초" };

type TrendCardProps = {
  insights: ApiVisitorInsights;
  metric: StatsMetric;
  onMetricChange: (metric: StatsMetric) => void;
};

export default function TrendCard({ insights, metric, onMetricChange }: TrendCardProps) {
  // 필터 없는 페이지뷰만 합계 테이블에서 오므로 수집 전 구간이 없다. 나머지는 이벤트 기반이다.
  const usesEvents = metric !== "views" || insights.segmented;
  const pending = usesEvents ? uncollectedRange(insights.trend) : null;
  const data = insights.trend.map((point) => {
    const { current, previous } = metricValue(point, metric);
    return {
      date: bucketToDate(point.bucket),
      current,
      previous,
      newVisitors: point.newVisitors,
      returningVisitors: point.returningVisitors,
    };
  });
  const hasAny = data.some((row) => row.current > 0 || row.previous > 0);
  const unit = UNIT[metric];

  return (
    <ChartCard
      testId="stats-trend"
      title="추이"
      description={`${GRANULARITY_LABEL[insights.range.granularity]} 단위, 빈 날은 0으로 표시`}
      actions={
        <SegmentedControl
          label="추이 지표"
          options={METRIC_OPTIONS}
          value={metric}
          onChange={onMetricChange}
          testIdPrefix="btn-stats-metric"
        />
      }
      empty={hasAny ? null : "이 기간과 비교 기간 모두 기록이 없습니다. 기간을 넓히거나 필터를 줄여 보세요."}
      table={{
        columns: ["구간", `선택 기간(${unit})`, `이전 기간(${unit})`],
        rows: insights.trend.map((point, index) => [
          point.collected || !usesEvents ? point.bucket : `${point.bucket} (수집 전)`,
          formatCount(data[index]!.current),
          formatCount(data[index]!.previous),
        ]),
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-4 text-caption text-ink-muted">
        {metric === "visitors" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-(--chart-1)" />
              신규
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-(--chart-3)" />
              재방문
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-(--chart-1)" />
            선택 기간
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-(--chart-5)" />
          이전 기간
        </span>
        {pending && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-4 rounded-xs bg-canvas-soft" />
            수집 전
          </span>
        )}
      </div>
      <ComposedChart data={data} stacked={metric === "visitors"} aspectRatio="5 / 2">
        <Grid horizontal />
        {pending && <ReferenceArea x1={pending.from} x2={pending.to} fill="var(--canvas-soft)" fillOpacity={1} />}
        {metric === "visitors" ? (
          <>
            <SeriesBar dataKey="newVisitors" fill="var(--chart-1)" radius={2} />
            <SeriesBar dataKey="returningVisitors" fill="var(--chart-3)" radius={2} />
          </>
        ) : (
          <Line dataKey="current" stroke="var(--chart-1)" />
        )}
        <Line dataKey="previous" stroke={NEUTRAL_COLOR} strokeDasharray="4 4" />
        <XAxis />
        <YAxis formatValue={(value: number) => formatCount(value)} />
        <ChartTooltip
          rows={(point) => [
            ...(metric === "visitors"
              ? [
                  { color: "var(--chart-1)", label: "신규", value: formatCount(Number(point.newVisitors)) },
                  { color: "var(--chart-3)", label: "재방문", value: formatCount(Number(point.returningVisitors)) },
                ]
              : [{ color: "var(--chart-1)", label: "선택 기간", value: `${formatCount(Number(point.current))}${unit}` }]),
            { color: NEUTRAL_COLOR, label: "이전 기간", value: `${formatCount(Number(point.previous))}${unit}` },
          ]}
        />
      </ComposedChart>
    </ChartCard>
  );
}
```

`stacked`는 `SeriesBar`만 쌓고 `Line`은 쌓지 않는다(bklit `ComposedChart` 문서). 그래서 방문자 지표에서 이전 기간 선이 막대 총합과 같은 축에 그려진다(이중 축 아님).

- [ ] **Step 6: 검증**

Run: `pnpm --filter @yonyoung/web exec tsc -p tsconfig.typecheck.json --noEmit 2>&1 | grep "stats/_components" ; pnpm --filter @yonyoung/web exec eslint "app/(dashboard)/dashboard/stats/_components"`
Expected: 새 파일 4개에서 오류 0. (`stats-view.tsx`의 기존 오류는 Task 13에서 고친다.)

- [ ] **Step 7: 커밋**

```bash
git add "apps/web/app/(dashboard)/dashboard/stats/_components"
git commit -m "feat: 방문 통계 KPI·추이 차트 컴포넌트 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 패턴 섹션 (히트맵, 구성 비율, 흐름, 분포, 코호트, 콘텐츠 표)

**Files:**
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/hourly-heatmap-card.tsx`
- Create: `.../_components/composition-card.tsx`
- Create: `.../_components/flow-cards.tsx`
- Create: `.../_components/distribution-cards.tsx`
- Create: `.../_components/cohort-card.tsx`
- Create: `.../_components/content-table.tsx`

**Interfaces:**
- Consumes: Task 10 변환·포맷, Task 11 `ChartCard`; bklit `HeatmapChart`, `HeatmapCells`, `HeatmapXAxis`(formatColumn), `HeatmapYAxis`(labels), `HeatmapTooltip`(formatHeader), `HeatmapLegend`, `HeatmapInteractionProvider`, `HeatmapInteractionBoundary`, `RingChart`, `Ring`, `RingCenter`, `SankeyChart`, `SankeyLink`, `SankeyNode`, `SankeyTooltip`, `BarChart`, `Bar`, `BarXAxis`
- Produces: `<HourlyHeatmapCard insights />`, `<CompositionCard insights />`, `<ReferrerFlowCard insights />`, `<PathFlowCard insights />`, `<DepthCard insights />`, `<DurationCard insights />`, `<CohortCard insights />`, `<ContentTable insights />`

- [ ] **Step 1: 요일×시간 히트맵**

`hourly-heatmap-card.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from "@/components/charts";
import { toHourlyColumns } from "@/features/dashboard/stats/insights-chart-data";
import { formatCount, WEEKDAY_LABEL } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const LEVEL_COLORS = [
  "var(--chart-scale-01)",
  "var(--chart-scale-02)",
  "var(--chart-scale-03)",
  "var(--chart-scale-04)",
  "var(--chart-scale-05)",
] as const;

export default function HourlyHeatmapCard({ insights }: { insights: ApiVisitorInsights }) {
  const columns = toHourlyColumns(insights.hourly);
  const total = insights.hourly.reduce((sum, cell) => sum + cell.views, 0);
  const viewsAt = (weekday: number, hour: number) =>
    insights.hourly.find((cell) => cell.weekday === weekday && cell.hour === hour)?.views ?? 0;

  return (
    <ChartCard
      testId="stats-hourly"
      title="요일 × 시간대"
      description="KST 기준 페이지뷰. 진할수록 많음"
      empty={total === 0 ? "이 기간·조건에 기록된 페이지뷰가 없습니다." : null}
      table={{
        columns: ["시간", ...WEEKDAY_LABEL],
        rows: Array.from({ length: 24 }, (_, hour) => [
          `${hour}시`,
          ...WEEKDAY_LABEL.map((_, weekday) => formatCount(viewsAt(weekday, hour))),
        ]),
      }}
    >
      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary>
          <div className="flex w-full flex-col items-stretch gap-3">
            <HeatmapChart className="w-full" data={columns} layout="fluid" levelColors={LEVEL_COLORS}>
              <HeatmapCells />
              <HeatmapXAxis formatColumn={(hour) => (hour % 3 === 0 ? `${hour}시` : null)} />
              <HeatmapYAxis labels={WEEKDAY_LABEL} tickFilter="all" />
              <HeatmapTooltip
                formatHeader={({ column, row }) => `${WEEKDAY_LABEL[row]}요일 ${column}시`}
                formatLabel={(count) => `페이지뷰 ${formatCount(count)}회`}
              />
            </HeatmapChart>
            <HeatmapLegend lessLabel="적음" moreLabel="많음" />
          </div>
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>
    </ChartCard>
  );
}
```

`levelColors` 타입(`HeatmapLevelColors`)이 튜플이면 `as const` 배열이 맞는지 확인한다. 범례 스와치가 `levelColors`를 따르지 않으면 `HeatmapLegend`에도 같은 값을 넘긴다.

- [ ] **Step 2: 구성 비율 Ring 3개**

`composition-card.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Ring, RingCenter, RingChart } from "@/components/charts";
import {
  DEVICE_COLOR,
  DEVICE_LABEL,
  formatCount,
  formatPercent,
} from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

type Slice = { label: string; value: number; color: string };

const RingBlock = ({ title, slices, unit }: { title: string; slices: Slice[]; unit: string }) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = slices.map((slice) => ({ ...slice, maxValue: total }));
  return (
    <figure className="flex flex-col items-center gap-3">
      <RingChart data={data} size={160} strokeWidth={12}>
        {data.map((slice, index) => (
          <Ring index={index} key={slice.label} color={slice.color} />
        ))}
        <RingCenter defaultLabel={title} />
      </RingChart>
      {/* 범례에 숫자와 비율을 함께 써서 색 없이도 읽힌다. */}
      <figcaption className="w-full">
        <ul className="flex flex-col gap-1 text-caption">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-ink">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                {slice.label}
              </span>
              <span className="tabular-nums text-ink-muted">
                {formatCount(slice.value)}
                {unit} · {total === 0 ? "0%" : formatPercent(slice.value / total)}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
};

export default function CompositionCard({ insights }: { insights: ApiVisitorInsights }) {
  const deviceSlices = (["mobile", "desktop", "tablet"] as const).map((device) => ({
    label: DEVICE_LABEL[device],
    value: insights.devices.find((row) => row.device === device)?.sessions ?? 0,
    color: DEVICE_COLOR[device],
  }));
  const sessions = insights.audience.member + insights.audience.external;

  return (
    <ChartCard
      testId="stats-composition"
      title="구성 비율"
      description="기기·방문자 구분은 세션, 신규/재방문은 방문자 기준"
      empty={sessions === 0 ? "이 기간·조건에 기록된 세션이 없습니다." : null}
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <RingBlock title="기기" unit="회" slices={deviceSlices} />
        <RingBlock
          title="방문자 구분"
          unit="회"
          slices={[
            { label: "외부 방문자", value: insights.audience.external, color: "var(--chart-1)" },
            { label: "회원", value: insights.audience.member, color: "var(--chart-2)" },
          ]}
        />
        <RingBlock
          title="신규/재방문"
          unit="명"
          slices={[
            { label: "신규", value: insights.summary.newVisitors, color: "var(--chart-1)" },
            { label: "재방문", value: insights.summary.returningVisitors, color: "var(--chart-3)" },
          ]}
        />
      </div>
    </ChartCard>
  );
}
```

범례 목록이 숫자와 비율을 모두 담으므로 이 카드는 별도 "표로 보기"를 두지 않는다. `RingChart`의 `data` 항목 필드(`label`, `value`, `maxValue`, `color`)와 `Ring`의 `color` prop을 Task 11 Step 1처럼 실제 소스로 확인한다.

- [ ] **Step 3: 흐름 Sankey 2개**

`flow-cards.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { SankeyChart, SankeyLink, SankeyNode, SankeyTooltip } from "@/components/charts";
import { toPathSankey, toReferrerSankey, type SankeyData } from "@/features/dashboard/stats/insights-chart-data";
import {
  formatCount,
  NEUTRAL_COLOR,
  PAGE_TYPE_COLOR,
  PAGE_TYPE_LABEL,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const LABEL_TO_COLOR = new Map<string, string>(
  (Object.keys(PAGE_TYPE_LABEL) as Array<keyof typeof PAGE_TYPE_LABEL>).map((type) => [
    PAGE_TYPE_LABEL[type],
    PAGE_TYPE_COLOR[type],
  ]),
);

// 노드 이름 끝의 페이지 종류로 색을 고른다. 유입 경로·이탈은 중립색이다.
const nodeColor = (name: string) => LABEL_TO_COLOR.get(name.split(": ").pop() ?? name) ?? NEUTRAL_COLOR;

const Flow = ({ data }: { data: SankeyData }) => (
  <SankeyChart data={data} aspectRatio="16 / 10" nodePadding={16}>
    <SankeyLink getNodeColor={(node) => nodeColor(String(node.name))} />
    <SankeyNode getNodeColor={(node) => nodeColor(String(node.name))} />
    <SankeyTooltip formatValue={(value) => `${formatCount(value)}세션`} />
  </SankeyChart>
);

export function ReferrerFlowCard({ insights }: { insights: ApiVisitorInsights }) {
  return (
    <ChartCard
      testId="stats-referrer-flow"
      title="유입 경로 → 진입 페이지"
      description="세션 기준, 상위 6개 밖은 기타"
      empty={insights.referrerFlow.length === 0 ? "이 기간·조건에 기록된 세션이 없습니다." : null}
      table={{
        columns: ["유입 경로", "진입 페이지", "세션"],
        rows: insights.referrerFlow.map((row) => [
          referrerLabel(row.referrer),
          PAGE_TYPE_LABEL[row.landing],
          formatCount(row.sessions),
        ]),
      }}
    >
      <Flow data={toReferrerSankey(insights.referrerFlow)} />
    </ChartCard>
  );
}

export function PathFlowCard({ insights }: { insights: ApiVisitorInsights }) {
  const pageLabel = (page: keyof typeof PAGE_TYPE_LABEL | "exit") =>
    page === "exit" ? "이탈" : PAGE_TYPE_LABEL[page];
  return (
    <ChartCard
      testId="stats-path-flow"
      title="세션 이동 경로"
      description="진입 → 2번째 → 3번째 페이지, 각 단계의 이탈 포함"
      empty={insights.pathFlow.length === 0 ? "이 기간·조건에 기록된 세션이 없습니다." : null}
      table={{
        columns: ["단계", "이전 페이지", "다음 페이지", "세션"],
        rows: insights.pathFlow.map((row) => [
          row.step === 1 ? "진입 → 2번째" : "2번째 → 3번째",
          pageLabel(row.from),
          pageLabel(row.to),
          formatCount(row.sessions),
        ]),
      }}
    >
      <Flow data={toPathSankey(insights.pathFlow)} />
    </ChartCard>
  );
}
```

- [ ] **Step 4: 분포 막대 2개**

`distribution-cards.tsx`:

```tsx
"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Bar, BarChart, BarXAxis, ChartTooltip, Grid } from "@/components/charts";
import { formatCount } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const DEPTH_LABEL = { "1": "1페이지", "2": "2페이지", "3": "3페이지", "4": "4페이지", "5+": "5페이지+" } as const;
const DURATION_LABEL = {
  "<10s": "10초 미만",
  "10-30s": "10~30초",
  "30s-1m": "30초~1분",
  "1-3m": "1~3분",
  "3-10m": "3~10분",
  "10m+": "10분 이상",
} as const;

const Distribution = ({ rows }: { rows: Array<{ name: string; sessions: number }> }) => (
  <BarChart data={rows} xDataKey="name" aspectRatio="2 / 1">
    <Grid horizontal />
    <Bar dataKey="sessions" fill="var(--chart-1)" lineCap={4} />
    <BarXAxis showAllLabels />
    <ChartTooltip
      rows={(point) => [{ color: "var(--chart-1)", label: "세션", value: `${formatCount(Number(point.sessions))}회` }]}
    />
  </BarChart>
);

export function DepthCard({ insights }: { insights: ApiVisitorInsights }) {
  const rows = insights.depth.map((row) => ({ name: DEPTH_LABEL[row.bucket], sessions: row.sessions }));
  return (
    <ChartCard
      testId="stats-depth"
      title="세션 깊이"
      description="한 세션에서 본 페이지 수"
      empty={rows.every((row) => row.sessions === 0) ? "이 기간·조건에 기록된 세션이 없습니다." : null}
      table={{ columns: ["페이지 수", "세션"], rows: rows.map((row) => [row.name, formatCount(row.sessions)]) }}
    >
      <Distribution rows={rows} />
    </ChartCard>
  );
}

export function DurationCard({ insights }: { insights: ApiVisitorInsights }) {
  const rows = insights.duration.map((row) => ({ name: DURATION_LABEL[row.bucket], sessions: row.sessions }));
  return (
    <ChartCard
      testId="stats-duration"
      title="체류 시간 분포"
      description={
        insights.summary.unmeasuredSessions > 0
          ? `세션 기준, 측정 안 된 ${formatCount(insights.summary.unmeasuredSessions)}개 제외`
          : "세션 기준"
      }
      empty={rows.every((row) => row.sessions === 0) ? "체류 시간이 측정된 세션이 없습니다." : null}
      table={{ columns: ["체류 시간", "세션"], rows: rows.map((row) => [row.name, formatCount(row.sessions)]) }}
    >
      <Distribution rows={rows} />
    </ChartCard>
  );
}
```

- [ ] **Step 5: 코호트 격자**

bklit 히트맵은 행이 요일 7개로 고정이라 8주 재방문을 담을 수 없다(스펙 7.1의 대체 규칙 적용). 같은 순차 토큰으로 직접 그린다.

`cohort-card.tsx`:

```tsx
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { formatCount, formatPercent } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// 순차 스케일 5단계. 0%와 null(아직 오지 않은 주)은 구분해서 보여 준다.
const levelOf = (rate: number) => Math.min(4, Math.floor(rate * 5));
const LEVEL_BG = [
  "bg-(--chart-scale-01)",
  "bg-(--chart-scale-02)",
  "bg-(--chart-scale-03)",
  "bg-(--chart-scale-04)",
  "bg-(--chart-scale-05)",
] as const;
// 진한 두 단계는 흰 글자로 대비를 맞춘다.
const LEVEL_TEXT = ["text-ink", "text-ink", "text-ink", "text-white", "text-white"] as const;

export default function CohortCard({ insights }: { insights: ApiVisitorInsights }) {
  return (
    <ChartCard
      testId="stats-cohorts"
      title="주별 재방문 코호트"
      description="첫 방문 주(월요일 시작)별로 1~8주 뒤 다시 온 방문자 비율. 빈칸은 아직 오지 않은 주"
      empty={insights.cohorts.length === 0 ? "이 기간에 처음 방문한 방문자가 없습니다." : null}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0.5 text-caption tabular-nums">
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium">첫 방문 주</th>
              <th scope="col" className="px-2 py-1 text-right font-medium">방문자</th>
              {WEEKS.map((week) => (
                <th key={week} scope="col" className="px-2 py-1 text-center font-medium">
                  {week}주 후
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insights.cohorts.map((cohort) => (
              <tr key={cohort.week}>
                <th scope="row" className="px-2 py-1 text-left font-normal text-ink">{cohort.week}</th>
                <td className="px-2 py-1 text-right text-ink">{formatCount(cohort.size)}</td>
                {cohort.retention.map((rate, index) => (
                  <td
                    key={WEEKS[index]}
                    className={
                      rate === null
                        ? "rounded-xs px-2 py-1 text-center text-ink-muted"
                        : `rounded-xs px-2 py-1 text-center ${LEVEL_BG[levelOf(rate)]} ${LEVEL_TEXT[levelOf(rate)]}`
                    }
                  >
                    {rate === null ? "–" : formatPercent(rate)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
```

격자 자체가 숫자를 담은 표이므로 "표로 보기"를 따로 두지 않는다. 다크 모드에서 `--chart-scale-04/05`(밝은 파랑)는 흰 글자 대비가 낮다. Task 14의 `assertReadable`이 실패하면 `.dark`에서 쓸 `LEVEL_TEXT`를 `dark:text-ink`로 바꾼다(예: `"text-white dark:text-canvas"`).

- [ ] **Step 6: 콘텐츠 표**

`content-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import {
  formatCount,
  formatDuration,
  formatPercent,
  PAGE_TYPE_LABEL,
} from "@/features/dashboard/stats/insights-format";

type Row = ApiVisitorInsights["content"][number];
type SortKey = "views" | "visitors" | "avgEngagedMs" | "entries" | "bounceRate";

const COLUMNS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "views", label: "조회수" },
  { key: "visitors", label: "방문자" },
  { key: "avgEngagedMs", label: "평균 체류" },
  { key: "entries", label: "진입" },
  { key: "bounceRate", label: "이탈률" },
];

const HREF_PREFIX = { activity: "/archive/records", exhibition: "/archive/exhibitions" } as const;

const titleOf = (row: Row) => row.title ?? PAGE_TYPE_LABEL[row.pageType];

export default function ContentTable({ insights }: { insights: ApiVisitorInsights }) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  // null(측정 안 됨)은 정렬 방향과 관계없이 맨 아래로 보낸다.
  const rows = [...insights.content].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));

  return (
    <Card data-testid="stats-content">
      <CardHeader title="콘텐츠" description="조회수 상위 50개. 열 이름을 누르면 그 기준으로 정렬" />
      {rows.length === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">이 기간·조건에 조회된 페이지가 없습니다.</p>
      ) : (
        <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-hairline">
          <table className="w-full min-w-[40rem] text-left text-body-sm tabular-nums">
            <thead className="sticky top-0 bg-canvas-soft text-caption text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">페이지</th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortKey === column.key ? "descending" : "none"}
                    className="px-1 py-1 text-right font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => setSortKey(column.key)}
                      className="min-h-11 w-full rounded-xs px-2 text-right hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                    >
                      {column.label}
                      {sortKey === column.key ? " ↓" : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((row) => (
                <tr key={`${row.pageType}:${row.resourceId}`}>
                  <td className="px-3 py-2 text-ink">
                    <span className="mr-2 text-caption text-ink-muted">{PAGE_TYPE_LABEL[row.pageType]}</span>
                    {row.pageType === "activity" || row.pageType === "exhibition" ? (
                      <Link
                        href={`${HREF_PREFIX[row.pageType]}/${row.resourceId}`}
                        className="text-primary-text hover:underline"
                      >
                        {titleOf(row)}
                      </Link>
                    ) : (
                      titleOf(row)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">{formatCount(row.views)}</td>
                  <td className="px-3 py-2 text-right text-ink">{formatCount(row.visitors)}</td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.avgEngagedMs === null ? "–" : formatDuration(row.avgEngagedMs)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">{formatCount(row.entries)}</td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.bounceRate === null ? "–" : formatPercent(row.bounceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 7: 검증**

Run: `pnpm --filter @yonyoung/web exec eslint "app/(dashboard)/dashboard/stats/_components"`
Expected: 오류 0. typecheck는 Task 13에서 전체로 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add "apps/web/app/(dashboard)/dashboard/stats/_components"
git commit -m "feat: 시간대 히트맵·흐름·분포·코호트·콘텐츠 표 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 조회 옵션 컨트롤과 화면 조립

**Files:**
- Create: `apps/web/app/(dashboard)/dashboard/stats/_components/stats-filter-controls.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/stats/page.tsx`
- Rewrite: `apps/web/app/(dashboard)/dashboard/stats/stats-view.tsx`
- Delete: `.../_components/bar-list.tsx`, `.../_components/top-content-list.tsx`
- Modify: `apps/web/features/dashboard/services/admin-read-service.ts` (쓰지 않게 된 `getAdminPageViewAnalytics` 정리)

**Interfaces:**
- Consumes: Task 9 `StatsQuery`, `toInsightsApiSearch`, `toStatsSearch`, `activeFilterCount`, `getAdminVisitorInsights`; Task 11–12 컴포넌트
- Produces: `<StatsFilterControls filters referrerOptions onChange />`

- [ ] **Step 1: 필터 컨트롤**

`stats-filter-controls.tsx`:

```tsx
"use client";

import { XIcon } from "lucide-react";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Select } from "@/app/(dashboard)/_components/ui/input";
import {
  AUDIENCE_LABEL,
  DEVICE_LABEL,
  PAGE_TYPE_LABEL,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";
import { DEFAULT_FILTERS, activeFilterCount, type StatsFilters } from "@/features/dashboard/stats/stats-range";

type StatsFilterControlsProps = {
  filters: StatsFilters;
  /** API가 돌려준 상위 유입 경로. 현재 선택값이 목록에 없어도 선택지로 보여 준다. */
  referrerOptions: readonly string[];
  onChange: (next: StatsFilters) => void;
};

const chipLabel = (key: keyof StatsFilters, value: string) => {
  switch (key) {
    case "audience":
      return AUDIENCE_LABEL[value as keyof typeof AUDIENCE_LABEL];
    case "device":
      return DEVICE_LABEL[value as keyof typeof DEVICE_LABEL];
    case "referrer":
      return `유입: ${referrerLabel(value)}`;
    case "landing":
      return `진입: ${PAGE_TYPE_LABEL[value as keyof typeof PAGE_TYPE_LABEL]}`;
  }
};

export default function StatsFilterControls({ filters, referrerOptions, onChange }: StatsFilterControlsProps) {
  const referrers = [...new Set(["direct", ...referrerOptions, ...(filters.referrer === "all" ? [] : [filters.referrer])])];
  const set = <K extends keyof StatsFilters>(key: K, value: StatsFilters[K]) => onChange({ ...filters, [key]: value });
  const active = (Object.keys(filters) as Array<keyof StatsFilters>).filter((key) => filters[key] !== "all");

  return (
    <div className="flex flex-col gap-3" data-testid="stats-filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="방문자 구분">
          {(control) => (
            <Select
              {...control}
              data-testid="select-stats-audience"
              value={filters.audience}
              onChange={(event) => set("audience", event.target.value as StatsFilters["audience"])}
            >
              {(["all", "external", "member"] as const).map((value) => (
                <option key={value} value={value}>{AUDIENCE_LABEL[value]}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="기기">
          {(control) => (
            <Select
              {...control}
              data-testid="select-stats-device"
              value={filters.device}
              onChange={(event) => set("device", event.target.value as StatsFilters["device"])}
            >
              <option value="all">전체</option>
              {(["mobile", "tablet", "desktop"] as const).map((value) => (
                <option key={value} value={value}>{DEVICE_LABEL[value]}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="유입 경로">
          {(control) => (
            <Select
              {...control}
              data-testid="select-stats-referrer"
              value={filters.referrer}
              onChange={(event) => set("referrer", event.target.value)}
            >
              <option value="all">전체</option>
              {referrers.map((host) => (
                <option key={host} value={host}>{referrerLabel(host)}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="진입 페이지">
          {(control) => (
            <Select
              {...control}
              data-testid="select-stats-landing"
              value={filters.landing}
              onChange={(event) => set("landing", event.target.value as StatsFilters["landing"])}
            >
              <option value="all">전체</option>
              {(["home", "activity", "exhibition", "notice"] as const).map((value) => (
                <option key={value} value={value}>{PAGE_TYPE_LABEL[value]}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="켜진 필터">
          {active.map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`chip-stats-${key}`}
              onClick={() => onChange({ ...filters, [key]: "all" })}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-primary-hairline bg-primary-soft px-3 text-caption text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              {chipLabel(key, filters[key])}
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">필터 해제</span>
            </button>
          ))}
          {activeFilterCount(filters) > 1 && (
            <button
              type="button"
              data-testid="btn-stats-clear-filters"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="min-h-11 rounded-xs px-2 text-caption text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              필터 모두 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

`Field`의 실제 props(`label`, render-prop children)는 `field.tsx`에서 확인했다. 필수 prop이 더 있으면 맞춘다.

- [ ] **Step 2: page.tsx**

```tsx
import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { getAdminVisitorInsights } from "@/features/dashboard/services/admin-read-service";
import {
  kstToday,
  parseStatsSearchParams,
  toInsightsApiSearch,
} from "@/features/dashboard/stats/stats-range";
import { readCookieHeader } from "@/shared/http/http";
import StatsView from "./stats-view";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

export const metadata = {
  title: "방문 통계 | 연영회 관리자",
};

type StatsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  await serverAuthGuard.requireSession();
  // 날짜 입력의 max와 실시간 갱신 여부가 서버·클라이언트에서 같도록 오늘 날짜를 서버에서 정해 내려준다.
  const today = kstToday();
  const query = parseStatsSearchParams(await searchParams, today);
  const apiSearch = toInsightsApiSearch(query);
  const cookieHeader = await readCookieHeader();
  const result = await getAdminVisitorInsights(cookieHeader, apiSearch);
  const insights = result.ok ? result.data : null;
  const error = result.ok ? null : result.error.message;

  return (
    <PageContainer>
      {/* 기간·필터가 바뀌면 다시 마운트해 폴링 상태와 직접 지정 입력값을 새 조건으로 초기화한다. 지표는 화면 상태라 키에 넣지 않는다. */}
      <StatsView
        key={`${apiSearch}:${query.preset}`}
        query={query}
        today={today}
        insights={insights}
        error={error}
      />
    </PageContainer>
  );
}
```

- [ ] **Step 3: stats-view.tsx 재작성**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { BarChart3Icon, DownloadIcon } from "lucide-react";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import { insightsCsvFileName, insightsTrendToCsv } from "@/features/dashboard/stats/insights-format";
import {
  toInsightsApiSearch,
  toStatsSearch,
  type StatsMetric,
  type StatsQuery,
} from "@/features/dashboard/stats/stats-range";
import { AdminApiError } from "@/shared/http/http";
import ChartCard from "./_components/chart-card";
import CohortCard from "./_components/cohort-card";
import CompositionCard from "./_components/composition-card";
import ContentTable from "./_components/content-table";
import { DepthCard, DurationCard } from "./_components/distribution-cards";
import { PathFlowCard, ReferrerFlowCard } from "./_components/flow-cards";
import HourlyHeatmapCard from "./_components/hourly-heatmap-card";
import KpiGrid from "./_components/kpi-grid";
import StatsFilterControls from "./_components/stats-filter-controls";
import StatsRangeControls from "./_components/stats-range-controls";
import TrendCard from "./_components/trend-card";

type StatsViewProps = {
  query: StatsQuery;
  today: string;
  insights: ApiVisitorInsights | null;
  error: string | null;
};

const REFRESH_INTERVAL_MS = 10_000;

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const downloadCsv = (insights: ApiVisitorInsights) => {
  const url = URL.createObjectURL(
    new Blob([insightsTrendToCsv(insights)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = insightsCsvFileName(insights);
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function StatsView({
  query,
  today,
  insights: initialInsights,
  error: initialError,
}: StatsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [insights, setInsights] = useState(initialInsights);
  const [error, setError] = useState(initialError);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [metric, setMetric] = useState<StatsMetric>(query.metric);
  // 과거 기간은 숫자가 바뀌지 않으므로 오늘이 포함될 때만 주기적으로 다시 불러온다.
  const isLive = query.to === today;

  useEffect(() => {
    if (!isLive) return;
    let active = true;

    // 갱신 시각은 클라이언트 로컬 시간이라 렌더 중에 계산하면 hydration 이 어긋난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트에서만 알 수 있는 값이다.
    setLastUpdated(formatTime());

    const refresh = async () => {
      try {
        const data = await adminRequest<ApiVisitorInsights>(
          `/admin/page-views/insights?${toInsightsApiSearch(query)}`,
          "GET",
        );
        if (!active) return;
        setInsights(data);
        setError(null);
        setLastUpdated(formatTime());
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof AdminApiError || err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      }
    };

    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isLive, query]);

  const navigate = (next: StatsQuery) => {
    const search = toStatsSearch({ ...next, metric });
    startTransition(() => {
      router.replace(search === "" ? pathname : `${pathname}?${search}`, {
        scroll: false,
      });
    });
  };

  // 지표는 같은 응답을 다르게 그릴 뿐이라 서버에 다시 묻지 않고 주소만 바꾼다.
  const changeMetric = (next: StatsMetric) => {
    setMetric(next);
    const search = toStatsSearch({ ...query, metric: next });
    window.history.replaceState(null, "", search === "" ? pathname : `${pathname}?${search}`);
  };

  const header = (
    <PageHeader
      title="방문 통계"
      description={
        insights !== null
          ? `${insights.range.from} ~ ${insights.range.to} (${insights.range.days}일), 비교 기간 ${insights.previousRange.from} ~ ${insights.previousRange.to}${
              isLive && lastUpdated !== null ? `. ${lastUpdated} 기준, 10초마다 갱신` : ""
            }`
          : "기간과 조건을 골라 방문자 사용 패턴을 확인합니다."
      }
      actions={
        insights !== null ? (
          <Button
            variant="utility"
            leadingIcon={<DownloadIcon className="h-4 w-4" aria-hidden="true" />}
            onClick={() => downloadCsv(insights)}
            data-testid="btn-stats-csv"
          >
            CSV로 내려받기
          </Button>
        ) : undefined
      }
    />
  );

  const controls = (
    <div className="flex flex-col gap-4">
      <StatsRangeControls
        query={query}
        today={today}
        granularity={insights?.range.granularity ?? query.granularity ?? "day"}
        onChange={navigate}
      />
      <StatsFilterControls
        filters={query.filters}
        referrerOptions={insights?.referrerOptions ?? []}
        onChange={(filters) => navigate({ ...query, filters })}
      />
    </div>
  );

  if (insights === null) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {controls}
        <EmptyState
          Icon={BarChart3Icon}
          accent="purple"
          title="통계를 불러올 수 없습니다"
          description={
            error !== null
              ? `원인: ${error}. 기간을 바꾸거나 새로고침해 주세요.`
              : "잠시 후 새로고침해 주세요."
          }
        />
      </div>
    );
  }

  const trackedSince = insights.eventsTrackedSince;
  const collectionNote =
    trackedSince === null
      ? "방문자·세션 지표는 이번 업데이트 배포 후부터 수집됩니다. 지금은 페이지뷰 합계만 볼 수 있습니다."
      : insights.range.from < trackedSince
        ? `방문자·세션 지표는 ${trackedSince}부터 수집됐습니다. 그 전 구간은 0으로 보입니다${
            insights.segmented ? "" : "(필터 없는 페이지뷰는 전체 이력)"
          }.`
        : null;

  return (
    <div
      className="flex flex-col gap-6 transition-opacity duration-150 motion-reduce:transition-none data-[pending=true]:opacity-60"
      data-pending={isPending}
      aria-busy={isPending}
    >
      {header}
      {controls}

      {error !== null && (
        <p role="status" className="text-caption text-danger-text">
          최신 값으로 갱신하지 못했습니다({error}). 아래는 마지막으로 불러온 값입니다.
        </p>
      )}
      {collectionNote !== null && (
        <p role="note" data-testid="stats-collection-note" className="text-caption text-ink-muted">
          {collectionNote}
        </p>
      )}

      <KpiGrid insights={insights} />
      <TrendCard insights={insights} metric={metric} onMetricChange={changeMetric} />

      <div className="grid gap-4 lg:grid-cols-2">
        <HourlyHeatmapCard insights={insights} />
        <CompositionCard insights={insights} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferrerFlowCard insights={insights} />
        <PathFlowCard insights={insights} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DepthCard insights={insights} />
        <DurationCard insights={insights} />
      </div>
      <CohortCard insights={insights} />
      <ContentTable insights={insights} />
    </div>
  );
}
```

`ChartCard` import가 쓰이지 않으면 지운다(위 코드에서는 직접 쓰지 않는다 — 지울 것).

- [ ] **Step 4: 쓰지 않게 된 파일 정리**

```bash
git rm "apps/web/app/(dashboard)/dashboard/stats/_components/bar-list.tsx" "apps/web/app/(dashboard)/dashboard/stats/_components/top-content-list.tsx"
grep -rn "getAdminPageViewAnalytics\|apiPageViewAnalyticsSchema\|bar-list\|top-content-list" apps/web --include=*.ts --include=*.tsx | grep -v node_modules
```

`getAdminPageViewAnalytics`를 쓰는 곳이 없으면 `admin-read-service.ts`에서 함수와 그것만 쓰던 import(`ApiPageViewAnalytics`, `apiPageViewAnalyticsSchema`)를 지운다. 단위 테스트(`admin-read-service.test.ts`)가 이 함수를 검사하면 같은 테스트를 `getAdminVisitorInsights`로 바꾼다.

- [ ] **Step 5: 전체 검증**

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint && pnpm --filter @yonyoung/web test:unit`
Expected: 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add -A "apps/web/app/(dashboard)/dashboard/stats" apps/web/features/dashboard apps/web/tests/unit
git commit -m "feat: 방문 통계 화면을 방문자 분석 대시보드로 교체

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: e2e, 렌더 확인, 마무리

**Files:**
- Modify: `apps/web/tests/e2e/mock-api/server.ts`
- Modify: `apps/web/tests/e2e/page-view-stats.spec.ts`

**Interfaces:**
- Consumes: Task 13 화면의 testid: `btn-stats-csv`, `select-stats-audience|device|referrer|landing`, `chip-stats-<key>`, `btn-stats-clear-filters`, `btn-stats-metric-<metric>`, `stats-collection-note`, `stats-trend`, `stats-hourly`, `stats-content`

- [ ] **Step 1: 목업 API 응답 추가**

`tests/e2e/mock-api/server.ts`의 `/api/admin/page-views/analytics` 분기 다음에:

```ts
    // 요청한 기간·필터를 그대로 돌려줘 화면 URL → API 쿼리 연결을 검증할 수 있게 한다.
    if (pathname === "/api/admin/page-views/insights" && method === "GET") {
      const from = requestUrl.searchParams.get("from") ?? "2026-05-01";
      const to = requestUrl.searchParams.get("to") ?? "2026-05-03";
      const granularity = requestUrl.searchParams.get("granularity") ?? "day";
      const segmented = ["audience", "device", "referrer", "landing"].some((key) =>
        requestUrl.searchParams.has(key),
      );
      const core = { views: 360, visitors: 120, sessions: 150, pagesPerSession: 2.4, avgSessionMs: 95_000, bounceRate: 0.42 };
      sendData(response, {
        range: { from, to, days: 3, granularity },
        previousRange: { from: "2026-04-28", to: "2026-04-30" },
        eventsTrackedSince: "2026-05-02",
        segmented,
        summary: {
          ...core,
          unmeasuredSessions: 12,
          newVisitors: 80,
          returningVisitors: 40,
          prev: { ...core, views: 300, visitors: 100, sessions: 130, bounceRate: 0.5 },
        },
        trend: [
          { bucket: from, views: 110, visitors: 0, sessions: 0, avgSessionMs: 0, newVisitors: 0, returningVisitors: 0, prevViews: 90, prevVisitors: 0, prevSessions: 0, prevAvgSessionMs: 0, collected: false },
          { bucket: "mock-mid", views: 120, visitors: 60, sessions: 75, avgSessionMs: 90_000, newVisitors: 40, returningVisitors: 20, prevViews: 100, prevVisitors: 50, prevSessions: 65, prevAvgSessionMs: 80_000, collected: true },
          { bucket: to, views: 130, visitors: 60, sessions: 75, avgSessionMs: 100_000, newVisitors: 40, returningVisitors: 20, prevViews: 110, prevVisitors: 50, prevSessions: 65, prevAvgSessionMs: 85_000, collected: true },
        ],
        hourly: Array.from({ length: 168 }, (_, index) => ({
          weekday: Math.floor(index / 24),
          hour: index % 24,
          views: index % 24 >= 9 && index % 24 <= 22 ? (index % 7) + 1 : 0,
        })),
        referrerFlow: [
          { referrer: "direct", landing: "home", sessions: 70 },
          { referrer: "google.com", landing: "activity", sessions: 50 },
          { referrer: "instagram.com", landing: "exhibition", sessions: 30 },
        ],
        pathFlow: [
          { step: 1, from: "home", to: "activity", sessions: 40 },
          { step: 1, from: "home", to: "exit", sessions: 30 },
          { step: 1, from: "activity", to: "exit", sessions: 50 },
          { step: 2, from: "activity", to: "exhibition", sessions: 15 },
          { step: 2, from: "activity", to: "exit", sessions: 25 },
        ],
        content: [
          { pageType: "activity", resourceId: "act-1", title: "목 활동", views: 160, visitors: 70, avgEngagedMs: 120_000, entries: 50, bounceRate: 0.4 },
          { pageType: "home", resourceId: "home", title: null, views: 200, visitors: 100, avgEngagedMs: 30_000, entries: 70, bounceRate: 0.43 },
        ],
        devices: [
          { device: "mobile", sessions: 100 },
          { device: "desktop", sessions: 45 },
          { device: "tablet", sessions: 5 },
        ],
        audience: { member: 20, external: 130 },
        depth: [
          { bucket: "1", sessions: 63 }, { bucket: "2", sessions: 40 }, { bucket: "3", sessions: 25 },
          { bucket: "4", sessions: 12 }, { bucket: "5+", sessions: 10 },
        ],
        duration: [
          { bucket: "<10s", sessions: 30 }, { bucket: "10-30s", sessions: 25 }, { bucket: "30s-1m", sessions: 30 },
          { bucket: "1-3m", sessions: 35 }, { bucket: "3-10m", sessions: 15 }, { bucket: "10m+", sessions: 3 },
        ],
        cohorts: [
          { week: "2026-04-27", size: 50, retention: [0.3, 0.2, null, null, null, null, null, null] },
        ],
        referrerOptions: ["direct", "google.com", "instagram.com"],
      });
      return;
    }
```

- [ ] **Step 2: e2e 갱신**

`tests/e2e/page-view-stats.spec.ts` 변경:

1. 첫 테스트의 `await expect(page.getByText("이전 기간 대비").first()).toBeVisible();`는 유지한다(KPI의 Delta). `월 단위, 빈 날은 0으로 표시` 문구도 TrendCard가 같은 문장을 쓰므로 유지.
2. CSV 테스트 기대값을 바꾼다:

```ts
    expect(download.suggestedFilename()).toBe("visitor-insights_2026-05-01_2026-05-03_day.csv");
    const content = await readFile((await download.path())!, "utf8");
    expect(content).toContain("2026-05-03,130,60,75,100,40,20,110,50,65,85,수집");
```

3. 테마 테스트의 `getByRole("heading", { name: "유입 경로" })`를 `getByRole("heading", { name: "유입 경로 → 진입 페이지" })`로 바꾼다.
4. 추가:

```ts
  test("필터를 고르면 URL·API 요청에 반영되고 칩으로 해제한다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });

    const insightsRequest = page.waitForRequest((request) =>
      request.url().includes("/api/admin/page-views/insights") && request.url().includes("audience=external"),
    );
    await page.getByTestId("select-stats-audience").selectOption("external");
    await expect(page).toHaveURL(/audience=external/);
    await insightsRequest.catch(() => undefined);

    await page.getByTestId("select-stats-landing").selectOption("activity");
    await expect(page).toHaveURL(/audience=external&landing=activity/);
    await expect(page.getByTestId("chip-stats-audience")).toContainText("외부 방문자");

    await page.getByTestId("chip-stats-audience").click();
    await expect(page).not.toHaveURL(/audience=/);
    await expect(page).toHaveURL(/landing=activity/);

    await page.getByTestId("select-stats-device").selectOption("mobile");
    await page.getByTestId("btn-stats-clear-filters").click();
    await expect(page).not.toHaveURL(/device=|landing=/);
  });

  test("추이 지표를 바꾸면 다시 불러오지 않고 URL만 바뀐다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("stats-trend")).toBeVisible();

    let refetched = false;
    page.on("request", (request) => {
      if (request.url().includes("/dashboard/stats") && request.headers()["rsc"] === "1") refetched = true;
    });
    await page.getByTestId("btn-stats-metric-visitors").click();
    await expect(page).toHaveURL(/metric=visitors/);
    await expect(page.getByTestId("stats-trend").getByText("재방문")).toBeVisible();
    expect(refetched).toBe(false);
  });

  test("수집 시작 전 구간이 있으면 안내한다", async ({ page }) => {
    await page.goto("/dashboard/stats?from=2026-05-01&to=2026-05-03", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("stats-collection-note")).toContainText("2026-05-02부터 수집");
  });

  test("차트마다 표로 보기를 열 수 있다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
    const hourly = page.getByTestId("stats-hourly");
    await hourly.getByText("표로 보기").click();
    await expect(hourly.getByRole("columnheader", { name: "월" })).toBeVisible();
  });

  test("콘텐츠 표는 열 이름으로 정렬한다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
    const table = page.getByTestId("stats-content");
    await expect(table.locator("tbody tr").first()).toContainText("홈");
    await table.getByRole("button", { name: "평균 체류" }).click();
    await expect(table.locator("tbody tr").first()).toContainText("목 활동");
  });
```

모바일 터치 영역 테스트의 testId 목록에 `"select-stats-audience"`를 더한다(셀렉트도 44px 이상이어야 한다). 실패하면 `Select`에 `min-h-11`을 준다.

- [ ] **Step 3: e2e 실행**

Run: `pnpm --filter @yonyoung/web test:e2e:full -- tests/e2e/page-view-stats.spec.ts tests/e2e/page-views.spec.ts`
Expected: PASS(데스크톱·모바일 프로젝트 모두). 실패 시 superpowers:systematic-debugging으로 원인을 찾는다. 테스트 기대값을 화면에 맞춰 바꾸지 말고, 화면이 스펙과 어긋난 쪽을 고친다.

- [ ] **Step 4: 렌더 확인**

`agent-browser` 스킬로 목업 서버 기준 `/dashboard/stats`를 데스크톱(1280px)·모바일(390px), 라이트·다크 4가지로 스크린샷을 찍어 본다. 확인할 것: 라벨 겹침, 차트 넘침, 히트맵 축 라벨(월~일, 0·3·6…시), Sankey 노드 라벨 잘림, 다크에서 코호트 칸 글자 대비. 문제가 있으면 고치고 Step 3을 다시 돌린다.

- [ ] **Step 5: 전체 품질 검사**

Run: `pnpm quality`
Expected: format·lint·typecheck·unit·workers·coverage·build 전부 PASS. 포맷 차이는 `pnpm format`으로 고친 뒤 다시 실행한다.

- [ ] **Step 6: 커밋과 푸시**

```bash
git add apps/web/tests/e2e
git commit -m "test: 방문자 분석 화면 e2e 추가

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin dev
```

- [ ] **Step 7: PR**

CLAUDE.md 규칙대로 `dev` → `main` PR을 만든다. 본문: 요약(수집·집계·화면), 마이그레이션 0015 원격 적용 필요, 배포 순서(API 먼저 → 웹), 스펙·계획 링크, 테스트 결과. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. merge와 원격 마이그레이션은 사용자 확인 후 진행한다.
