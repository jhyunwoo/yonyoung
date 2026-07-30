# yonyoung-web

연세대학교 중앙사진동아리 연영회의 공개 웹사이트와 내부 운영 대시보드를 함께 제공하는 Next.js 애플리케이션입니다. 공개 활동·전시 아카이브, 사진가 소개, 리크루팅, 후원, 링크트리와 회원·기수·콘텐츠·사이트 설정을 관리하는 대시보드가 한 저장소에 있습니다.

이 저장소는 웹 프런트엔드와 Backend for Frontend(BFF) 역할만 담당합니다. 인증, 데이터 저장, R2 업로드 서명 등 실제 비즈니스 API는 별도의 `yonyoung-api`가 담당합니다.

## 기술 스택

| 영역                 | 기술                                                         |
| -------------------- | ------------------------------------------------------------ |
| 애플리케이션         | Next.js 16 App Router, React 19, TypeScript                  |
| 스타일               | Tailwind CSS 4, 공개/대시보드별 CSS 디자인 토큰              |
| 인증                 | Better Auth 클라이언트, API 세션 프록시                      |
| 에디터/업로드        | Tiptap, Uppy, S3 호환 presigned upload                       |
| 검증                 | Zod                                                          |
| 단위·컴포넌트 테스트 | Vitest, Testing Library, jsdom                               |
| E2E                  | Playwright, Chromium, axe-core                               |
| 품질 관리            | ESLint, Prettier, GitHub Actions                             |
| 이미지               | `next/image` custom loader, Cloudflare Image Transformations |
| 운영                 | Oracle Cloud, Dokploy, Nixpacks, 외부 `yonyoung-api`         |

## 빠른 시작

### 요구 사항

- Node.js `22.12.0` (`.nvmrc`)
- pnpm `10.30.2` (`package.json#packageManager`)
- 전체 E2E 테스트를 실행할 경우 Chromium과 Linux 런타임 라이브러리

Corepack을 쓰는 환경에서는 저장소에 고정된 pnpm 버전을 그대로 사용할 수 있습니다.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
```

환경 변수 예시를 복사합니다.

```bash
cp .env.example .env
```

개발 서버를 실행한 뒤 [http://localhost:3000](http://localhost:3000)을 엽니다.

```bash
pnpm dev
```

로컬 API를 함께 개발할 때는 별도 `yonyoung-api` 개발 서버를 실행하고 `.env`의 `API_BASE_URL`을 그 주소로 바꾸십시오.

## 환경 변수

| 이름                             | 필수 여부 | 사용 위치          | 설명                                                                                                      |
| -------------------------------- | --------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL`                   | 필수      | 서버 런타임·빌드   | Next 서버가 호출할 `yonyoung-api`의 origin. 마지막 `/`는 자동 제거됩니다.                                 |
| `NEXT_PUBLIC_SITE_URL`           | 운영 필수 | 서버·브라우저·빌드 | canonical URL, sitemap, OAuth 공개 origin, same-origin 검사에 사용하는 웹사이트 origin입니다.             |
| `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` | 선택      | 브라우저 번들·빌드 | R2 미디어를 Cloudflare Image Transformations URL로 바꾸는 CDN origin입니다. 없으면 원본 URL을 사용합니다. |
| `NODE_ENV`                       | 자동      | 서버·빌드          | `development`, `test`, `production` 중 하나입니다.                                                        |

`NEXT_PUBLIC_*` 값은 빌드 결과에 포함됩니다. 운영 값을 바꾸면 서버 재시작만 하지 말고 반드시 다시 빌드해야 합니다. `.env`는 Git에서 제외되며 실제 비밀값을 커밋하면 안 됩니다.

## 주요 명령어

| 명령어                      | 설명                                                   |
| --------------------------- | ------------------------------------------------------ |
| `pnpm dev`                  | Turbopack 기반 Next 개발 서버 실행                     |
| `pnpm build`                | 프로덕션 빌드 생성                                     |
| `pnpm start`                | 생성된 프로덕션 빌드 실행                              |
| `pnpm lint`                 | 전체 소스 ESLint 검사                                  |
| `pnpm typecheck`            | Next 라우트 타입 생성 후 TypeScript 검사               |
| `pnpm format`               | Prettier로 파일 수정                                   |
| `pnpm format:check`         | 포맷 변경 없이 Prettier 검사                           |
| `pnpm fonts:sync`           | 설치된 Pretendard 동적 서브셋을 저장소 자산으로 동기화 |
| `pnpm fonts:check`          | Pretendard 생성 파일의 드리프트 검사                   |
| `pnpm test:unit`            | 전체 단위·컴포넌트 테스트 1회 실행                     |
| `pnpm test:unit:watch`      | Vitest watch 모드                                      |
| `pnpm test:unit:coverage`   | 커버리지 기준을 포함한 테스트 실행                     |
| `pnpm test:e2e`             | 데스크톱·모바일 핵심 smoke E2E 실행                    |
| `pnpm test:e2e:full`        | 전체 Playwright E2E 실행                               |
| `pnpm test:e2e:full:repeat` | 전체 E2E를 프로젝트별 2회 반복해 불안정성 확인         |
| `pnpm test`                 | 단위 테스트 후 전체 E2E 실행                           |
| `pnpm test:ci`              | 로컬에서 GitHub Actions와 같은 전체 품질 게이트 실행   |

