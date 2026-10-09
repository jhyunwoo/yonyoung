# 대시보드 MCP 설계

- 작성일: 2026-10-08
- 상태: 검토 대기
- 브랜치: `feat/dashboard-mcp`

## 1. 목적과 성공 기준

동아리원이 Claude 앱(claude.ai, Claude Desktop, 모바일)과 ChatGPT에서 연영 대시보드의 기능을 대화로 쓸 수 있게 한다. 사용자 대부분은 개발 도구를 쓰지 않으므로 설치는 "커넥터 URL 붙여넣기 → 연영 로그인 → 허용"으로 끝나야 한다.

성공 기준:

1. 커넥터를 연결하면 로그인한 사용자의 역할로 쓸 수 있는 도구만 보인다.
2. 권한이 없는 동작은 웹 대시보드와 같은 API 규칙으로 거부되고, 사유가 한국어로 전달된다.
3. Claude나 ChatGPT 채팅에 올린 이미지·문서를 그대로 대시보드 콘텐츠에 첨부할 수 있다.
4. 부원이 `/dashboard/mcp` 안내 페이지만 보고 혼자 설치할 수 있다.

전제:

- 권한의 기준은 `apps/api/src/lib/authorization/policy.ts`와 각 라우트의 추가 가드(서열, 본인 한정, 마지막 회장 보호)다. MCP 전용 권한 체계는 만들지 않는다.
- `unverified` 사용자는 MCP를 쓸 수 없다.

## 2. 아키텍처 개요

```text
Claude / ChatGPT
   │  ① OAuth (인가 코드 + PKCE)
   ▼
yonyoung.yonsei.ac.kr/api/auth/*  ──(웹 BFF 프록시)──▶  API Worker: Better Auth (+ jwt, mcp)
   │  ② Bearer JWT
   ▼
api.yonyoung.moveto.kr/mcp  ──▶  API Worker: MCP 핸들러
                                    │ ③ 토큰 검증 → DB에서 Actor 로드
                                    │ ④ 역할에 맞는 도구만 등록한 McpServer를 요청마다 생성
                                    │ ⑤ 도구 실행 = 기존 Hono 라우트를 app.request()로 호출
                                    ▼
                                 기존 라우트 (권한 가드, 감사 로그, D1, R2)
```

- 인증 서버(issuer)는 `https://yonyoung.yonsei.ac.kr/api/auth`다. 세션 쿠키가 웹 도메인에 있으므로 인가는 웹 프록시를 거친다.
- MCP 리소스 서버는 `https://api.yonyoung.moveto.kr/mcp`이며 API Worker에 직접 둔다. Next 프록시의 타임아웃과 본문 한도를 피하기 위해서다.
- MCP 서버는 MCP TypeScript SDK v2의 `createMcpHandler`로 만든 stateless 핸들러다. 세션 상태와 Durable Object는 쓰지 않는다.
- 도구는 비즈니스 로직을 다시 구현하지 않는다. 기존 라우트를 같은 Worker 안에서 호출하므로 권한 가드, 검증, 감사 로그, 캐시 무효화가 그대로 적용된다.

## 3. 인증과 연결 흐름

### 3.1 Better Auth 설정

`apps/api/src/lib/auth.ts`의 `plugins`에 다음을 추가한다.

- `jwt()`: 액세스 토큰을 JWT로 발급하고 `/api/auth/jwks`를 제공한다.
- `mcp({ loginPage: "/auth/sign-in", consentPage: "/auth/mcp-consent", resource: "https://api.yonyoung.moveto.kr/mcp", allowDynamicClientRegistration: true, allowUnauthenticatedClientRegistration: true })`
- `disabledPaths: ["/token"]`: jwt 플러그인의 `/token`이 OAuth 토큰 엔드포인트와 겹치므로 끈다(Better Auth 문서 권장).
- 클라이언트 등록은 DCR만 켠다. `@better-auth/cimd`는 DNS 고정을 보장하는 전송 함수를 요구하는데 Workers `fetch`로는 만들 수 없어 제외한다. Claude와 ChatGPT는 DCR을 지원한다.
- `jwt({ jwt: { issuer: "<BETTER_AUTH_URL>/api/auth" } })`로 issuer를 고정한다. 기본값은 요청 호스트에 따라 바뀌는 baseURL이다.

