# yonyoung-web

연세대학교 연영회 웹사이트의 프런트엔드. **Next.js 16 App Router** (React 19, Tailwind v4, cacheComponents, better-auth 클라이언트). Oracle Cloud + Dokploy + Nixpack 배포

## 명령어

```bash
pnpm dev            # next dev (API는 yonyoung-api를 pnpm dev로 함께 실행)
pnpm lint           # eslint
pnpm typecheck      # next typegen + TypeScript 7 (typescript7 alias) — 5.9 대비 ~6배 빠름
pnpm test:unit      # vitest (jsdom)
pnpm test:e2e:full  # Playwright 전체 (mock API 서버 + 프로덕션 빌드로 실행)
```

## 아키텍처

- 라우트 그룹: `app/(home)` 공개 사이트, `app/(dashboard)` 관리자. 루트 layout 없음(그룹별 layout)
- **모든 API 호출은 프록시 경유**: `app/api/[...path]/route.ts` → Hono API. 새 최상위 API prefix를 쓰면 `server/security/api-proxy-prefixes.ts` allowlist에 추가해야 함 (계약 테스트가 누락을 잡음)
- 계약: `shared/contracts/api-contracts.ts`(타입) + `api-schemas.ts`(zod 미러) — **API 저장소와 수동 동기화**. 응답 스키마의 신규 필드는 `.default(null)` 등으로 구버전 API 응답도 허용하게
- 공개 데이터 읽기: `features/public/services/public-read-service.ts` — `"use cache"` + `cacheLife` + `cacheTag(CACHE_TAGS.public.*)` 패턴. **모든 `"use cache"` 스코프에 `cacheLife`를 명시한다** — 생략하면 `default`(15분)가 붙고, `stale`이 짧으면 그 결과가 라우트 App Shell에 못 들어간다. 아카이브류는 `days`, 설정성 데이터는 `hours`(쓰기 시 `updateTag`로 즉시 무효화되므로 길게 잡아도 안전). "지금" 기준 계산(`Date.now()`)은 cacheComponents에서 `"use cache"` 안에서만 허용된다 — 히어로 전시 선택(`getFeaturedPublicExhibition`)이 그 예다
- **게시물 사전 렌더링**: `/archive/records/[id]`·`/archive/exhibitions/[id]`는 `features/public/services/public-static-params.ts`의 공유 `generateStaticParams`로 공개 게시물을 전부 빌드 시점에 굽는다. 페이지와 `opengraph-image.tsx`가 같은 함수를 re-export한다. 두 가지 규칙: ① cacheComponents는 **빈 배열을 빌드 에러로 처리**하므로 빌드 시 API가 닿지 않으면 `PLACEHOLDER_PARAM_ID`를 돌려준다 ② 페이지 최상단에서 `await params` 하면 안 된다 — `params` Promise를 `<Suspense>` 안의 하위 컴포넌트에 넘겨야 목록에 없는 id도 즉시 App Shell을 받는다
- 관리자 쓰기: `features/dashboard/actions/` 서버 액션 — 공통 코어는 `admin-write-core.ts`(writeRequest), 도메인별 액션 파일에서 사용. 쓰기 성공 시 `updateTag`로 관련 admin/public 태그를 모두 무효화 (`server/cache/tags.ts`)
- 업로드: `features/dashboard/api/admin-api/upload.ts` presigned 직접 업로드. 이미지 업로드 시 `read-image-dimensions.ts`로 원본 크기를 측정해 함께 저장 (공개 갤러리 레이아웃용)
- **공개 갤러리**: `app/(home)/_components/photo-gallery.tsx`(상태) + `photo-gallery-tile.tsx`(칸) + `photo-lightbox.tsx`(확대 보기). 레이아웃은 **justified rows**(Google Photos식) — 가로 우선 순서, 크롭 없음, 한 행 높이 통일. 수학은 전부 `app/(home)/globals.css`의 `.photo-gallery` / `.photo-gallery-item`에 있고 `--photo-aspect`(사진별 비율, **순수 숫자만**)와 `--gallery-ref-aspect`(행 높이 기준 = 한 행 장수 조절 손잡이)로 제어한다. 함정 3가지: `flex-basis` 반올림 때문에 `--gallery-slack` 필수 / `container-type`이 `position:fixed`를 가두므로 라이트박스는 **portal 필수** / `align-items: flex-start` 없으면 stretch가 `aspect-ratio`를 덮어쓴다
- **이미지 전송**: `next/image`는 전역 커스텀 로더(`features/media/images/cloudflare-image-loader.ts`)를 쓴다. R2 미디어 URL은 `storage.yonyoung.moveto.kr/cdn-cgi/image/...`(Cloudflare Image Transformations)로 변환해 엣지에서 리사이즈/AVIF 인코딩한다 — 오리진(Dokploy) CPU를 쓰지 않는다. `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`을 지우는 것이 롤백 스위치다(빌드 타임 인라인 → 재빌드 필요)
- **`images.loader: "custom"`이면 Next.js는 `/_next/image` 엔드포인트를 제공하지 않는다.** 따라서 로더는 이 경로로 URL을 만들면 안 되고(404), 변환 대상이 아닌 src(로컬 `/public` 자산, 구글 프로필 이미지)는 **원본 그대로** 반환한다. 리사이즈가 없으므로 `public/` 로고는 표시 크기(최대 60px, OG 이미지)에 맞춰 192px로 미리 축소해 두었다 — 큰 원본을 다시 넣지 말 것. 이를 고정하는 회귀 테스트가 `tests/unit/features/media/cloudflare-image-loader.test.ts`에 있다
- `images.deviceSizes`/`imageSizes`는 Cloudflare unique transformation 사용량(무료 월 5,000건)을 억제하려고 축소해 둔 값이다. 늘리면 이미지 1장당 변환 건수가 그만큼 늘어난다
- **OG 이미지**: 세그먼트별 `opengraph-image.tsx` 파일 컨벤션 + 공유 렌더러 `features/seo/og/og-card.tsx`. 전부 빌드 시점 PNG로 구워진다(정적 8개 + 게시물 18개). 문구는 `features/seo/metadata/page-seo.ts`의 `PAGE_SEO`를 `page.tsx`와 OG 파일이 함께 쓴다. 함정 4가지: ① `createPageMetadata`에 `openGraph.images`를 넣으면 파일 컨벤션이 무시된다(`twitter:image`는 비워 두면 Next가 OG에서 자동 채움) ② **`app/(dashboard)/opengraph-image.tsx`를 만들면 `(home)` 것과 `/opengraph-image`에서 충돌한다** ③ satori는 `<img width="60">`처럼 **문자열 크기를 거부하고 이미지를 통째로 건너뛴다** — 반드시 숫자 ④ 대표 사진은 `format=jpeg` 변환본을 받아 data URI로 넣는다(satori는 Accept 협상을 안 하므로 `format=auto` 금지). 계약 테스트는 `tests/unit/features/seo/opengraph-image-routes.test.ts`
- 첨부파일: 관리자 `attachment-manager.tsx`, 공개 `attachment-list.tsx`, 액션 `actions/attachments.ts`

## 테스트

- 유닛: `tests/unit/**` — 계약 테스트 주의: 모든 button류 요소는 `data-testid`(kebab-case) 필수, 프록시 prefix allowlist 검증 존재
- e2e: `tests/e2e/**` + mock API `tests/e2e/mock-api/` (server.ts는 이미 큼 — 새 도메인 핸들러는 `attachments-handlers.ts`처럼 별도 모듈로). 시드는 `seed.ts`, 상태 검증은 `support/state-assert.ts`
- e2e는 `pnpm build` 결과로 실행되므로 소스 수정 후 재실행 필요

## 규칙

- **파일당 500줄 이하**를 지향한다 (특히 클라이언트 컴포넌트 — 상태가 많으면 훅/하위 컴포넌트로 분리)
- 주석은 **한국어**로 작성한다
- 공개 페이지는 서버 컴포넌트 우선, `next/image` 사용 (raw `<img>` 지양)
- CSP·보안 헤더는 `next.config.ts` — img-src는 실제 미디어 호스트 allowlist 유지
