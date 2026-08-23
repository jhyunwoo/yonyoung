# 성능 아키텍처 (apps/web)

Next.js 16.3 / React 19.2 기준. 이 문서는 "무엇이 왜 그렇게 되어 있는가"를 적는다.
측정 결과(before/after)는 [`performance-baseline.md`](performance-baseline.md) 에 따로 둔다.

## 1. 렌더링 모델

| 구간                                                 | 모드                               | 근거                                                                                                     |
| ---------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 공개 라우트 전부                                     | `○` 정적 프리렌더                  | 데이터가 전부 `"use cache"` 공개 읽기라 요청마다 달라질 것이 없다                                        |
| `/archive/records/[id]`, `/archive/exhibitions/[id]` | `○` (사전 렌더된 id) + `◐` (그 외) | `generateStaticParams` 로 공개 게시물 전부를 굽고, 목록에 없는 id 는 App Shell 을 먼저 주고 스트리밍한다 |
| `/about/recruiting`                                  | `◐`                                | 리크루팅 안내는 설정성 데이터라 셸 밖으로 스트리밍한다                                                   |
| `/dashboard/**`                                      | `◐`                                | 세션·권한·요청 헤더에 의존한다. 이 구간이 동적인 것은 의도다                                             |

`cacheComponents: true` 와 `partialPrefetching: true` 는 이 모델의 전제다. 끄면
공개 라우트가 전부 요청 시 렌더로 떨어진다.

## 2. Instant Navigation

공개 라우트 10개가 `export const instant = true` 를 선언한다.

```
/  /about  /about/photographers  /about/recruiting
/archive/records  /archive/records/[id]
/archive/exhibitions  /archive/exhibitions/[id]
/linktree  /donate
```

이 선언은 **성능 예산을 빌드가 강제하게 만드는 장치**다. 누군가 이 트리 위쪽에서
`cookies()` · `headers()` · `await params` · 캐시되지 않은 `fetch()` 를 하면 빌드가
깨진다. 리뷰어의 기억이 아니라 CI 가 회귀를 잡는다.

의도적으로 `instant` 를 선언하지 않는 곳:

- **`/dashboard/**`** — 세션 확인 없이 의미 있는 화면을 만들 수 없다. 대시보드
  셸(사이드바 골격·페이지 프레임)은 이미 Suspense 밖에 있어 즉시 그려지고, 사용자별
  데이터만 경계 안에서 스트리밍된다.
- **`/auth/**`** — 로그인 상태에 따라 목적지가 갈리는 라우트다.

### `usePathname()` 은 반드시 Suspense 안에 있어야 한다

cacheComponents 에서 `usePathname()` 은 URL 데이터 접근으로 취급된다. 경계 없이
쓰면 **빌드는 통과하지만**, 프리렌더된 엔트리가 무효화된 뒤의 런타임 렌더가 통째로
500 으로 떨어진다(`Next.js encountered URL data \`usePathname()\` in a Client
Component outside of \`<Suspense>\``). 작업 중 실제로 한 번 이렇게 깨졌고, 전체 e2e
를 돌리기 전까지 드러나지 않았다.

그래서 헤더는 프레임·로고를 셸에 남기고 경로에 의존하는 내비만
`<Suspense fallback={null}>` 안에 둔다. 경계를 헤더 전체로 넓히면 예전처럼 셸에서
헤더가 통째로 사라진다.

### 라우트 그룹 `loading.tsx` 를 두지 않는 이유

`app/(home)/loading.tsx` 는 삭제했다. 라우트 그룹의 `loading.tsx` 는 그룹 안 **모든**
라우트의 셸 폴백이 되는데, 그 파일이 담고 있던 것은 홈 모양 스켈레톤(히어로 + 활동
그리드 + 링크 카드)이었다. 즉 `/linktree` 나 `/about/recruiting` 으로 이동해도 홈
스켈레톤이 보였다.

지금은 라우트마다 자기 셸을 갖는다 — 대부분은 완전히 정적이고, 상세 라우트는
`ArchiveDetailSkeleton` 을, 리크루팅은 배지 자리표시자를 자기 자리에 갖는다.
그룹 폴백이 없으므로 라우트 위쪽에 요청 시점 작업이 들어오면 `instant` 검증이
빌드를 깨뜨린다 — 예전에는 그 상황이 조용히 "홈 스켈레톤"으로 덮였다.

### App Shell 에 실제로 무엇이 들어 있는지