## 라우트 구성

App Router의 route group 두 개가 각각 독립적인 루트 레이아웃과 스타일을 가집니다.

- `app/(home)`: 공개 사이트
  - `/`
  - `/about`, `/about/photographers`, `/about/recruiting`
  - `/archive/records`, `/archive/records/[id]`
  - `/archive/exhibitions`, `/archive/exhibitions/[id]`
  - `/donate`, `/linktree`
  - `/auth/pending-approval`
- `app/(dashboard)`: 인증·내부 운영 화면
  - `/auth/sign-in`, `/auth/profile`
  - `/dashboard`
  - `/dashboard/[generationName]/*`
  - `/dashboard/settings/*`
  - `/dashboard/stats`
- `app/api/[...path]`: 허용된 일반 API를 같은 origin으로 프록시
- `app/api/auth/[...path]`: Better Auth 요청과 `Set-Cookie`를 보존하는 인증 전용 프록시
- `app/api/internal/*`: 클라이언트 오류와 Web Vitals 수집
- `app/og/[payload]`: 동적 Open Graph 이미지
- `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`: PWA·검색 엔진 메타데이터

`/archive`는 `next.config.ts`에서 `/archive/records`로 영구 리디렉션됩니다.

## 프로젝트 구조

```text
.
├── app/
│   ├── (home)/                 # 공개 사이트, 공개 전용 layout·CSS·컴포넌트
│   ├── (dashboard)/            # 인증/대시보드, 내부 전용 layout·CSS·컴포넌트
│   ├── _components/            # 두 영역이 공유하는 앱 수준 컴포넌트
│   ├── api/                    # BFF 프록시와 내부 관측 API
│   ├── og/                     # 동적 OG 이미지
│   ├── manifest.ts
│   ├── robots.ts
│   └── sitemap.ts
├── components/ui/              # route group에 종속되지 않는 공용 UI
├── features/
│   ├── auth/                   # 세션, 역할, 인증 가드
│   ├── dashboard/              # 관리자 서버 액션, API, 캐시, 도메인 로직
│   ├── media/                  # 이미지, 리치 텍스트, 업로드
│   ├── public/                 # 공개 API 읽기 모델과 서비스
│   └── seo/                    # 메타데이터, JSON-LD, OG
├── server/
│   ├── cache/                  # Next cache tag 정의
│   ├── http/                   # timeout, API 클라이언트, 요청 컨텍스트
│   ├── observability/          # 구조화 로그와 민감정보 제거
│   └── security/               # 프록시 allowlist, CSRF, body limit, origin 검사
├── shared/
│   ├── contracts/              # API 타입과 Zod 런타임 스키마
│   ├── http/                   # 클라이언트/서버 공용 HTTP 유틸리티
│   └── security/               # 공용 CSRF 헤더
├── tests/
│   ├── unit/                   # 순수 로직·서버 경계 테스트
│   ├── component/              # Testing Library 컴포넌트 테스트
│   ├── e2e/                    # 데스크톱·모바일 Playwright 시나리오
│   └── setup/                  # 테스트 공통 설정
├── public/                     # 로고, favicon, 검색엔진 인증, 폰트, 정적 스크립트
├── scripts/                    # Playwright 실행과 Pretendard 동기화
├── instrumentation.ts          # 서버 오류 구조화 로깅
├── instrumentation-client.ts   # 브라우저 오류 샘플링
├── proxy.ts                    # /dashboard 선행 세션·역할 검사
└── next.config.ts              # 이미지, CSP, 보안 헤더, 리디렉션
```

공개 페이지와 대시보드의 시각 규칙은 각각 `app/(home)/DESIGN.md`, `app/(dashboard)/DESIGN.md`에 있습니다. UI를 수정하기 전에 해당 문서를 함께 확인하십시오.

## 요청과 데이터 흐름

브라우저에서 API origin을 직접 호출하지 않고 웹 origin의 `/api/*`를 사용합니다.

```text
Browser
  ├─ 공개/인증 API ─> Next Route Handler ─> yonyoung-api
  ├─ 관리자 form ───> Next Server Action ─> yonyoung-api
  └─ R2 이미지 ─────> Cloudflare Image Transformations ─> R2
```