- scope는 `openid profile email offline_access mcp`다.
- 액세스 토큰은 1시간, 리프레시 토큰은 30일 동안 유효하다.
- 토큰에는 역할을 넣지 않는다.
- 리소스 URL은 환경별로 달라지므로 `MCP_RESOURCE_URL` 변수로 둔다. 프로덕션 값은 `wrangler.jsonc`의 `vars`에 넣는다.

필요한 D1 테이블(OAuth 클라이언트, 동의, 토큰, JWKS)은 Better Auth 스키마 생성으로 만들고 drizzle 마이그레이션으로 추가한다. 기존 `auth-schema-parity.test.ts`가 스키마 일치를 검증한다.

### 3.2 사용자 흐름

1. 사용자가 Claude 또는 ChatGPT에 `https://api.yonyoung.moveto.kr/mcp`를 커넥터로 추가한다.
2. 클라이언트가 `/.well-known/oauth-protected-resource`에서 인증 서버를 찾고, 브라우저를 인가 엔드포인트로 보낸다.
3. 로그인되어 있지 않으면 `/auth/sign-in`(Google 로그인)을 거쳐 인가 요청으로 돌아온다.
4. `/auth/mcp-consent`에서 클라이언트 이름, 내 역할, 내 역할로 쓸 수 있는 도구 요약을 보고 허용하거나 거절한다.
   - `unverified` 사용자에게는 허용 버튼 대신 "승인 대기 중" 안내만 보여준다.
5. 클라이언트가 토큰을 받고 연결이 완료된다.

### 3.3 토큰에서 Actor 만들기

1. `/mcp` 요청이 오면 `@better-auth/mcp`의 `requireMcpAuth`가 JWT의 서명, `iss`, `aud`(=`MCP_RESOURCE_URL`), 만료를 검증한다. 실패하면 401과 `WWW-Authenticate`(resource metadata URL 포함)를 돌려준다.
   1-1. 검증된 토큰의 `(sub, azp)`에 대한 `oauthConsent` 행이 있는지 확인한다. 없으면 401이다. Better Auth의 `delete-consent`는 리프레시 토큰을 남기므로, 연결 해제는 우리 코드가 동의 삭제와 토큰 `revoked` 기록을 함께 한다(6장).
2. `sub`로 사용자를 조회해 `Actor`를 만든다.
   - `getActorFromSession`(`apps/api/src/lib/auth/session.ts`)의 "사용자 ID → Actor" 부분을 `loadActorByUserId`로 떼어내 두 경로가 함께 쓴다.
   - 삭제된 사용자는 401을, `unverified` 사용자는 403과 "승인 대기 중" 메시지를 받는다.
3. 도구가 기존 라우트를 호출할 때는 `app.request(path, init, env)`의 env 인자에 Symbol 키(`MCP_ACTOR`)로 Actor를 실어 보낸다.
   - `AppDependencies.resolveActor`는 `c.env[MCP_ACTOR]`가 있으면 세션 조회 없이 그 값을 쓴다.
   - 외부 HTTP 요청은 env를 만들 수 없으므로 이 경로로 Actor를 위조할 수 없다.
   - 헤더나 쿼리로 Actor를 전달하는 방식은 쓰지 않는다.
4. 내부 호출에는 `Origin`이 없으므로 기존 CSRF 미들웨어와 충돌하지 않는지 확인한다. 충돌하면 CSRF 미들웨어도 `MCP_ACTOR`가 있는 내부 요청만 통과시킨다.

### 3.4 웹 쪽 변경

- `/auth/sign-in`: 인가 요청으로 돌아가는 return-to를 지원한다. 리다이렉트 대상은 같은 오리진의 `/api/auth/oauth2/authorize`(와 기존 허용 경로)로 제한한다.
- `/api/auth/[...path]` 프록시: OAuth 토큰, 클라이언트 등록, JWKS, 메타데이터 엔드포인트는 Claude·ChatGPT 서버가 Origin 없이 호출한다. 이 경로들만 `enforceSameOriginProtection` 예외 목록에 넣는다. 나머지 `/api/auth/*`의 보호는 그대로 둔다.
- `/auth/mcp-consent`: 동의 화면(3.2의 4단계)

