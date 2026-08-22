# yonyoung-web Architecture

## 계층과 소유권

| 경로                 | 소유하는 것                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `app/`               | 라우팅, 레이아웃, 메타데이터, Server Component 조립, 그 라우트에서만 쓰는 표현 컴포넌트                       |
| `features/<domain>/` | 도메인 로직. `services/`(서버 읽기), `actions/`(서버 쓰기), `model/`·`*-model.ts`(순수 계산), `hooks/`, `ui/` |
| `shared/`            | 도메인이 없는 공용 요소. `contracts/`(API 계약), `http/`, `react/`, `utils/`                                  |
| `server/`            | 요청 처리 경계. API 프록시 allowlist, 캐시 태그, 보안 헤더, 요청 컨텍스트                                     |
| `components/`        | 디자인 시스템 프리미티브                                                                                      |

## 의존 방향

```text
app  →  features  →  shared
                 ↘
server  →  shared
```

ESLint `no-restricted-imports`가 CI에서 강제한다(`eslint.config.mjs`).

- `shared` 는 `app`/`features` 를 import 할 수 없다.
- `features` 는 `app` 을 import 할 수 없다. 화면 조립은 `app` 쪽 책임이다.
- `server` 는 `app`/`features` 를 import 할 수 없다.

## 데이터 읽기

### 공개 페이지

`features/public/services/public-read-service.ts` — `"use cache"` + `cacheLife` +
`cacheTag(CACHE_TAGS.public.*)`. 모든 `"use cache"` 스코프에 `cacheLife` 를 명시한다.

### 관리자 화면

`features/dashboard/services/admin-read-service.ts` — 항상 `cache: "no-store"` 다.
권한별로 응답이 갈리는 데이터를 캐시에 남기면 안 되기 때문이다.

읽기 결과는 판별 가능한 union 이다.

```ts
type AdminReadResult<T> = { ok: true; data: T } | { ok: false; error: AdminReadError };
```

**실패를 빈 배열이나 null 로 바꾸지 않는다.** 호출부가 "데이터가 없음"과 "읽지 못함"을
구분할 수 있어야 화면에서 빈 상태와 오류 상태를 다르게 보여 줄 수 있다.
오류 표시는 `app/(dashboard)/_components/admin-read-error.tsx` 를 쓴다.

응답은 `shared/contracts/api/*` 의 Zod 스키마로 런타임 검증한다. 계약과 다른 응답은
성공으로 취급하지 않는다(`invalid_response`).

## 데이터 쓰기

`features/dashboard/actions/` 의 Server Action.
공통 코어는 `admin-write-core.ts`(`writeRequest`), 권한 판정은 `admin-write-access.ts`.
각 도메인 파일이 자기 mutation 의 실제 구현을 소유한다 — path · method · request/response
스키마 · accessScope · **무효화할 캐시 태그**가 모두 그 파일에 있다.

쓰기 성공 시 `updateTag` 로 관련 admin/public 태그를 모두 무효화한다(`server/cache/tags.ts`).
태그를 하나라도 빠뜨리면 공개 페이지가 낡은 내용을 계속 보여 준다.

## Server / Client 경계

Server Component 가 기본이다. Client Component 는 다음이 필요할 때만 쓴다.

- 사용자 입력 상태(검색 · 필터 · 선택 · 폼 초안)
- 브라우저 API(objectURL, matchMedia, localStorage, 포커스)
- 애니메이션/인터랙션

**초기 데이터를 가져오려고 Client Component 를 만들지 않는다.** 서버에서 읽어
props 로 내려준다.

```text
Server page
  → 권한 확인 · 읽기 · 리다이렉트/404 판정
  → 직렬화 가능한 초기 데이터
  → Client 상호작용 컴포넌트
```

### effect 로 상태를 되돌리지 않기

`react-hooks/set-state-in-effect` · `purity` · `refs` 가 전역으로 켜져 있다.

