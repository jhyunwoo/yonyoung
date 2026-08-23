# 성능 측정 결과 (before / after)

측정 환경: 2 vCPU 리눅스 VM, Node 22.23.2, Next.js 16.3.1 프로덕션 빌드
(`next build` + `next start`), 업스트림은 `tests/e2e/mock-api`.
비교 기준 커밋은 `069c5b7`(before)이고, after 는 같은 머신에서 같은 방식으로 쟀다.

측정 방법과 재현 명령은 [`performance-architecture.md`](performance-architecture.md)
의 "측정 방법" 절에 있다.

> 개발 서버 수치는 쓰지 않았다. 아래 값은 전부 프로덕션 빌드 결과다.

## 1. 라우트별 초기 클라이언트 JS

프리렌더된 HTML 이 실제로 참조하는 스크립트만 더한 값(gzip).
`noModule` 레거시 폴리필 청크(38.6KB)는 모던 브라우저가 받지 않으므로 제외했다 —
포함해서 세면 공개 라우트 수치가 40KB 가까이 부풀려진다.

| 라우트                      |   before |        after |           변화 |
| --------------------------- | -------: | -----------: | -------------: |
| `/`                         | 202.1 KB | **151.8 KB** | −50.3 (−24.9%) |
| `/about`                    | 196.2 KB | **150.9 KB** | −45.3 (−23.1%) |
| `/about/photographers`      | 199.0 KB | **153.9 KB** | −45.1 (−22.7%) |
| `/about/recruiting`         | 196.2 KB | **150.9 KB** | −45.3 (−23.1%) |
| `/archive/records`          | 197.0 KB | **151.7 KB** | −45.3 (−23.0%) |
| `/archive/records/[id]`     | 199.4 KB | **154.4 KB** | −45.0 (−22.6%) |
| `/archive/exhibitions`      | 197.0 KB | **151.7 KB** | −45.3 (−23.0%) |
| `/archive/exhibitions/[id]` | 199.4 KB | **154.4 KB** | −45.0 (−22.6%) |
| `/linktree`                 | 196.2 KB | **150.9 KB** | −45.3 (−23.1%) |
| `/donate`                   | 196.2 KB | **150.9 KB** | −45.3 (−23.1%) |
| `/dashboard`                | 250.9 KB | **212.0 KB** | −38.9 (−15.5%) |

브라우저 실측(`performance.getEntriesByType("resource")` 의 `encodedBodySize`)으로
홈은 **152.1 KB** 로, 위 정적 계산과 일치한다. 이 값은
`tests/e2e/performance-budget.spec.ts` 가 175KB 예산으로 고정한다.

가장 큰 항목은 framer-motion 청크 하나였다(gzip 43.5KB / raw 132KB). 헤더가 모든
공개 페이지에 있어서 `AnimatePresence` import 하나로 공개 라우트 전체가 이 청크를
초기 번들로 받고 있었다.

남은 151KB 의 대부분은 React + Next App Router 런타임이다. 애플리케이션 코드는
gzip 약 20KB 수준으로, App Router 를 쓰는 한 이보다 크게 줄이기 어렵다.

## 2. App Shell 내용

라우트 공용 셸(`.next/server/app/**/*.segments/!KGhvbWUp.segment.rsc`)의 실제 내용:

|                     | before                                                              | after                                         |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| 헤더                | `Suspense(fallback: 빈 높이 자리표시자, children: 클라이언트 참조)` | 실제 `<header>` 마크업 + 로고 링크            |
| 내비게이션          | 셸에 없음                                                           | 경로 의존이라 좁은 `Suspense` 안에서 스트리밍 |
| 그룹 페이지 폴백    | `loading.tsx` = **홈 모양 스켈레톤**(모든 공개 라우트에 공통 적용)  | 없음 — 라우트마다 자기 셸                     |
| `/about/recruiting` | 페이지 최상단 `await headers()` → 본문 전체가 셸 밖                 | 본문은 셸 안, "모집 상태 배지"만 스트리밍     |

즉 before 에서는 `/linktree` 로 이동해도 홈 히어로 스켈레톤이 먼저 보였다.

## 3. 프리페치

`/archive/records`(카드 2장) 로드 후 스크롤까지 포함해 발생한 프리페치 요청:

```
prefetches=1  cards=2  urls=["/archive/records?_rsc=..."]
```

카드별 URL 프리페치는 **0건**이다. Partial Prefetching 이 카드 링크들을 라우트 공용
App Shell 하나로 접고 있다는 뜻이다. `tests/e2e/performance-budget.spec.ts` 가
**절대 상한 4** 로 고정한다(시드가 커져도 이 숫자를 올리면 안 된다).

## 4. 대시보드 인증 왕복

|                              | before                                | after           |
| ---------------------------- | ------------------------------------- | --------------- |
| 프록시의 세션 API 호출       | 1회 (네트워크, 렌더 시작 전 **직렬**) | 0회             |
| 렌더의 세션 API 호출         | 1회                                   | 1회             |
| 프로필 조회(`/api/users/me`) | 세션 뒤에 **직렬**                    | 세션과 **병렬** |
| 네비게이션당 직렬 왕복       | 3                                     | 1 (병렬 쌍)     |