## 4. 도구 구성

### 4.1 노출 규칙

- 도구 정의는 `@yonyoung/contracts/mcp`의 카탈로그 한 곳에 모은다. 각 항목은 이름, 한국어 설명, 분류, 노출 조건, 파일 인자 여부, `readOnly`/`destructive` 표시를 담는다.
- 노출 조건 종류는 네 가지다. `verified`(승인된 모든 사용자), `manager_like`(부장 이상, `isManagerLikeRole`), `leadership`(회장·부회장), `permission(anyOf)`(나열한 권한 중 하나라도 `can()`이 참이면 노출)다. 값은 **해당 라우트가 실제로 거는 가드**와 같아야 한다. 예를 들어 사이트 설정 조회 라우트는 `site_setting.update`를 요구하므로 `site_settings_get`의 노출 조건도 `site_setting.update`다.
- API는 요청마다 노출 조건 종류별로 걸러 해당 도구만 `McpServer`에 등록한다. `verified`는 승인된 사용자 전체, `manager_like`와 `leadership`은 역할로 판정하고, `permission(anyOf)`은 `can(actor.role, resource, action)` 중 하나라도 참이면 노출한다.
- 노출은 UX일 뿐이며, 최종 판정은 항상 기존 라우트가 한다. 서열 규칙처럼 대상에 따라 달라지는 거부는 도구 호출 결과로 전달된다.
- 조회 도구에는 `readOnlyHint: true`를 붙인다. 삭제, 역할 변경, 멤버 삭제 도구에는 `destructiveHint: true`를 붙여 클라이언트가 실행 전에 확인을 받게 한다.
- 도구 이름은 영어 snake_case로 짓고, 설명과 인자 설명은 한국어로 쓴다. 인자 스키마는 기존 API 요청 스키마에서 파생해 따로 유지하지 않는다.

### 4.2 도구 목록

위 단계는 아래 단계의 도구를 모두 포함한다.

**부원 이상** (new_member, associate_member, regular_member)

| 도구                                                        | 호출 라우트                                                  | 노출 조건                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `whoami`                                                    | `GET /api/users/me` + 노출 도구 요약                         | verified                                                            |
| `generation_list` / `generation_get` / `generation_members` | `GET /api/generations`, `/{id}`, `/{id}/members`             | generation.read                                                     |
| `activity_list` / `activity_get`                            | `GET /api/activities`, `/{id}`                               | activity.read                                                       |
| `exhibition_list` / `exhibition_get`                        | `GET /api/exhibitions`, `/{id}`                              | exhibition.read                                                     |
| `linktree_list` / `linktree_get`                            | `GET /api/linktree`, `/{id}`                                 | linktree.read                                                       |
| `attachment_list`                                           | `GET /api/attachments`                                       | activity.read 또는 site_setting.read (scope별 read는 라우트가 판정) |
| `member_list` / `member_get`                                | `GET /api/users`, `/{id}`                                    | user.read (부원은 라우트가 본인만 반환)                             |
| `my_profile_update`                                         | `PATCH /api/users/{본인 id}` (프로필 필드만)                 | verified                                                            |
| `my_profile_photo_set`                                      | 파일 → `profile_image` 업로드 → `PATCH /api/users/{본인 id}` | verified                                                            |
| `upload_prepare` / `upload_status`                          | 5장 참고                                                     | verified (purpose별 권한은 5장)                                     |

**운영진 이상** (manager)