"즉시 이동했지만 화면이 비어 있다"를 막기 위해 `tests/e2e/instant-navigation.spec.ts`
가 `@next/playwright` 의 `instant()` 락 안에서 **보이는 내용**을 확인한다. 헤더·로고·
페이지 제목·돌아가기 링크는 모든 케이스에서 셸에 들어 있어야 한다.

상세 라우트에서 `await params` 를 페이지 최상단이 아니라 Suspense 안쪽
컴포넌트(`RecordDetailContent` / `ExhibitionDetailContent`)에서 하는 이유가 이것이다.
최상단에서 await 하면 셸이 특정 URL 에 묶여 라우트 공용 셸이 성립하지 않는다.
**되돌리지 말 것.**

## 3. Partial Prefetching

`<Link>` 는 전부 기본 프리페치를 쓴다. `prefetch={true}` 를 붙인 곳은 없다.

아카이브 목록은 카드 수십 장이 전부 같은 `/archive/records/[id]` 라우트를 가리킨다.
Partial Prefetching 이 켜져 있으면 이 카드들은 **라우트당 App Shell 하나**를 공유하므로
프리페치 요청이 카드 수가 아니라 1회로 수렴한다. 여기에 `prefetch={true}` 를 붙이면
URL 별 런타임 프리페치가 카드 수만큼 살아나 서버 호출·RSC 트래픽·모바일 데이터가
그만큼 늘어난다. **붙이지 말 것.**

## 4. 캐시 구조

### 프로파일

| 데이터                                          | `cacheLife`             | 이유                                                             |
| ----------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 아카이브(활동·전시·기수·사진가·첨부)            | `days`                  | 쓰기 시 `updateTag` 로 즉시 무효화하므로 만료에 기댈 필요가 없다 |
| 설정성(사이트 설정·링크트리·리크루팅·노출 전시) | `hours`                 | 운영 중 손으로 자주 바꾼다                                       |
| 관리자 읽기 전부                                | 캐시 안 함 (`no-store`) | 권한별로 갈리는 데이터다                                         |

모든 `"use cache"` 스코프는 `cacheLife` 를 **명시**한다. 생략하면 `default`(15분)가
붙고, `stale` 이 짧으면 그 결과가 라우트 App Shell 에 들어가지 못한다.

### 태그 계층

```
public:activities              목록
public:activity:<id>           상세 하나
public:exhibitions             목록 (+ 홈 히어로의 노출 전시 선택)
public:exhibition:<id>         상세 하나
public:linktree / :site-settings / :recruiting-plan / :generations / :photographers / :attachments
admin:*                        관리자 읽기 계층
```

상세 읽기는 **컬렉션 태그를 붙이지 않는다**. 붙이면 나누는 의미가 없다. 대신 상세를
바꾸는 모든 쓰기가 엔티티 태그를 함께 무효화해야 하며, 이를
`tests/unit/server/cache/tags.test.ts` 가 액션 단위로 고정한다.

무효화 규칙:

| 쓰기                       | 무효화                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| 활동 생성                  | `admin:activities`, `public:activities`                             |
| 활동 수정/삭제/이미지 변경 | 위 + `public:activity:<id>`                                         |
| 전시 생성                  | `admin:exhibitions`, `public:exhibitions`                           |
| 전시 수정/삭제/이미지 변경 | 위 + `public:exhibition:<id>`                                       |
| 첨부                       | `admin:attachments`, `public:attachments` (컬렉션 단위 — 아래 참고) |

첨부만 컬렉션 단위인 이유: 공개 읽기는 `(scope, resourceId)` 로 나뉘지만 쓰기 액션의
시그니처에는 `resourceId` 가 없다. 엔티티 태그를 붙이려면 호출부 전부의 시그니처를
바꿔야 하는데, 첨부는 페이지당 한 번 읽는 소량 데이터라 이득이 비용을 넘지 않는다.

### 절대 하지 않는 것

- 인증된 대시보드 데이터를 공용 캐시에 넣지 않는다.
- 세션 응답을 캐시하지 않는다.
- 사용자별 RSC 페이로드를 공개 캐시에 넣지 않는다.
- `"use cache: private"` 는 쓰지 않는다. 반복 네비게이션 이득이 측정되지 않았고,
  이 구조에서는 보안 검토 비용이 이득보다 크다. 관리자 데이터는 `no-store` 를 유지한다.

## 5. 인증 임계 경로