- prop 이 바뀔 때 상태를 초기화하려면 `shared/react/use-reset-on-change.ts` 를 쓴다.
  effect 로 나중에 되돌리면 잘못된 상태로 한 프레임이 먼저 그려진다.
- hydration 완료 여부는 `shared/react/use-is-mounted.ts` 를 쓴다.
- 렌더 단계에서 계산할 수 있는 값은 state 로 복제하지 않는다.

정말 불가피한 경우에만 한 줄짜리 disable 을 쓰고, 왜 필요한지 한국어 주석으로 남긴다.
현재 남아 있는 예외는 세 곳뿐이다(테마 dataset 읽기, 갱신 시각 표시 2곳).

## 미디어 업로드

공용 primitive 는 `features/media/upload/` 가 소유한다.

| 파일                          | 역할                                             |
| ----------------------------- | ------------------------------------------------ |
| `use-selected-image-file.ts`  | 단일 이미지 선택 + objectURL 수명                |
| `use-image-upload-state.ts`   | 세부 이미지 목록(추가 · 삭제 · 정렬 · 중복 제거) |
| `weighted-upload-progress.ts` | 대표 1 : 세부 N 가중 진행률                      |
| `detail-image-upload.ts`      | 원본 픽셀 크기 측정 + 일괄 업로드                |

Activity 와 Exhibition 은 이 primitive 를 공유하지만 **저장 흐름 자체는 합치지 않는다.**
생성과 수정의 의미가 다르고(부분 실패 복구 · sortOrder 재배치), 억지로 하나의
GenericForm 으로 묶으면 도메인 규칙이 조건문 속으로 사라진다.

원본 픽셀 크기를 함께 저장하는 이유는 공개 갤러리가 justified rows 레이아웃을
그리려면 서버가 각 사진의 비율을 알아야 하기 때문이다.

## 새 dashboard 도메인 추가하기

| 무엇을                | 어디에                                                  |
| --------------------- | ------------------------------------------------------- |
| API 타입 + Zod 스키마 | `shared/contracts/api/<domain>.ts` (+ 배럴에 re-export) |
| 서버 읽기             | `features/dashboard/services/admin-read-service.ts`     |
| 서버 쓰기             | `features/dashboard/actions/<domain>.ts`                |
| 클라이언트 API 호출   | `features/dashboard/api/admin-api/resources.ts`         |
| 캐시 태그             | `server/cache/tags.ts`                                  |
| 순수 계산             | `features/dashboard/<domain>/*.ts` (단위 테스트 대상)   |
| 화면                  | `app/(dashboard)/...`                                   |
| 새 API prefix         | `server/security/api-proxy-prefixes.ts` allowlist       |

### `resources.ts` 를 도메인별로 쪼개지 않은 이유

208줄이고 각 항목이 `adminRequest` 한 줄 래퍼다. 쓰기는 이미
`features/dashboard/actions/` 에서 도메인별로 나뉘어 있고, 읽기는 점점 서버
(`admin-read-service`)로 옮겨 가는 중이다. 지금 9개 파일로 쪼개면 51개 호출부만
바뀌고 얻는 문맥 축소는 거의 없다.

## 회귀 가드

- `tests/unit/app-shared/button-testid-contract.test.ts`
  — 모든 button 류 요소가 kebab-case `data-testid` 를 갖는지 정적 검사.
- `tests/unit/server/security/api-proxy-prefixes.test.ts`
  — 프록시 allowlist 누락 검사.
- `tests/unit/features/media/cloudflare-image-loader.test.ts`
  — 커스텀 이미지 로더가 `/_next/image` 로 URL 을 만들지 않는지 고정.
- `tests/unit/features/seo/opengraph-image-routes.test.ts`
  — OG 이미지 라우트 계약.
- `tests/e2e/**` — 프로덕션 빌드 결과로 실행. 소스 수정 후 재실행이 필요하다.