| 도구                                                                                                         | 호출 라우트                                                             | 노출 조건                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `activity_create` / `activity_update`                                                                        | `POST /api/activities`, `PATCH /{id}` (커버 이미지 파일 인자 선택)      | activity.create / update                                                                  |
| `activity_delete`                                                                                            | `DELETE /api/activities/{id}`                                           | activity.delete                                                                           |
| `activity_images_add`                                                                                        | 파일들 → `POST /api/activities/{id}/images/batch`                       | activity.update                                                                           |
| `activity_image_update` / `activity_images_update`                                                           | `PATCH /{id}/images/{imageId}`, `PATCH /{id}/images/batch` (캡션, 순서) | activity.update                                                                           |
| `activity_image_delete`                                                                                      | `DELETE /{id}/images/{imageId}`                                         | activity.delete                                                                           |
| `exhibition_create` / `exhibition_update`                                                                    | `POST /api/exhibitions`, `PATCH /{id}` (커버 이미지 파일 인자 선택)     | exhibition.create / update                                                                |
| `exhibition_images_add` / `exhibition_image_update` / `exhibition_images_update` / `exhibition_image_delete` | 활동 이미지와 같은 구조                                                 | exhibition.update (이미지 삭제 포함)                                                      |
| `linktree_create` / `linktree_update` / `linktree_delete`                                                    | `/api/linktree` CRUD                                                    | linktree.create / update / delete                                                         |
| `linktree_item_add` / `linktree_item_update`                                                                 | `POST /api/linktree/{id}/items`, `PATCH /{itemId}`                      | linktree.update                                                                           |
| `linktree_item_delete`                                                                                       | `DELETE /api/linktree/{id}/items/{itemId}`                              | linktree.delete                                                                           |
| `attachment_create` / `attachment_update` / `attachment_delete`                                              | `/api/attachments` (파일 인자 또는 `linkUrl`)                           | activity나 site_setting의 create 또는 update (`canCreateOrUpdate`, scope별 판정은 라우트) |
| `dashboard_overview`                                                                                         | `GET /api/admin/dashboard`                                              | manager_like                                                                              |
| `page_view_stats` / `page_view_dashboard`                                                                    | `GET /api/admin/page-views/stats`, `/dashboard`                         | manager_like                                                                              |
| `audit_log_get`                                                                                              | `GET /api/audit/{resourceType}/{resourceId}`                            | manager_like (resourceType별 read는 라우트가 판정)                                        |

위 노출 조건은 2026-10-08 기준 라우트의 `assertPermission` 호출에서 옮겨 적었다. 활동 이미지 삭제는 `activity.delete`, 전시 이미지 삭제는 `exhibition.update`처럼 리소스마다 다르다. 이후 라우트가 바뀌면 4.4의 노출 일치 테스트가 실패해 알려준다.

**회장단** (vice_president, president)

| 도구                                                             | 호출 라우트                                                   | 노출 조건                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `generation_create` / `generation_update` / `generation_reorder` | `POST /api/generations`, `PATCH /{id}`, `POST /reorder`       | generation.create / update       |
| `member_update`                                                  | `PATCH /api/users/{id}` (역할, 기수 포함)                     | user.update                      |
| `member_bulk_role`                                               | `PATCH /api/users/bulk-role`                                  | user.update                      |
| `member_delete`                                                  | `DELETE /api/users/{id}`                                      | user.delete                      |
| `member_resource_history`                                        | `GET /api/users/{id}/resource-history`                        | leadership (회장·부회장)         |
| `site_settings_get` / `site_settings_update`                     | `GET`/`PATCH /api/site-settings`                              | site_setting.update              |
| `recruiting_plan_get` / `recruiting_plan_upsert`                 | `GET`/`PATCH /api/recruiting-plan/current` (이미지 파일 인자) | leadership (`isPrivilegedActor`) |

**회장 전용** (president)

| 도구                | 호출 라우트                    | 노출 조건         |
| ------------------- | ------------------------------ | ----------------- |
| `generation_delete` | `DELETE /api/generations/{id}` | generation.delete |
| `exhibition_delete` | `DELETE /api/exhibitions/{id}` | exhibition.delete |

**제외**: 본인 탈퇴(대시보드에 UI가 없다), 공개 사이트 전용 API(`/api/public/*`), 업로드 내부 단계(presign, multipart, settle).

### 4.3 결과와 오류 표현