```
요청 → proxy(세션 쿠키 유무만, 네트워크 0회)
     │   없음 → 302 /auth/sign-in            (여기서 끝. 렌더까지 가지 않는다)
     └── 있음 ↓
     → (dashboard) 레이아웃  ┐ getSession()        ┐ Promise 두 개를 겹쳐 시작
                            └ getCurrentUserMe()  ┘ (React cache() 로 요청당 1회)
     → 페이지별 serverAuthGuard.* → 서버 액션 requireAdminAccess → API RBAC
```

예전에는 `proxy.ts` 가 `GET /api/auth/get-session` 을 직접 호출했다. `apps/api` 는
별도 오리진(Cloudflare Worker)이고 렌더가 시작되면 레이아웃이 같은 엔드포인트를 다시
부르므로, 대시보드 진입마다 **직렬로 두 번**의 왕복이 있었다. React `cache()` 는 렌더
안에서만 dedupe 하므로 프록시에서 나간 요청은 없애지 못한다.

그렇다고 프록시 검사를 통째로 없애면 안 된다. PPR 에서는 대시보드 셸(200)이 먼저
흘러나간 뒤에야 레이아웃의 `redirect()` 가 돌기 때문에, 로그인하지 않은 방문자가
HTTP 리다이렉트 대신 **200 + 스켈레톤 깜빡임**을 보고 클라이언트에서 이동하게 된다.
옛 검사는 중복이기만 한 게 아니라 이 HTTP 시맨틱을 제공하고 있었다.

그래서 **왕복만 없애고 게이트는 남겼다.** 세션 쿠키가 아예 없으면 인증된 요청일 수
없으므로 그 자리에서 sign-in 으로 보낸다(네트워크 0회). 쿠키가 있으면 통과시키고
유효성은 아래 경계들이 판정한다.

프록시는 **인가 경계가 아니다.** 쿠키 값을 검사하지 않으므로 아무 문자열이나 넣으면
게이트를 통과한다 — 통과 뒤의 판정이 실제 판정이다. 권한 판정은 레이아웃 · 페이지
가드 · 서버 액션 · API RBAC 이 하며, 이 네 곳은 예전에도 프록시에 의존하지 않았다.
게이트를 통과했다는 사실을 헤더로 렌더 쪽에 넘기지도 않는다(위조 표면을 만들지 않기 위해).

### 의도한 동작 변화

로그인은 했지만 승인 대기(`unverified`)인 사용자가 `/dashboard` 로 오면, 예전에는
프록시가 HTTP 403 을 돌려줬다. 역할은 네트워크 없이 알 수 없으므로 이제는 통과시킨 뒤
대시보드 레이아웃이 `/auth/pending-approval` 로 보낸다 — `resolvePostSignInPath` 가
원래 의도하던 목적지다. 진짜 권한 부족(예: manager 가 회장 전용 설정에 접근)에 대한
403 은 `requireAdminPageAccess()` / `requireGlobalUserManagementAccess()` 가 그대로 낸다.

## 6. 클라이언트 컴포넌트 정책

공개 라우트의 기본값은 **서버 컴포넌트**다. 클라이언트로 내려가는 것은 실제 상호작용이
필요한 아일랜드뿐이며, 목록/타일처럼 개수가 늘어나는 것은 아일랜드로 만들지 않는다.

| 아일랜드                  | 하는 일                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `RevealObserver`          | 페이지 전체의 등장 애니메이션 트리거 (IntersectionObserver 1개) |
| `HeroParallax`            | 스크롤 진행도를 CSS 변수 하나에 쓴다                            |
| `SiteHeaderScrollState`   | 스크롤 여부를 `<html data-public-scrolled>` 로 알린다           |
| `SiteHeaderNav`           | 활성 경로 표시 · 드롭다운 · 모바일 메뉴                         |
| `SiteHeaderThemeSwitcher` | 테마 상태를 직접 소유한다                                       |
| `PhotoGalleryController`  | 갤러리 전체의 클릭/hover/포커스를 이벤트 위임으로 받는다        |

**공개 라우트에서 framer-motion 을 쓰지 않는다.** 헤더가 모든 공개 페이지에 있어서
`AnimatePresence` import 하나가 공개 번들 전체에 gzip 약 43KB 를 얹었다. 등장·패럴랙스·
호버·오버레이 전환은 전부 `app/(home)/globals.css` 의 CSS 전환과 위 아일랜드로 구현돼
있고, 값(지속시간·이징·오프셋)은 framer 시절과 같다. 대시보드는 계속 써도 된다 —
공개 번들과 청크가 분리돼 있다.