### API 프록시

- 일반 프록시는 `server/security/api-proxy-prefixes.ts`의 allowlist에 포함된 최상위 경로만 전달합니다.
- `auth`와 `internal`은 일반 프록시에서 차단되고 각각 전용 handler가 처리합니다.
- 상태 변경 요청은 same-origin/CSRF 헤더 검사와 body size 제한을 통과해야 합니다.
- timeout은 일반 요청 45초, 인증 요청 15초입니다.
- 새 API 도메인을 추가할 때 API 호출 코드만 만들지 말고 prefix allowlist와 계약 테스트도 갱신해야 합니다.

### API 계약

- TypeScript 형태: `shared/contracts/api-contracts.ts`
- 런타임 검증: `shared/contracts/api-schemas.ts`

이 계약은 별도 API 저장소와 자동 생성되지 않으므로 수동으로 동기화해야 합니다. API 응답 필드가 추가·변경되면 타입, Zod 스키마, mock API seed/handler, 단위/E2E 테스트를 함께 수정하십시오.

### 캐시

공개 읽기는 `features/public/services/public-read-service.ts`에서 `"use cache"`와 `cacheTag`를 사용합니다. 관리자 쓰기는 `features/dashboard/actions/*`의 서버 액션을 통해 수행하며, 성공하면 `updateTag`로 관련 공개/관리자 캐시를 함께 무효화합니다. 새 쓰기 작업은 `server/cache/tags.ts`의 적절한 태그를 빠뜨리지 않아야 합니다.

## 인증과 권한

- `proxy.ts`는 `/dashboard/:path*` 진입 전에 API 세션을 확인합니다.
- 미인증 사용자는 `/auth/sign-in?next=...`로 이동합니다.
- `unverified` 사용자는 대시보드에 접근할 수 없습니다.
- 세부 페이지와 서버 액션은 `features/auth/server/auth-guard.ts` 및 `admin-write-access.ts`로 다시 권한을 검사합니다.
- 프런트엔드 권한 검사는 UX 보호 계층이며 최종 인가는 반드시 API에서도 수행해야 합니다.

운영은 reverse proxy 뒤에 있으므로 내부 `request.nextUrl.origin`만 신뢰하면 안 됩니다. `NEXT_PUBLIC_SITE_URL`을 공개 origin으로 설정하고 인증 프록시가 공개 `x-forwarded-host`와 `x-forwarded-proto`를 API에 전달하게 유지하십시오. Google OAuth callback은 웹 origin의 `/api/auth/callback/google`과 일치해야 하며, state cookie 검사를 우회해서는 안 됩니다.

## 이미지와 업로드

- `next/image`는 `features/media/images/cloudflare-image-loader.ts`의 전역 custom loader를 사용합니다.
- R2 미디어만 `${NEXT_PUBLIC_IMAGE_CDN_BASE_URL}/cdn-cgi/image/...`로 변환합니다.
- 로컬 `/public` 자산과 Google 프로필 이미지는 원본 URL을 그대로 반환합니다.
- custom loader 구성에서는 `/_next/image` endpoint가 생성되지 않습니다.
- 로컬 로고는 런타임 리사이즈가 없으므로 현재 표시 크기에 맞게 최적화되어 있습니다. 큰 원본으로 교체하지 마십시오.
- `deviceSizes`와 `imageSizes`를 늘리면 Cloudflare의 unique transformation 사용량도 늘어납니다.
- 이미지 업로드 전 `read-image-dimensions.ts`가 원본 크기를 읽어 justified gallery 레이아웃에 필요한 비율을 저장합니다.

Pretendard는 CSP의 self-hosted font 정책 때문에 `public/fonts/pretendard`에 vendoring합니다. 해당 폴더와 `app/(dashboard)/pretendard-font.css`를 직접 수정하지 말고 의존성 버전 변경 후 `pnpm fonts:sync`를 실행하십시오.

## SEO와 관측

- 공개 상세 페이지는 실제 경로를 canonical, Open Graph URL과 JSON-LD에 전달합니다.
- 활동 상세는 `Article`, 전시 상세는 `Event`, 두 유형 모두 `BreadcrumbList`를 제공합니다.
- sitemap은 정적 공개 경로와 API에서 읽은 활동·전시 상세 경로를 합칩니다.
- 인증·대시보드 페이지는 `noindex`, `/api/`는 robots에서 제외됩니다.
- `/llms.txt`는 `public/llms.txt`에서 제공합니다.
- 서버는 `instrumentation.ts`와 `server/observability/*`로 JSON 로그를 남깁니다.
- 브라우저 오류와 Web Vitals는 `/api/internal/*`로 샘플링 전송됩니다.