- 성공하면 라우트 응답 JSON을 `structuredContent`로 돌려준다. 이와 함께 사람이 읽을 짧은 한국어 요약을 `text`로 붙인다.
- 실패하면 `isError: true`와 함께 라우트의 오류 메시지를 그대로 담는다. 메시지는 이미 한국어다. 상태 코드별 안내를 덧붙인다.
  - 401: 다시 연결 필요
  - 403: 권한 부족. 현재 역할을 함께 알려준다.
  - 404: 대상 없음
  - 409: 충돌. 예: 순서 변경 경합, 마지막 회장 보호
  - 413: 용량 초과
  - 422: 입력 오류
- 예상하지 못한 오류(500)는 Sentry에 기록하고, 사용자에게는 상관관계 ID와 일반 메시지만 보여준다.

### 4.4 노출 일치 검증

- 카탈로그의 노출 조건이 라우트 가드와 어긋나면 "보이는데 항상 403"이거나 "권한이 있는데 안 보이는" 도구가 생긴다.
- 이를 막기 위해 7개 역할 각각에 대해 테스트한다.
  1. `tools/list`에 나온 도구는 해당 라우트를 호출했을 때 정책상 403이 아니어야 한다.
  2. 목록에 없는 도구의 라우트는 403이어야 한다.
- 대상이나 본인 여부에 따라 달라지는 가드는 대표 대상(본인, 하위 서열)으로 확인한다.

## 5. 파일 업로드

### 5.1 파일 참조

파일을 받는 도구는 `file`(단일) 또는 `files`(배열) 인자로 파일 참조를 받는다. 참조는 다음 중 하나다.

1. ChatGPT 파일 객체 `{ download_url, file_id, mime_type?, file_name? }`
   - 도구 `_meta["openai/fileParams"]`에 인자 이름을 선언하면 ChatGPT가 채팅에 올라온 파일로 채운다.
   - 스키마는 Apps SDK 규칙을 따른다. 네 속성을 모두 선언하고, `download_url`과 `file_id`만 required로 둔다.
2. `{ upload_id }`: 5.3의 흐름으로 미리 올려둔 파일

### 5.2 ChatGPT 경로

- 서버가 `download_url`에서 파일을 내려받아 R2에 스트리밍한다.
- 허용 호스트는 OpenAI 파일 도메인 목록 상수로 고정한다. 구현 첫 단계에서 실제 ChatGPT 연결로 호스트를 확인해 채운다.
- 리다이렉트는 따라가지 않는다. 사설·로컬 주소는 거부한다.
- 받은 크기가 100MB를 넘으면 중단하고 객체를 지운다.

### 5.3 Claude 경로

1. `upload_prepare({ purpose, file_name, content_type, size })`를 호출한다.
   - `purpose`는 기존 presign 라우트에 대응한다.

     | purpose                                | 대응 presign                            | 권한                     | 형식   |
     | -------------------------------------- | --------------------------------------- | ------------------------ | ------ |
     | `activity_cover`, `activity_image`     | `/api/activities/presign/cover·detail`  | activity create/update   | 이미지 |
     | `activity_file`                        | `/api/activities/presign/file`          | activity create/update   | 문서   |
     | `exhibition_cover`, `exhibition_image` | `/api/exhibitions/presign/cover·detail` | exhibition create/update | 이미지 |
     | `profile_image`                        | `/api/users/presign/profile`            | 본인                     | 이미지 |
     | `recruiting_image`                     | `/api/recruiting/presign/image`         | site_setting             | 이미지 |
     | `site_file`                            | `/api/site/presign/file`                | site_setting             | 문서   |

   - 권한 검사와 MIME 검사는 `upload.policy.ts`(`assertCanCreateOrUpdate`, `isUserProfileUploadAllowed`, `assertUploadPayloadAllowed`)를 그대로 쓴다.
   - R2 용량 예약은 `reserveStorageCapacityForUpload`로 한다.
   - 응답은 다음과 같다.
     - `upload_id`
     - `put_url`: `https://api.yonyoung.moveto.kr/mcp/uploads/{token}`
     - `browser_url`: `https://yonyoung.yonsei.ac.kr/dashboard/mcp/upload/{token}`
     - `expires_at`
     - 모델에게 주는 안내문: 샌드박스에서 `curl -T`로 올리고, 실패하면 사용자에게 `browser_url`을 안내하라는 내용
   - 토큰은 무작위 256비트 값이다. 10분 동안 유효하고, 한 번만 쓸 수 있으며, 발급한 사용자와 purpose에 묶인다.