after 값은 `tests/e2e/dashboard-session-requests.spec.ts` 가 mock API 계측기로
"네비게이션 1회당 `GET /api/auth/get-session` 정확히 1회"를 고정한다.
before 의 프록시 호출은 코드상 명확하다(`proxy.ts` 의 `fetchSession`).

`apps/api` 는 Cloudflare Worker 로 별도 오리진에 있으므로, 이 한 번의 직렬 왕복이
그대로 대시보드 진입 지연에 들어갔다.

## 5. 빌드

|                                 |                                                  시간 |
| ------------------------------- | ----------------------------------------------------: |
| before, 콜드                    |      87.8 s (compile 44 s / TS 26.7 s / static 6.6 s) |
| after, 콜드                     |     101.0 s (compile 49 s / TS 24.5 s / static 4.8 s) |
| after, 웜 (Turbopack 영속 캐시) | **33.4 s** (compile 10.7 s / TS 9.6 s / static 6.0 s) |

콜드 빌드는 나아지지 않았다. 2 vCPU VM 에서 같은 커밋을 반복 측정해도 70~90초
사이로 흔들려서(첫 베이스라인 측정은 70.9초였다) 이 차이는 **측정 잡음 범위**로
본다. 유의미한 것은 웜 빌드이고, Turbopack 영속 파일시스템 캐시는 16.3 기본값이라
설정을 추가하지 않았다. 배포 환경에서 `.next/cache` 를 보존하면 그대로 얻는다.

### React Compiler 실험 (되돌림)

| 구성       |      콜드 빌드 |   `/` JS | `/dashboard` JS |
| ---------- | -------------: | -------: | --------------: |
| 끔 (채택)  |         87.8 s | 151.8 KB |        212.0 KB |
| Babel 포트 | 143.0 s (+63%) | 153.9 KB |        216.4 KB |
| Rust 포트  | 113.6 s (+29%) | 153.9 KB |        216.4 KB |

공개 라우트는 이미 아일랜드 몇 개로 줄여 둬서 자동 메모이제이션이 줄일 리렌더가
거의 없는데 번들은 늘고 빌드는 느려진다. 되돌린 근거와 다시 켤 조건은
`next.config.ts` 주석에 있다.

## 6. 하이드레이션 대상 축소

| 화면                       | before (클라이언트 컴포넌트 인스턴스)                | after                                 |
| -------------------------- | ---------------------------------------------------- | ------------------------------------- |
| 홈 등장 애니메이션         | `MotionReveal` 14개 (카드 12 + 섹션 헤더 2)          | 0개 — 서버 `Reveal` + 옵저버 1개      |
| 홈 히어로                  | 전체가 `"use client"` (framer `motion.div` 5개 포함) | 서버 컴포넌트 + 패럴랙스 아일랜드 1개 |
| 헤더                       | 전체 트리가 `"use client"`                           | 서버 컴포넌트 + 아일랜드 2개          |
| 활동 상세 갤러리(사진 6장) | 타일 6개 + 컨테이너 1개                              | 컨트롤러 1개 (타일은 서버 HTML)       |

갤러리는 사진 수에 비례하던 것이 상수 1개가 됐다.

## 7. 검증

| 명령                                        | 결과                                   |
| ------------------------------------------- | -------------------------------------- |
| `pnpm --filter @yonyoung/web lint`          | 통과 (기존 경고 1건, 이번 작업과 무관) |
| `pnpm --filter @yonyoung/web typecheck`     | 통과                                   |
| `pnpm --filter @yonyoung/web test:unit`     | 332 passed / 53 files                  |
| `pnpm --filter @yonyoung/web build`         | 통과 (61 페이지 프리렌더)              |
| `pnpm --filter @yonyoung/web test:e2e:full` | 180 passed (desktop + mobile)          |
| `pnpm boundaries`                           | 통과                                   |
| `pnpm format:check`                         | 통과                                   |

베이스라인(`069c5b7`)의 e2e 는 154 passed 였다. 이번 작업에서 26개가 늘었다
(Instant Navigation 7, 성능 예산 3, 대시보드 세션 왕복 3 × 2 프로젝트, 헤더 1).

## 8. 측정하지 못한 것

- **실사용 Core Web Vitals(p75)**: 이 저장소에서 얻을 수 없다. 오리진(Dokploy)과
  CDN 구성, 실제 사용자 네트워크가 값을 지배한다. 앱은 `WebVitalsReporter` 로
  LCP/INP/CLS 를 10% 샘플링해 `/api/internal/web-vitals` 로 보내고 있으므로,
  배포 후 그 데이터로 확인해야 한다.
- **CDN 캐시 적중률**: 웹 앞단 구성은 외부 대시보드에 있다.
  확인 항목은 `performance-architecture.md` 의 CDN 절에 정리했다.