## 테스트

### 단위·컴포넌트

Vitest는 `tests/unit`, `tests/component`, 일부 `features/**/*.test.ts`를 실행합니다. 커버리지는 `vitest.config.ts`의 핵심 경계 파일과 전역 threshold를 적용합니다. threshold 실패를 해결할 때 기준을 낮추기보다 누락된 동작 분기를 테스트하십시오.

대시보드의 button 계열 요소에는 접근 가능한 이름과 kebab-case `data-testid`가 필요합니다. 계약 테스트가 route group 격리, API prefix allowlist, 디자인 토큰 대비 등 구조적 규칙도 검사합니다.

### E2E

`playwright.config.ts`는 외부 개발·운영 API를 사용하지 않습니다.

1. `tests/e2e/mock-api/server.ts`를 `127.0.0.1:4010`에서 실행합니다.
2. 테스트용 환경 변수로 프로덕션 `pnpm build`를 생성합니다.
3. Next 서버를 `127.0.0.1:3005`에서 실행합니다.
4. desktop Chromium과 Pixel 7 프로필에서 시나리오를 실행합니다.

trace, video, screenshot은 실패한 테스트에만 보존되며 `test-results/playwright`에 생성됩니다. 로컬에서는 기존 3005/4010 서버를 재사용하므로 데이터가 이상하면 해당 포트의 오래된 프로세스를 종료한 뒤 다시 실행하십시오.

Playwright wrapper인 `scripts/run-playwright.sh`는 Chromium을 준비하고, Linux에 필수 라이브러리가 없으면 `.cache` 아래에 패키지를 내려받아 실행합니다.

## CI/CD

`.github/workflows/ci.yml`은 `main`·`dev` push, 두 브랜치를 대상으로 한 pull request, 수동 실행에서 동작합니다.

1. `Quality gates`
   - 저장소에 고정된 pnpm 버전 설치
   - Node `.nvmrc` 버전과 pnpm store cache 사용
   - frozen lockfile 설치
   - vendored font, ESLint, TypeScript 검사
   - 커버리지 threshold를 포함한 Vitest 실행
2. `E2E (Chromium)`
   - Quality gates 성공 후 실행
   - Chromium과 OS 의존성 설치
   - mock API + 프로덕션 빌드 기반 전체 Playwright 실행
   - 실패 시 trace/video/screenshot artifact 업로드

같은 PR/ref에 새 커밋이 올라오면 이전 실행은 concurrency 설정으로 취소됩니다. GitHub Actions의 pnpm 버전은 `package.json#packageManager` 한 곳에서만 관리하므로 workflow에 별도 `version`을 다시 쓰지 마십시오.

현재 배포는 GitHub Actions가 서버에 직접 접속하는 방식이 아니라 Dokploy/Nixpacks의 저장소 연동이 담당합니다. 따라서 Actions의 두 job을 모두 필수 status check로 설정하고, 성공한 커밋만 Dokploy 배포 브랜치에 병합하는 것이 release gate입니다. 실제 Dokploy 배포 성공 여부와 health check는 별도 운영 화면에서 확인해야 합니다.

## 배포 시 주의 사항

- 빌드와 런타임 모두 `API_BASE_URL`이 필요합니다.
- `NEXT_PUBLIC_SITE_URL`은 사용자가 접근하는 HTTPS 공개 origin이어야 합니다.
- reverse proxy가 원래 host/protocol을 보존하도록 구성해야 OAuth cookie와 callback origin이 일치합니다.
- `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start` 순서를 사용합니다.
- 새 환경 변수를 추가하면 `.env.example`, `server/env.ts`, 배포 환경, README를 함께 갱신하십시오.
- 테스트 통과는 실제 Google 로그인, Dokploy 배포, 검색엔진 색인, 실사용 Core Web Vitals 성공을 의미하지 않습니다.

## 생성 파일과 저장소 관리

다음 경로는 실행 시 다시 만들어지며 Git에 커밋하지 않습니다.

- `node_modules/`
- `.next/`, `out/`, `build/`
- `coverage/`
- `test-results/`, `playwright-report/`
- `.cache/`, `.tmp/`, `.seo-cache/`
- `next-env.d.ts`, `*.tsbuildinfo`
- `.env*` (`.env.example` 제외)

작업을 마치기 전 최소 권장 검사는 다음과 같습니다.

```bash
pnpm fonts:check
pnpm lint
pnpm typecheck
pnpm test:unit:coverage
pnpm test:e2e:full
```

변경 범위가 작더라도 API 계약, cache tag, 권한, desktop/mobile 두 viewport 중 어디에 영향을 주는지 확인하십시오.