2. Claude가 코드 실행 샌드박스에서 `curl -T /mnt/user-data/uploads/<파일> <put_url>`을 실행한다.
3. `PUT /mcp/uploads/{token}` 처리 순서는 다음과 같다.
   1. 토큰 해시로 행을 찾고, 상태가 `pending`이며 만료 전인지 확인한다.
   2. `Content-Length`를 확인한다. 없으면 411, 선언 크기와 다르거나 100MB를 넘으면 400으로 거부한다. 이 단계에서 거부되면 행은 `pending`으로 남는다.
   3. 조건부 UPDATE(`WHERE status = 'pending' AND expires_at > now`)로 `pending → receiving`을 전이한다. 영향 행이 0이면 거부한다. 동시 PUT 중 이 전이를 통과하는 요청은 하나뿐이다.
   4. 본문을 R2 바인딩에 직접 스트리밍한다.
   5. 형식을 검증한다(5.4).
   6. 저장이 끝나면 `receiving → completed`로 바꾸고 용량 예약을 정산한다.
   - 3단계 이후(스트리밍, 형식 검증, 저장)에 실패하면 `receiving → failed`로 바꾸고, 객체를 지우고, 예약을 해제한다. 전이 이후의 모든 실패 경로는 `failed`로 끝나므로 `receiving` 행이 남지 않는다.
   - 이 요청에는 Bearer 토큰이 필요 없다. URL의 업로드 토큰이 자격 증명이다.
4. `curl`이 실패하면 Claude가 사용자에게 `browser_url`을 안내한다.
   - 이 페이지는 로그인한 토큰 소유자만 열 수 있다. 끌어다 놓기와 진행률을 보여준다.
   - 페이지는 같은 `put_url`로 직접 PUT한다. API는 이 경로에 한해 웹 오리진의 CORS를 허용한다.
   - Claude는 `upload_status(upload_id)`로 완료를 확인한다.
5. 완료된 `upload_id`를 콘텐츠 도구(`activity_images_add` 등)에 넘긴다. 서버는 다음을 확인한다.
   - 소유자가 같고 purpose가 도구와 맞는다.
   - 상태가 `completed`다.

   확인이 끝나면 `publicUrl`(그리고 이미지면 width/height)을 기존 라우트 요청에 넣는다. 사용한 업로드는 `consumed`로 표시해 다시 쓸 수 없게 한다.

### 5.4 검증과 정리

- 실제 크기가 선언 크기와 다르면 거부하고 객체를 지운다.
- MIME 허용 목록은 기존 `ALLOWED_*_CONTENT_TYPES`를 쓴다. 파일 앞부분의 매직 바이트가 선언 MIME과 맞아야 한다.
- 이미지는 헤더에서 가로·세로 픽셀을 읽는다(PNG, JPEG, WebP, GIF, AVIF, HEIC 중 허용 목록에 있는 형식). 읽지 못하면 width/height 없이 진행한다. 기존 필드는 선택 값이다.
- 만료된 `pending` 행과 `failed` 행은 예약을 해제한다. R2에 남은 객체는 기존 고아 객체 정리 크론(`orphan-sweep.ts`)이 치운다.
- MCP 업로드 한도는 파일당 100MB다. 넘으면 대시보드에서 올리라고 안내한다. 대시보드 자체의 1GB 한도는 바꾸지 않는다.

### 5.5 `mcp_uploads` 테이블 (D1)

| 컬럼                                          | 설명                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                                          | upload_id (UUID)                                                                                      |
| `token_hash`                                  | 업로드 토큰의 SHA-256 (unique)                                                                        |
| `user_id`                                     | 발급한 사용자                                                                                         |
| `purpose`                                     | 5.3 표의 값                                                                                           |
| `file_name`, `content_type`, `declared_size`  | 선언값                                                                                                |
| `object_key`, `public_url`, `width`, `height` | 완료 후 채움                                                                                          |
| `reservation_id`                              | 용량 예약 ID                                                                                          |
| `status`                                      | `pending` → `receiving` → `completed` → `consumed`, 실패 시 `failed`. 만료는 `expires_at`로 판단한다. |
| `expires_at`, `created_at`, `completed_at`    | 시각                                                                                                  |