`AnimatePresence` 대체는 `shared/react/use-mount-transition.ts` 하나다. 열림 상태를
`entering → open → closing` 으로 옮기고 퇴장 시간이 지난 뒤 언마운트한다.

## 7. 이미지

- 전역 커스텀 로더가 R2 미디어를 Cloudflare Image Transformations 로 보낸다.
  오리진 CPU 를 쓰지 않는다.
- `deviceSizes`/`imageSizes` 는 Cloudflare unique transformation 사용량을 억제하려고
  좁혀 둔 값이다. 늘리면 이미지 1장당 변환 건수가 그만큼 늘어난다.
- `priority` 는 홈 히어로의 노출 전시 커버 **한 장에만** 붙는다. 그 장이 실제 LCP 요소다.
- 히어로 전시 선택은 서버 캐시 안에서 끝난다(`getFeaturedPublicExhibition`).
  하이드레이션 후 다시 고르면 LCP 이미지를 두 번 받는다. **되돌리지 말 것.**
- 헤더 로고는 CSS 배경으로 그린다. `<img>` 두 장을 두면 테마상 감춰진 쪽까지
  브라우저가 받아 간다.
- 라이트박스 프리로드 반경은 1이다(앞뒤 각 1장). 늘리면 끝내 안 볼 사진까지 받고
  변환 건수도 늘어난다.

## 8. 폰트

공개 라우트는 폰트 요청이 **0건**이다. `@font-face` 선언은 `(dashboard)` 그룹에만
있고, 공개 그룹은 시스템 폰트 스택으로 렌더된다. 렌더 블로킹 폰트 CSS 도, 폰트
다운로드도 없으므로 LCP 관점에서는 이미 최선이다.

`(home)/layout.tsx` 의 `font-family` 는 `"Pretendard Variable"` 을 첫 후보로 적고 있어
의도가 모호하다. 공개 사이트에 Pretendard 를 실제로 싣는 것은 **타이포그래피 변경**이지
성능 개선이 아니므로 이번 작업 범위에서 제외했다. 판단이 필요한 항목이다.

대시보드는 92개 동적 서브셋 + `unicode-range` 라 실제 쓰이는 범위만 받는다. 이미 최적이다.

## 9. 분석(Analytics)

`PageViewTracker` 는 `useEffect` 에서만 POST 한다. 프리페치나 App Shell 생성 시점에
집계되면 안 되기 때문이다. **렌더 중이나 서버에서 호출하는 형태로 바꾸지 말 것.**

`WebVitalsReporter` 는 `navigator.sendBeacon` 으로 보내고 10% 샘플링한다.

## 10. 성능 예산

| 항목                               | 목표                                   |
| ---------------------------------- | -------------------------------------- |
| 공개 라우트 초기 JS (modern, gzip) | 165KB 이하                             |
| 공개 모바일 LCP (p75)              | 1.8s 이하 (인프라가 허용하는 범위에서) |
| INP                                | 150ms 이하                             |
| CLS                                | 0.05 이하                              |
| 아카이브 목록 프리페치             | 카드 수와 무관하게 라우트 셸 1회       |
| 대시보드 세션 API 왕복             | 네비게이션 1회당 1회                   |

초기 JS 예산은 `tests/e2e/performance-budget.spec.ts` 가 강제한다.

## 10-A. 빌드 도구

**Turbopack 영속 파일시스템 캐시는 16.3 기본값이다** (`turbopackFileSystemCacheForDev`,
`turbopackFileSystemCacheForBuild` 모두 기본 `true`). 설정을 추가하지 않았다 —
이미 켜져 있는 것을 다시 쓰면 나중에 기본값이 바뀔 때 오히려 발목을 잡는다.

효과는 실측했다: 콜드 87.8s → 웜 33.4s (컴파일 44s → 10.7s). 배포 환경에서
`.next/cache` 를 보존하면 그대로 얻는 이득이다(`docs/deployment-and-cutover.md` 의
Dokploy 체크리스트에 `.next/cache` 항목이 있다).

**React Compiler 는 켜지 않는다.** 근거와 실측치는 `next.config.ts` 주석에 있다.
요약하면 Babel 포트 +63% / Rust 포트 +29% 빌드 시간에 번들은 늘고, 공개 라우트에는
자동 메모이제이션이 줄일 리렌더가 남아 있지 않다.