`receiving`은 동시 PUT 중 하나만 통과시키는 상태다.

## 6. 설치 안내 페이지 `/dashboard/mcp`

- 접근 대상: 부원 이상. 사이드바에 "AI 연결" 메뉴를 추가한다.
- `dashboard-navigation.ts`의 기수 경로 제외 목록(`settings`, `profile`)에 `mcp`를 추가한다. 그래야 `[generationName]` 경로로 해석되지 않는다.

구성:

1. **커넥터 URL**: `https://api.yonyoung.moveto.kr/mcp`와 복사 버튼
2. **Claude에 연결**: 웹·데스크톱 / 모바일 탭
   - 설정 → 커넥터 → 사용자 지정 커넥터 추가 → URL 붙여넣기 → 연영 로그인 → 허용
   - 이용 가능한 요금제와 Team·Enterprise 관리자 승인 필요 여부를 안내한다.
3. **Claude에서 파일 올리기 설정**: 코드 실행을 켜고 네트워크 허용 도메인에 `api.yonyoung.moveto.kr`를 추가하는 방법. 설정하지 않으면 일회용 업로드 링크로 대신 올리게 된다는 설명도 붙인다.
4. **ChatGPT에 연결**: 개발자 모드 켜기 → 앱(커넥터) 만들기 → URL 입력 → OAuth 로그인. 이용 가능한 요금제를 안내한다.
5. **내 역할로 쓸 수 있는 도구**
   - `GET /api/mcp/tools`가 현재 사용자 역할로 거른 카탈로그와 커넥터 URL을 준다. 웹은 이를 그대로 그린다.
6. **연결된 앱**
   - 내가 허용한 OAuth 클라이언트의 이름, 연결일, 마지막 사용일을 보여준다.
   - **연결 해제** 버튼은 해당 클라이언트의 동의와 토큰을 폐기한다. Better Auth의 consent API를 API 라우트로 감싸 웹 서버 액션에서 호출한다.
7. **문제 해결**: 승인 대기 계정, "권한 없음" 메시지, 업로드 실패, 다시 연결하기

요금제와 메뉴 경로처럼 외부 제품에 따라 바뀌는 문구는 구현할 때 공식 도움말을 다시 확인해 쓴다. 페이지 하단에 "확인한 날짜"를 표시한다.

함께 만드는 웹 화면:

- `/auth/mcp-consent` (3.2)
- `/dashboard/mcp/upload/[token]` (5.3)

## 7. 코드 배치

```text
packages/contracts/src/mcp/
  tool-catalog.ts          도구 이름·설명·분류·노출 조건·힌트 (런타임 중립)
  upload-purpose.ts        purpose 값과 형식 분류

apps/api/src/features/mcp/
  mcp.routes.ts            /mcp, /.well-known/oauth-protected-resource, /mcp/uploads/{token}
  mcp-server.ts            Actor → 노출 도구 필터 → McpServer 생성
  internal-request.ts      MCP_ACTOR를 실어 app.request() 호출, 오류 → 도구 결과 변환
  tools/                   분류별 도구 핸들러 (generations, activities, exhibitions,
                           linktree, attachments, members, settings, stats, profile, uploads)
  files/
    file-ref.ts            파일 참조 해석 (ChatGPT 객체 | upload_id)
    chatgpt-download.ts    허용 호스트 다운로드
    file-sniff.ts          매직 바이트, 이미지 크기
    mcp-upload.repository.ts
apps/api/src/lib/auth/session.ts   loadActorByUserId 분리
apps/api/src/lib/auth.ts           jwt, mcp 플러그인
apps/api/drizzle/                  OAuth 테이블, mcp_uploads 마이그레이션

apps/web/app/(dashboard)/auth/mcp-consent/page.tsx
apps/web/app/(dashboard)/dashboard/mcp/page.tsx
apps/web/app/(dashboard)/dashboard/mcp/upload/[token]/page.tsx
apps/web/features/mcp/              안내 페이지 컴포넌트, 연결된 앱 서버 액션
```

- 새 의존성은 `@modelcontextprotocol/server`, `@better-auth/mcp`다. 모두 API에만 추가한다.
- 버전은 구현 시점의 latest로 고정한다. Better Auth 1.7.7과 호환되는 버전을 확인한다.
- `tooling/check-boundaries.mjs` 규칙을 지킨다. 웹은 `@yonyoung/contracts/mcp`만 import하고, API 구현 파일은 import하지 않는다.

## 8. 테스트

| 대상      | 내용                                                                                                                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 노출      | 7개 역할 × `tools/list` 결과가 카탈로그와 `policy.ts`로 계산한 기대 집합과 같다. 4.4의 라우트 일치 검증도 포함한다.                                                                                                                                                          |
| 권한 위임 | MCP 경유 호출로 다음 경우에 기존 라우트와 같은 상태 코드와 메시지가 나온다: 부회장의 상위·동일 서열 수정, 마지막 회장 강등, 부원의 타인 프로필 수정, 부회장의 기수·전시 삭제                                                                                                 |
| 인증      | 토큰 없음/만료/서명 불일치/잘못된 `aud`이면 401과 `WWW-Authenticate`가 나온다. 삭제된 사용자는 401, `unverified`는 403이다. 외부 요청이 헤더나 쿼리로 Actor를 주입할 수 없다. 역할이 바뀌면 다음 요청에 바로 반영된다.                                                       |
| 업로드    | 토큰 재사용, 동시 PUT 2회, 다른 사용자의 upload_id, 만료, 선언 크기 불일치, MIME 위조, 100MB 초과, purpose 권한 부족, purpose와 도구 불일치, consumed 재사용을 검사한다. ChatGPT 경로는 비허용 호스트, 리다이렉트, 사설 IP를 검사한다. 이미지 크기 추출을 형식별로 확인한다. |
| 회귀      | 기존 API 테스트, Workers 테스트, OpenAPI 스냅샷, `auth-schema-parity` 테스트가 통과한다.                                                                                                                                                                                     |
| 웹        | 유닛: 역할별 도구 표, 내비게이션 `mcp` 경로 제외, sign-in return-to 허용 범위. Playwright: 동의 화면(허용/거절/unverified), 업로드 페이지(소유자/비소유자/만료).                                                                                                             |
| 수동      | 배포 전에 Claude와 ChatGPT에 실제로 연결해 부원 계정과 회장 계정으로 다음을 1회씩 확인한다: 목록 조회, 채팅 첨부 이미지를 활동에 추가, 삭제 확인 흐름, 연결 해제 후 401                                                                                                      |

API는 `src/tests/app-rbac.test.ts`처럼 `createApp`에 메모리 의존성을 주입하는 방식으로 테스트한다. JWT 검증은 테스트 키로 서명한 토큰을 쓴다.

## 9. 구현할 때 확인할 위험 요소

1. **프로토콜 버전**: `createMcpHandler`의 `legacy: "reject"`는 2025 프로토콜 클라이언트를 막는다. Claude와 ChatGPT가 쓰는 버전을 확인하고, 필요하면 기존 프로토콜을 허용한다.
2. **Better Auth 호환성**: `@better-auth/mcp`가 better-auth 1.7.7, Workers 런타임, D1 drizzle 어댑터에서 동작하는지 확인한다. 기존 `createAuth` 인스턴스 캐시와 baseURL 분기(`/api/auth/*`는 요청 오리진 사용)가 issuer 값을 흔들지 않는지 확인한다.
3. **번들 크기**: MCP SDK 추가 후 Worker 크기를 `pnpm deploy:dry-run`으로 확인한다.
4. **Claude 샌드박스 네트워크**: 네트워크 허용 설정이 요금제나 조직 정책으로 막히면 브라우저 링크 경로가 유일한 수단이 된다. 안내 페이지에 이 점을 명시한다.

## 10. 이번 범위에서 제외

- MCP 사용 기록 전용 감사 로그. 기존 감사 로그가 라우트 단위로 남는다.
- 도구 호출 속도 제한
- 100MB를 넘는 MCP 업로드
- 본인 탈퇴 도구