## 10-B. React 19.2 신규 API

View Transitions · `Activity` · `useEffectEvent` 는 도입하지 않았다. 셋 다 지금
측정된 문제를 풀지 않는다. 특히 View Transitions 는 현재의 모션 언어(등장 페이드 +
패럴랙스)를 바꾸므로, 도입한다면 성능 작업이 아니라 디자인 결정으로 다뤄야 한다.

## 10-C. 웹 → API 네트워크 경계

`apps/web`(Dokploy/Node)과 `apps/api`(Cloudflare Worker)는 실제로 다른 오리진이고,
이 경계는 의도된 것이라 유지한다(`docs/monorepo-architecture.md`).

서버 측 `fetch` 는 Node 전역 undici 디스패처를 쓰므로 커넥션 풀링·keep-alive 가
기본으로 켜져 있다. 요청마다 새 에이전트를 만드는 코드는 없다(`server/http/*`).
그래서 이 경계에서 줄일 수 있는 것은 **왕복 횟수**뿐이고, 그것을 줄이는 방법이
공개 데이터의 `"use cache"` 와 대시보드의 `cache()` + 병렬화다.

읽기 경로를 HTTP 없이 직접 호출하도록 바꾸는 것은 검토하지 않았다 — 두 앱의 배포
독립성과 소유권 경계를 깨뜨리는 대가가 왕복 몇 ms 보다 크다.

## 10-D. CDN / 리버스 프록시

이 저장소에서 확인할 수 없는 영역이다. 웹은 Dokploy/Nixpacks 로, API 는 Cloudflare
Worker 로 배포되며 웹 앞단 구성은 외부 대시보드에 있다. 배포 시 확인할 것:

- `/_next/static/*` 는 immutable 로 오래 캐시되어야 한다(파일명에 해시가 있다).
- **인증된 대시보드 응답 · 세션 응답 · 사용자별 RSC 페이로드는 절대 공용 캐시에
  넣지 않는다.** `/dashboard/*` 는 캐시 대상에서 제외한다.
- RSC/프리페치 응답을 캐시한다면 캐시 키가 `RSC` · `Next-Router-Prefetch` ·
  `Next-Router-State-Tree` 헤더를 반드시 구분해야 한다. 구분하지 못하면 HTML 자리에
  RSC 페이로드가 서빙된다.
- 전면 캐시 규칙(cache everything)은 넣지 않는다.

## 11. 측정 방법

프로덕션 빌드로만 판단한다. `next dev` 수치는 쓰지 않는다.

```bash
# 1) 프로덕션 서버 + mock API 기동
pnpm build && pnpm start --hostname 127.0.0.1 --port 3005 &
pnpm tsx tests/e2e/mock-api/server.ts &

# 2) 런타임 측정 (LCP/CLS/INP 재료, 웜 네비게이션, 프리페치 수, 업스트림 API 호출 수)
node scripts/perf/measure.mjs --out perf.json --profile mobile

# 3) 번들 측정 (프리렌더된 HTML 이 실제로 부르는 스크립트 기준)
node scripts/perf/measure-bundles.mjs .next
```

`scripts/perf/measure.mjs` 는 Slow 4G + CPU 4배 스로틀을 기본으로 쓴다. 개발 머신
성능이 아니라 저사양 기기 기준으로 판단하기 위해서다.

웹→API 왕복 수는 브라우저에서 보이지 않으므로 mock API 의 계측
엔드포인트(`/__test/upstream-requests`)에서 읽는다.

## 12. 회귀 방어

| 테스트                                         | 지키는 것                                      |
| ---------------------------------------------- | ---------------------------------------------- |
| `tests/e2e/instant-navigation.spec.ts`         | 즉시 이동 + 셸에 쓸모 있는 UI 가 있음          |
| `tests/e2e/performance-budget.spec.ts`         | 초기 JS 예산, 목록 프리페치 수, 콘솔 에러 없음 |
| `tests/e2e/dashboard-session-requests.spec.ts` | 대시보드 네비게이션당 세션 왕복 1회            |
| `tests/unit/server/cache/tags.test.ts`         | 무효화 최소 집합                               |
| `tests/component/site-header.test.tsx`         | 헤더가 정적 마크업 + 작은 아일랜드 구성 유지   |
| 빌드(`export const instant`)                   | 라우트 위쪽에 요청 시점 작업이 들어오면 실패   |
