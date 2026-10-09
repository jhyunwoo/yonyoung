# 대시보드 MCP 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연영 대시보드의 모든 기능을 역할별로 다르게 노출하는 원격 MCP 서버를 API Worker에 추가하고, Claude·ChatGPT 연결 방법을 알려주는 `/dashboard/mcp` 안내 페이지를 만든다.

**Architecture:**

- MCP 서버는 API Worker의 `POST /mcp`에 둔다. stateless `createMcpHandler`로 요청마다 서버를 만든다.
- 인증은 Better Auth에 `jwt()`와 `@better-auth/mcp`를 붙여 OAuth 2.1 서버로 쓴다. 사용자는 웹 도메인에서 Google로 로그인하고 동의한다.
- 각 도구는 기존 Hono 라우트를 같은 Worker 안에서 `app.fetch()`로 호출한다. 이때 env의 Symbol 키에 Actor를 실어 보내므로 기존 권한 가드와 감사 로그가 그대로 적용된다.
- 파일 경로는 두 가지다.
  - ChatGPT: `openai/fileParams`로 넘어온 `download_url`을 서버가 받아 R2에 저장한다.
  - Claude: `upload_prepare`가 발급한 일회용 URL로 코드 실행 샌드박스가 PUT한다. 실패하면 브라우저 업로드 페이지로 올린다.

**Tech Stack:**

- `@modelcontextprotocol/server` 2.3.1
- `@better-auth/mcp` 1.7.7 (+ `@better-auth/oauth-provider` 1.7.7), better-auth 1.7.7
- Hono + `@hono/zod-openapi`, zod 4.6.5
- Cloudflare Workers(D1, R2)
- Next.js 16
- 테스트: Vitest(API 4.1.11, web/contracts 5.0.3), `@modelcontextprotocol/client` 2.3.1(테스트 전용), Playwright

**Spec:** `docs/superpowers/specs/2026-10-08-dashboard-mcp-design.md`

이 계획은 조사 결과에 따라 스펙을 네 군데 바꾼다. 바뀐 내용은 Task 0에서 스펙 문서에 반영한다.

1. **CIMD 제외, DCR만 사용.** `@better-auth/cimd`는 전송 함수가 "DNS를 한 번만 해석하고, 특수 주소를 거부하고, 연결을 고정하라"고 요구한다. Workers의 `fetch`로는 이를 구현할 수 없다. Claude와 ChatGPT는 DCR을 지원한다.
2. **노출 조건 정정.** `apps/api/docs/permissions.md`와 실제 라우트가 다르다. 노출 조건은 실제 라우트를 따른다.
   - 대시보드 요약, 방문 통계, 감사 로그: `isManagerLikeRole`(부장 이상)
   - 멤버 활동 이력, 모집 계획: 회장단
3. **웹은 도구 목록을 API에서 받는다.** 권한 매트릭스(`policy.ts`)가 API에만 있으므로, 웹이 역할로 직접 거르지 않는다. `GET /api/mcp/tools`가 걸러진 목록을 준다. 카탈로그 정의 자체는 `@yonyoung/contracts/mcp`에 둔다.
4. **연결 해제 시 토큰 폐기와 매 요청 동의 확인.** Better Auth의 `delete-consent`는 동의 행만 지우고 리프레시 토큰을 남긴다. 따라서 직접 다음을 한다.
   - 연결 해제할 때 동의를 지우고 토큰에 `revoked`를 기록한다.
   - `/mcp` 요청마다 `(userId, clientId)` 동의가 있는지 확인한다. 동의가 없으면 이미 발급된 JWT도 즉시 막힌다.

## Global Constraints

**버전**

- 새 의존성 버전은 정확히 고정한다(캐럿 금지). 루트 README의 정책을 따른다.
  - API: `@modelcontextprotocol/server@2.3.1`, `@better-auth/mcp@1.7.7`, `@better-auth/oauth-provider@1.7.7`
  - API dev: `@modelcontextprotocol/client@2.3.1`
  - 웹: `@better-auth/oauth-provider@1.7.7`
- 설치는 루트에서 `pnpm --filter <패키지> add ...`로 한다. 앱 안에서 따로 install하지 않는다.

**인증·리소스 URL**

- MCP 리소스 URL: 프로덕션 `https://api.yonyoung.moveto.kr/mcp`, 로컬 `http://localhost:8787/mcp`. 환경 변수 `MCP_RESOURCE_URL`로 둔다.
- OAuth issuer: `${BETTER_AUTH_URL}/api/auth`(프로덕션 `https://yonyoung.yonsei.ac.kr/api/auth`). `jwt({ jwt: { issuer } })`로 고정한다.
- scope: `openid profile email offline_access mcp`. `/mcp`는 `mcp` scope를 요구한다.
- 액세스 토큰 1시간(`accessTokenExpiresIn: 3600`), 리프레시 토큰 30일(`refreshTokenExpiresIn: 2592000`).

**MCP 업로드**

- 파일당 최대 `100_000_000` bytes. 토큰 유효 시간은 10분(`600_000` ms)이고 한 번만 쓸 수 있다.
- 토큰은 무작위 32바이트 base64url이다. DB에는 SHA-256 hex만 저장한다.

**권한**

- `unverified` 사용자는 `/mcp`에서 403과 "관리자 승인 후 사용할 수 있습니다."를 받는다.
- Actor는 env의 `MCP_ACTOR` Symbol 키로만 전달한다. 헤더, 쿼리, 쿠키로 전달하지 않는다.
- 도구 노출은 UX일 뿐이다. 최종 판정은 항상 기존 라우트가 한다.

**문구·이름**

- 사용자에게 보이는 문구는 한국어로 쓴다. 역할 이름은 웹과 같게 쓴다: 회장, 부회장, 부장, 신입회원, 준회원, 정회원, 미승인.
- 도구 이름은 영어 snake_case다. 도구 설명은 한국어로 쓴다.
- 도구 입력은 다음 규칙을 따른다.
  - 경로 파라미터는 최상위 필드(`id`, `imageId`, `itemId`)로 둔다.
  - 요청 본문은 `data` 필드에 기존 API 요청 스키마를 그대로 넣는다.
  - 배열 본문은 `items` 필드에 넣는다.

**OpenAPI와 코드 스타일**

- 새 `/mcp`, `/.well-known/*`, `/api/mcp/*` 라우트는 OpenAPI에 등록하지 않는 일반 Hono 라우트로 만든다. 그래서 `openapi-contract.snapshot.test.ts`가 바뀌지 않아야 한다.
- 주석 밀도와 명명은 주변 코드를 따른다. 사용자 전역 규칙에 따라 antislop 스킬 지침을 지킨다.

**커밋**

- 모든 커밋 메시지 끝에 다음 두 줄을 붙인다.

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE
  ```

## Review Focus

각 줄의 테스트는 괄호 안의 Task에 있다.

1. **역할이 바뀐 뒤 열린 대화에서 숨겨진 도구를 호출하는 경우.** 클라이언트가 예전 `tools/list`를 기억하고 호출해도 성공하면 안 된다. "도구 없음" 오류가 나야 한다. (Task 6 `demoted actor` 테스트)
2. **연결을 해제한 뒤에도 남은 JWT로 호출하는 경우.** 즉시 401이 나야 한다. (Task 6 "동의가 해제된 연결은 거부한다", Task 10 D1 연결 저장소 테스트)
3. **`Content-Length` 없이 들어온 PUT과 ChatGPT 응답.** R2가 길이를 모르는 스트림을 받지 않으므로 411로 거절하고 안내 문구를 준다. (Task 11, Task 12)
4. **한글·공백·이모지가 들어간 파일명.** 업로드가 성공하고, 원래 이름이 그대로 저장된다. 객체 키는 기존 `sanitizeFileName` 규칙을 따른다. (Task 10 D1 저장소 테스트, Task 11 `upload_prepare` 테스트)
5. **같은 `upload_id`를 두 도구에 넘기거나 이미 쓴 것을 다시 넘기는 경우.** 두 번째는 "이미 사용한 업로드" 오류가 나야 한다. 도구 호출이 실패하면 업로드는 소비되지 않아 다시 쓸 수 있어야 한다. (Task 13)

## File Structure

```text
packages/contracts/src/
  auth-roles.ts                    (수정) CORE_ROLE_LABELS 추가
  api/mcp.ts                       (신규) 도구 카탈로그, 노출 규칙 타입, 업로드 purpose, API 응답 스키마
  package.json                     (수정) "./mcp" export
packages/contracts/tests/mcp.test.ts

apps/api/src/
  lib/auth/session.ts              (수정) loadActorByUserId 분리
  lib/auth.ts                      (수정) jwt + mcp 플러그인, disabledPaths, issuer 고정
  lib/config/runtime-env.ts        (수정) MCP_RESOURCE_URL 해석 resolveMcpRuntimeEnv
  bindings/types.ts                (수정) MCP_RESOURCE_URL 바인딩 타입
  lib/services/dependencies.ts     (수정) MCP 의존성 추가
  lib/storage/presign.ts           (수정) allocateManagedObject
  lib/services/types.ts            (수정) PresignService.allocateManagedObject 타입
  app/createApp.ts                 (수정) 내부 Actor 해석 래핑, MCP 라우트 등록
  platform/db/schema/oauth.ts      (신규) Better Auth OAuth 테이블
  platform/db/schema/mcp.ts        (신규) mcp_uploads 테이블
  platform/db/schema/index.ts      (수정) export 추가
  features/exhibitions/exhibition.contract.ts (수정) ExhibitionInputObjectSchema export
  features/mcp/
    internal-actor.ts              Actor Symbol 주입·해석
    internal-api.ts                기존 라우트를 내부 호출하는 클라이언트
    tool-result.ts                 InternalApiResult → CallToolResult
    exposure.ts                    노출 규칙 판정, 노출 도구 목록
    tool-definition.ts             defineTool, routeTool, McpToolContext
    mcp-server.ts                  Actor별 McpServer 생성
    mcp-auth.ts                    JWT 검증 + 동의 확인 인증기
    mcp-connection-store.ts        동의·토큰 조회/폐기 (D1 + 메모리)
    mcp.routes.ts                  /mcp, /.well-known/oauth-protected-resource*, /mcp/uploads/:token, /api/mcp/*
    tools/
      index.ts                     전체 도구 정의 맵
      account.tools.ts             whoami, my_profile_update, my_profile_photo_set
      generation.tools.ts
      activity.tools.ts
      exhibition.tools.ts
      linktree.tools.ts
      attachment.tools.ts
      member.tools.ts
      settings.tools.ts            site_settings_*, recruiting_plan_*
      stats.tools.ts               dashboard_overview, page_view_*, audit_log_get
      upload.tools.ts              upload_prepare, upload_status
    files/
      file-sniff.ts                매직 바이트·이미지 크기
      byte-stream.ts               앞부분 엿보기, 길이 강제 스트림
      mcp-upload-store.ts          mcp_uploads 저장소 (D1 + 메모리)
      mcp-object-store.ts          R2 쓰기 (R2 + 메모리)
      upload-purpose.ts            purpose → 경로·슬롯·형식·권한
      mcp-upload-service.ts        prepare/receive/ingest/status/resolve/consume
      chatgpt-file.ts              ChatGPT download_url 다운로드
      file-ref.ts                  파일 참조 해석 (ChatGPT 파일 | upload_id)
      file-tool.ts                 runWithFiles, withUploadErrors 등 파일 도구 공용 도우미
apps/api/src/tests/
  mcp-test-harness.ts              테스트 앱·MCP 클라이언트 헬퍼
  mcp-internal-actor.test.ts
  mcp-internal-api.test.ts
  mcp-server.test.ts
  mcp-write-tools.test.ts
  mcp-exposure.test.ts
  mcp-auth.test.ts
  mcp-file-sniff.test.ts
  mcp-upload-store.test.ts
  mcp-upload.routes.test.ts
  mcp-chatgpt-file.test.ts
  mcp-file-tools.test.ts
  mcp-web.routes.test.ts
  mcp-file-fixtures.ts             테스트용 최소 이미지·문서 바이트
  test-helpers.ts                  (수정) createTestApp overrides
  auth-schema-parity.test.ts       (수정) OAuth 테이블 검증 추가
apps/api/tests/integration/mcp-stores.runtime.test.ts
apps/api/vitest.workers.config.ts  (수정) D1 마이그레이션 바인딩
apps/api/tests/setup/cloudflare-test.d.ts (수정) applyD1Migrations 타입
apps/api/drizzle/0012_dashboard_mcp.sql (drizzle-kit 생성)
apps/api/wrangler.jsonc            (수정) MCP_RESOURCE_URL vars

apps/web/
  features/auth/client/auth-client.ts           (수정) oauthProviderClient
  app/(dashboard)/auth/sign-in/page.tsx         (수정) OAuth 진행 중이면 자동 이동 생략
  app/api/auth/[...path]/route.ts               (수정) 서버 간 OAuth 엔드포인트 동일 출처 예외
  server/security/oauth-proxy-paths.ts          (신규) 예외 경로 목록
  server/security/api-proxy-prefixes.ts         (수정) "mcp" 접두사
  app/.well-known/oauth-authorization-server/api/auth/route.ts (신규)
  app/.well-known/openid-configuration/api/auth/route.ts       (신규)
  server/http/auth-metadata-proxy.ts            (신규) 위 두 라우트 공용 프록시
  features/dashboard/services/admin-read-service.ts (수정) getMcpOverview/getMcpConnections/getMcpUploadLookup
  features/dashboard/actions/mcp.ts             (신규) 연결 해제 서버 액션
  features/mcp/mcp-tool-groups.ts               (신규) 분류별 묶기 (순수 함수)
  features/mcp/upload-check.ts                  (신규) 업로드 전 파일 크기·형식 확인
  features/auth/model/oauth-flow.ts             (신규) OAuth 인가 중인 로그인인지 판별
  app/(dashboard)/auth/mcp-consent/page.tsx     (신규)
  app/(dashboard)/auth/mcp-consent/consent-client.tsx (신규)
  app/(dashboard)/dashboard/mcp/page.tsx        (신규)
  app/(dashboard)/dashboard/mcp/mcp-guide-sections.tsx (신규)
  app/(dashboard)/dashboard/mcp/connections-client.tsx (신규)
  app/(dashboard)/dashboard/mcp/copy-url-button.tsx    (신규)
  app/(dashboard)/dashboard/mcp/upload/[token]/page.tsx (신규)
  app/(dashboard)/dashboard/mcp/upload/[token]/upload-client.tsx (신규)
  app/(dashboard)/_components/shell/dashboard-navigation.ts (수정) "AI 연결" 메뉴, mcp 경로 제외
  tests/unit/...                                (신규 테스트들)
  tests/e2e/mcp.spec.ts, mock-api/mcp-handlers.ts (신규), mock-api/server.ts (수정)
  package.json                                  (수정) @better-auth/oauth-provider@1.7.7

docs/
  superpowers/specs/2026-10-08-dashboard-mcp-design.md (수정, Task 0)
  apps/api/docs/permissions.md                  (수정, Task 19)
  docs/deployment-and-cutover.md                (수정, Task 19)
```

---

## 1단계: 기반

### Task 0: 스펙에 조사 결과 반영

**Files:**

- Modify: `docs/superpowers/specs/2026-10-08-dashboard-mcp-design.md`

- [ ] **Step 1: 3.1절의 CIMD를 DCR 전용으로 바꾼다**

3.1절의 `cimd(...)` 항목과 "DCR과 CIMD를 모두 켜는 이유" 문단을 다음으로 바꾼다.

```markdown
- `disabledPaths: ["/token"]`: jwt 플러그인의 `/token`이 OAuth 토큰 엔드포인트와 겹치므로 끈다(Better Auth 문서 권장).
- 클라이언트 등록은 DCR만 켠다. `@better-auth/cimd`는 DNS 고정을 보장하는 전송 함수를 요구하는데 Workers `fetch`로는 만들 수 없어 제외한다. Claude와 ChatGPT는 DCR을 지원한다.
- `jwt({ jwt: { issuer: "<BETTER_AUTH_URL>/api/auth" } })`로 issuer를 고정한다. 기본값은 요청 호스트에 따라 바뀌는 baseURL이다.
```

- [ ] **Step 2: 3.3절에 동의 확인을 추가한다**

3.3절 1번 항목 다음에 아래를 넣는다.

```markdown
1-1. 검증된 토큰의 `(sub, azp)`에 대한 `oauthConsent` 행이 있는지 확인한다. 없으면 401이다. Better Auth의 `delete-consent`는 리프레시 토큰을 남기므로, 연결 해제는 우리 코드가 동의 삭제와 토큰 `revoked` 기록을 함께 한다(6장).
```

- [ ] **Step 3: 4.2절 표의 노출 조건을 실제 라우트에 맞춘다**

| 도구                                                                            | 바꿀 노출 조건                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `member_resource_history`                                                       | `leadership` (회장·부회장, `canReadAllUsers`)                          |
| `dashboard_overview`, `page_view_stats`, `page_view_dashboard`, `audit_log_get` | `manager_like` (부장 이상, `isManagerLikeRole`)                        |
| `recruiting_plan_get`, `recruiting_plan_upsert`                                 | `leadership` (`isPrivilegedActor`)                                     |
| `attachment_list`                                                               | `activity.read` 또는 `site_setting.read`                               |
| `attachment_create/update/delete`                                               | `activity`나 `site_setting`의 create 또는 update (`canCreateOrUpdate`) |
| `activity_image_delete`                                                         | `activity.delete`                                                      |
| `exhibition_image_delete`                                                       | `exhibition.update`                                                    |
| `linktree_item_delete`                                                          | `linktree.delete`                                                      |

이 네 도구(`dashboard_overview`, `page_view_*`, `audit_log_get`)는 "부원 이상" 표에서 "운영진 이상" 표로 옮긴다.

4.1절에 노출 조건 종류를 적는다: `verified`, `manager_like`, `leadership`, `permission(anyOf)`.

- [ ] **Step 4: 6장의 도구 표 출처를 바꾼다**

6장 5번 항목을 다음으로 바꾼다.

"`GET /api/mcp/tools`가 현재 사용자 역할로 거른 카탈로그와 커넥터 URL을 준다. 웹은 이를 그대로 그린다."

- [ ] **Step 5: 5.5절 상태 값을 바꾼다**

`status` 행을 다음으로 바꾼다.

"`pending` → `receiving` → `completed` → `consumed`, 실패 시 `failed`. 만료는 `expires_at`로 판단한다."

`receiving`은 동시 PUT 중 하나만 통과시키는 상태다.

- [ ] **Step 6: 커밋**

```bash
git add docs/superpowers/specs/2026-10-08-dashboard-mcp-design.md
git commit -m "docs: align MCP spec with verified route guards and auth constraints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 1: 공용 계약 — 역할 이름, 도구 카탈로그, 업로드 purpose

**Files:**

- Modify: `packages/contracts/src/auth-roles.ts`
- Create: `packages/contracts/src/api/mcp.ts`
- Modify: `packages/contracts/package.json` (`exports`에 `"./mcp": "./src/api/mcp.ts"`)
- Test: `packages/contracts/tests/mcp.test.ts`

**Interfaces:**

- Produces:
  - `CORE_ROLE_LABELS: Record<CoreRole, string>`
  - `MCP_TOOL_CATALOG`, `type McpToolName`, `type McpToolCatalogEntry`, `type McpToolExposure`, `type McpToolCategory`
  - `MCP_TOOL_CATEGORY_LABELS`
  - `MCP_UPLOAD_PURPOSES`, `type McpUploadPurpose`, `MCP_UPLOAD_MAX_BYTES`, `MCP_UPLOAD_TTL_MS`
  - `MCP_UPLOAD_STATUSES`, `type McpUploadStatus`
  - zod 스키마와 타입: `apiMcpToolSummarySchema`, `apiMcpOverviewSchema`(`ApiMcpOverview`), `apiMcpConnectionSchema`(`ApiMcpConnection`), `apiMcpUploadLookupSchema`(`ApiMcpUploadLookup`), `apiMcpConsentContextSchema`(`ApiMcpConsentContext`)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`packages/contracts/tests/mcp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CORE_ROLE_LABELS, CORE_ROLE_VALUES } from "../src/auth-roles";
import {
  MCP_TOOL_CATALOG,
  MCP_TOOL_CATEGORY_LABELS,
  MCP_UPLOAD_MAX_BYTES,
  apiMcpOverviewSchema,
} from "../src/api/mcp";

describe("MCP 도구 카탈로그", () => {
  it("도구 이름은 고유한 snake_case다", () => {
    const names = MCP_TOOL_CATALOG.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("스펙의 도구 56개를 모두 담는다", () => {
    expect(MCP_TOOL_CATALOG).toHaveLength(56);
  });

  it("파괴적 도구는 읽기 전용일 수 없다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      if (tool.destructive) {
        expect(tool.readOnly, tool.name).toBe(false);
      }
    }
  });

  it("모든 분류에 한국어 이름이 있고 설명·예시가 비어 있지 않다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      expect(MCP_TOOL_CATEGORY_LABELS[tool.category], tool.name).toBeTruthy();
      expect(tool.description.length, tool.name).toBeGreaterThan(10);
      expect(tool.examplePrompt.length, tool.name).toBeGreaterThan(3);
    }
  });

  it("permission 노출은 권한을 하나 이상 가진다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      if (tool.exposure.kind === "permission") {
        expect(tool.exposure.anyOf.length, tool.name).toBeGreaterThan(0);
      }
    }
  });

  it("파일 인자를 가진 도구 목록이 고정되어 있다", () => {
    const fileTools = MCP_TOOL_CATALOG.filter(
      (tool) => tool.fileArgs.length > 0,
    )
      .map((tool) => tool.name)
      .sort();
    expect(fileTools).toEqual([
      "activity_create",
      "activity_images_add",
      "activity_update",
      "attachment_create",
      "exhibition_create",
      "exhibition_images_add",
      "exhibition_update",
      "my_profile_photo_set",
      "recruiting_plan_upsert",
    ]);
  });
});

describe("역할 이름", () => {
  it("모든 역할에 웹과 같은 한국어 이름이 있다", () => {
    for (const role of CORE_ROLE_VALUES) {
      expect(CORE_ROLE_LABELS[role]).toBeTruthy();
    }
    expect(CORE_ROLE_LABELS.manager).toBe("부장");
  });
});

describe("MCP 응답 스키마", () => {
  it("overview를 파싱한다", () => {
    const parsed = apiMcpOverviewSchema.parse({
      serverUrl: "https://api.yonyoung.moveto.kr/mcp",
      role: "manager",
      tools: [
        {
          name: "activity_list",
          title: "활동 목록",
          description: "활동 목록을 조회합니다.",
          category: "activities",
          readOnly: true,
          destructive: false,
          examplePrompt: "25기 활동 목록 보여줘",
        },
      ],
    });
    expect(parsed.tools[0]?.name).toBe("activity_list");
  });

  it("업로드 한도는 100MB(10진)다", () => {
    expect(MCP_UPLOAD_MAX_BYTES).toBe(100_000_000);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/contracts exec vitest run tests/mcp.test.ts`
Expected: FAIL — `Cannot find module '../src/api/mcp'`

- [ ] **Step 3: 역할 이름을 추가한다**

`packages/contracts/src/auth-roles.ts`의 `CoreRole` 타입 정의 바로 아래에 추가한다.

```ts
/** 화면 표시용 역할 이름. 웹 `buildMemberRoleLabel`과 같은 값을 쓴다. */
export const CORE_ROLE_LABELS: Record<CoreRole, string> = {
  president: "회장",
  vice_president: "부회장",
  manager: "부장",
  new_member: "신입회원",
  associate_member: "준회원",
  regular_member: "정회원",
  unverified: "미승인",
};
```

- [ ] **Step 4: 카탈로그를 만든다**

`packages/contracts/src/api/mcp.ts`:

```ts
import { z } from "zod";

export const MCP_POLICY_RESOURCES = [
  "generation",
  "activity",
  "exhibition",
  "linktree",
  "user",
  "site_setting",
] as const;
export type McpPolicyResource = (typeof MCP_POLICY_RESOURCES)[number];

export const MCP_POLICY_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
] as const;
export type McpPolicyAction = (typeof MCP_POLICY_ACTIONS)[number];

export type McpPermission = {
  readonly resource: McpPolicyResource;
  readonly action: McpPolicyAction;
};

/**
 * 도구 노출 조건. 도구가 호출하는 라우트의 실제 가드와 같아야 한다.
 * API의 mcp-exposure 테스트가 라우트를 직접 호출해 어긋남을 잡는다.
 */
export type McpToolExposure =
  | { readonly kind: "verified" }
  | { readonly kind: "manager_like" }
  | { readonly kind: "leadership" }
  | { readonly kind: "permission"; readonly anyOf: readonly McpPermission[] };

export const MCP_TOOL_CATEGORIES = [
  "account",
  "uploads",
  "generations",
  "activities",
  "exhibitions",
  "linktree",
  "attachments",
  "members",
  "settings",
  "stats",
] as const;
export type McpToolCategory = (typeof MCP_TOOL_CATEGORIES)[number];

export const MCP_TOOL_CATEGORY_LABELS: Record<McpToolCategory, string> = {
  account: "내 계정",
  uploads: "파일 업로드",
  generations: "기수",
  activities: "활동",
  exhibitions: "전시",
  linktree: "링크 모음",
  attachments: "첨부 자료",
  members: "멤버",
  settings: "사이트 설정",
  stats: "통계·기록",
};

export type McpToolCatalogEntry = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly category: McpToolCategory;
  readonly exposure: McpToolExposure;
  readonly readOnly: boolean;
  readonly destructive: boolean;
  readonly examplePrompt: string;
  /** ChatGPT `openai/fileParams`로 선언할 최상위 인자 이름 */
  readonly fileArgs: readonly string[];
};

const verified = { kind: "verified" } as const;
const managerLike = { kind: "manager_like" } as const;
const leadership = { kind: "leadership" } as const;
const can = (
  ...permissions: ReadonlyArray<readonly [McpPolicyResource, McpPolicyAction]>
): McpToolExposure => ({
  kind: "permission",
  anyOf: permissions.map(([resource, action]) => ({ resource, action })),
});

const CLAUDE_FILE_HINT =
  "Claude에서는 먼저 upload_prepare로 파일을 올리고 받은 upload_id를 넣습니다. ChatGPT에서는 채팅에 올린 파일이 자동으로 들어갑니다.";

export const MCP_TOOL_CATALOG = [
  // 내 계정
  {
    name: "whoami",
    title: "내 정보 확인",
    description:
      "현재 연결된 연영 계정의 이름, 역할, 이 연결에서 쓸 수 있는 도구 목록을 돌려줍니다. 무엇을 할 수 있는지 모를 때 먼저 호출하세요.",
    category: "account",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "연영 MCP로 내가 뭘 할 수 있어?",
    fileArgs: [],
  },
  {
    name: "my_profile_update",
    title: "내 프로필 수정",
    description:
      "내 프로필의 성·이름, 단과대학, 학과, 학번, 연락처, 협업 가능 여부, 개인 링크를 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "account",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "내 학과를 시각디자인학과로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "my_profile_photo_set",
    title: "프로필 사진 변경",
    description: `채팅에 올린 이미지로 내 프로필 사진을 바꿉니다. ${CLAUDE_FILE_HINT} (purpose=profile_image)`,
    category: "account",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 내 프로필 사진으로 해줘",
    fileArgs: ["file"],
  },
  // 파일 업로드
  {
    name: "upload_prepare",
    title: "파일 업로드 준비",
    description:
      "Claude에서 채팅에 첨부한 파일을 연영에 올릴 때 먼저 호출합니다. 돌려받은 put_url로 코드 실행 환경에서 `curl -sS -T <파일 경로> <put_url>`을 실행하세요. 실패하면 사용자에게 browser_url을 열어 같은 파일을 올리도록 안내하고 upload_status로 완료를 확인합니다. 완료된 upload_id를 파일을 받는 도구에 넘깁니다. ChatGPT에서는 쓰지 않습니다.",
    category: "uploads",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진들을 25기 출사 활동에 올려줘",
    fileArgs: [],
  },
  {
    name: "upload_status",
    title: "업로드 상태 확인",
    description:
      "upload_prepare로 만든 업로드가 끝났는지 확인합니다. status가 completed면 upload_id를 쓸 수 있습니다.",
    category: "uploads",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "방금 올린 파일 업로드 끝났어?",
    fileArgs: [],
  },
  // 기수
  {
    name: "generation_list",
    title: "기수 목록",
    description:
      "모든 기수를 표시 순서대로 조회합니다. 다른 도구에 넘길 기수 ID를 찾을 때 씁니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "기수 목록 보여줘",
    fileArgs: [],
  },
  {
    name: "generation_get",
    title: "기수 상세",
    description: "기수 하나의 이름, 순서, 활동 기간을 조회합니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 기간이 언제야?",
    fileArgs: [],
  },
  {
    name: "generation_members",
    title: "기수 멤버",
    description: "기수에 속한 멤버 목록을 조회합니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 멤버 알려줘",
    fileArgs: [],
  },
  {
    name: "generation_create",
    title: "기수 만들기",
    description:
      "새 기수를 만듭니다. data에 이름, 표시 순서, 시작일, 종료일을 넣습니다.",
    category: "generations",
    exposure: can(["generation", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "26기를 2027년 3월 1일부터 2028년 2월 말까지로 만들어줘",
    fileArgs: [],
  },
  {
    name: "generation_update",
    title: "기수 수정",
    description:
      "기수 이름, 표시 순서, 기간을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "generations",
    exposure: can(["generation", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "26기 종료일을 2028년 3월 1일로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "generation_reorder",
    title: "기수 순서 바꾸기",
    description: "두 기수의 표시 순서를 서로 바꿉니다.",
    category: "generations",
    exposure: can(["generation", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "25기와 26기 순서를 바꿔줘",
    fileArgs: [],
  },
  {
    name: "generation_delete",
    title: "기수 삭제",
    description:
      "기수를 삭제합니다. 회장만 할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "generations",
    exposure: can(["generation", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "테스트로 만든 99기를 삭제해줘",
    fileArgs: [],
  },
  // 활동
  {
    name: "activity_list",
    title: "활동 목록",
    description:
      "활동 목록을 조회합니다. generationId를 넣으면 그 기수의 활동만 봅니다.",
    category: "activities",
    exposure: can(["activity", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 활동 목록 보여줘",
    fileArgs: [],
  },
  {
    name: "activity_get",
    title: "활동 상세",
    description:
      "활동 하나의 내용과 세부 이미지 목록(이미지 ID, 순서 포함)을 조회합니다.",
    category: "activities",
    exposure: can(["activity", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "봄 출사 활동 내용 보여줘",
    fileArgs: [],
  },
  {
    name: "activity_create",
    title: "활동 만들기",
    description: `새 활동을 만듭니다. 커버 이미지는 data.coverImageUrl 대신 채팅에 올린 파일(cover_file 또는 cover_upload_id)로 지정할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose=activity_cover)`,
    category: "activities",
    exposure: can(["activity", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 커버로 25기 봄 출사 활동을 만들어줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "activity_update",
    title: "활동 수정",
    description: `활동 제목, 설명, 기간, 커버 이미지를 수정합니다. data에 바꿀 필드만 넣습니다. 커버를 채팅 파일로 바꾸려면 cover_file 또는 cover_upload_id를 씁니다. ${CLAUDE_FILE_HINT} (purpose=activity_cover)`,
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "봄 출사 활동 설명을 이렇게 바꿔줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "activity_delete",
    title: "활동 삭제",
    description: "활동을 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "activities",
    exposure: can(["activity", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "잘못 만든 활동을 지워줘",
    fileArgs: [],
  },
  {
    name: "activity_images_add",
    title: "활동 사진 추가",
    description: `채팅에 올린 사진들을 활동 세부 이미지로 추가합니다. 한 번에 최대 500장입니다. ${CLAUDE_FILE_HINT} (purpose=activity_image)`,
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진들을 봄 출사 활동에 추가해줘",
    fileArgs: ["files"],
  },
  {
    name: "activity_image_update",
    title: "활동 사진 순서 수정",
    description: "활동 세부 이미지 하나의 표시 순서를 바꿉니다.",
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 맨 앞으로 옮겨줘",
    fileArgs: [],
  },
  {
    name: "activity_images_update",
    title: "활동 사진 여러 장 수정",
    description:
      "활동 세부 이미지 여러 장의 표시 순서를 한 번에 바꿉니다. items에 imageId와 sortOrder를 넣습니다.",
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "사진 순서를 촬영 시간순으로 다시 정렬해줘",
    fileArgs: [],
  },
  {
    name: "activity_image_delete",
    title: "활동 사진 삭제",
    description:
      "활동 세부 이미지 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "activities",
    exposure: can(["activity", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "흔들린 사진 한 장을 지워줘",
    fileArgs: [],
  },
  // 전시
  {
    name: "exhibition_list",
    title: "전시 목록",
    description:
      "전시 목록을 조회합니다. generationId를 넣으면 그 기수의 전시만 봅니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "올해 전시 목록 보여줘",
    fileArgs: [],
  },
  {
    name: "exhibition_get",
    title: "전시 상세",
    description:
      "전시 하나의 내용과 세부 이미지 목록(이미지 ID, 순서 포함)을 조회합니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "가을 정기전 정보 보여줘",
    fileArgs: [],
  },
  {
    name: "exhibition_create",
    title: "전시 만들기",
    description: `새 전시를 만듭니다. 커버 이미지는 data.coverImageUrl 대신 채팅에 올린 파일(cover_file 또는 cover_upload_id)로 지정할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_cover)`,
    category: "exhibitions",
    exposure: can(["exhibition", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 포스터로 가을 정기전을 등록해줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "exhibition_update",
    title: "전시 수정",
    description: `전시 제목, 장소, 기간, 설명, 커버 이미지를 수정합니다. data에 바꿀 필드만 넣습니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_cover)`,
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "정기전 장소를 학생회관 갤러리로 바꿔줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "exhibition_delete",
    title: "전시 삭제",
    description:
      "전시를 삭제합니다. 회장만 할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "exhibitions",
    exposure: can(["exhibition", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "취소된 전시를 삭제해줘",
    fileArgs: [],
  },
  {
    name: "exhibition_images_add",
    title: "전시 사진 추가",
    description: `채팅에 올린 사진들을 전시 세부 이미지로 추가합니다. 한 번에 최대 500장입니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_image)`,
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 작품 사진들을 정기전에 추가해줘",
    fileArgs: ["files"],
  },
  {
    name: "exhibition_image_update",
    title: "전시 사진 순서 수정",
    description: "전시 세부 이미지 하나의 표시 순서를 바꿉니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 작품을 두 번째로 옮겨줘",
    fileArgs: [],
  },
  {
    name: "exhibition_images_update",
    title: "전시 사진 여러 장 수정",
    description:
      "전시 세부 이미지 여러 장의 표시 순서를 한 번에 바꿉니다. items에 imageId와 sortOrder를 넣습니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "작가 이름순으로 사진을 정렬해줘",
    fileArgs: [],
  },
  {
    name: "exhibition_image_delete",
    title: "전시 사진 삭제",
    description:
      "전시 세부 이미지 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "중복으로 올라간 사진을 지워줘",
    fileArgs: [],
  },
  // 링크 모음
  {
    name: "linktree_list",
    title: "링크 모음 목록",
    description: "링크 모음과 그 안의 링크들을 조회합니다.",
    category: "linktree",
    exposure: can(["linktree", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "링크 모음 보여줘",
    fileArgs: [],
  },
  {
    name: "linktree_get",
    title: "링크 모음 상세",
    description: "링크 모음 하나와 그 안의 링크들을 조회합니다.",
    category: "linktree",
    exposure: can(["linktree", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "모집 링크 모음에 뭐가 있어?",
    fileArgs: [],
  },
  {
    name: "linktree_create",
    title: "링크 모음 만들기",
    description: "새 링크 모음을 만듭니다.",
    category: "linktree",
    exposure: can(["linktree", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "'2027 모집' 링크 모음을 만들어줘",
    fileArgs: [],
  },
  {
    name: "linktree_update",
    title: "링크 모음 이름 변경",
    description: "링크 모음 이름을 바꿉니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "링크 모음 이름을 '공식 링크'로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "linktree_delete",
    title: "링크 모음 삭제",
    description:
      "링크 모음과 그 안의 링크를 모두 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "linktree",
    exposure: can(["linktree", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "지난 모집 링크 모음을 지워줘",
    fileArgs: [],
  },
  {
    name: "linktree_item_add",
    title: "링크 추가",
    description: "링크 모음에 링크를 추가합니다. data에 이름과 URL을 넣습니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "공식 링크에 인스타그램 주소를 추가해줘",
    fileArgs: [],
  },
  {
    name: "linktree_item_update",
    title: "링크 수정",
    description: "링크 이름이나 URL을 바꿉니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "오픈채팅 링크를 새 주소로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "linktree_item_delete",
    title: "링크 삭제",
    description: "링크 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "linktree",
    exposure: can(["linktree", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "만료된 신청서 링크를 지워줘",
    fileArgs: [],
  },
  // 첨부 자료
  {
    name: "attachment_list",
    title: "첨부 자료 목록",
    description:
      "활동 자료(scope=activity, resourceId=활동 ID) 또는 후원 회계 자료(scope=site_donate)를 조회합니다.",
    category: "attachments",
    exposure: can(["activity", "read"], ["site_setting", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "후원 회계 자료 목록 보여줘",
    fileArgs: [],
  },
  {
    name: "attachment_create",
    title: "첨부 자료 등록",
    description: `문서 파일(pdf, xlsx, xls, docx, hwp, hwpx, zip) 또는 외부 링크(data.linkUrl)를 자료로 등록합니다. 파일과 링크 중 하나만 넣습니다. 후원 회계 자료(site_donate)는 회장단만 등록할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose: activity 자료는 activity_file, 후원 자료는 site_file)`,
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 정산 엑셀을 후원 회계 자료로 올려줘",
    fileArgs: ["file"],
  },
  {
    name: "attachment_update",
    title: "첨부 자료 수정",
    description: "자료 제목이나 표시 순서를 바꿉니다.",
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: false,
    examplePrompt: "자료 제목을 '2026 상반기 정산'으로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "attachment_delete",
    title: "첨부 자료 삭제",
    description: "자료 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: true,
    examplePrompt: "잘못 올린 자료를 지워줘",
    fileArgs: [],
  },
  // 멤버
  {
    name: "member_list",
    title: "멤버 목록",
    description:
      "멤버 목록을 조회합니다. 회장단은 전체, 부장은 같은 기수 멤버, 부원은 본인만 보입니다.",
    category: "members",
    exposure: can(["user", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "승인 대기 중인 멤버 있어?",
    fileArgs: [],
  },
  {
    name: "member_get",
    title: "멤버 상세",
    description:
      "멤버 한 명의 프로필을 조회합니다. 볼 수 있는 범위는 member_list와 같습니다.",
    category: "members",
    exposure: can(["user", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "김연영 멤버 연락처 알려줘",
    fileArgs: [],
  },
  {
    name: "member_resource_history",
    title: "멤버 작업 이력",
    description: "멤버가 만들거나 수정한 콘텐츠 이력을 조회합니다.",
    category: "members",
    exposure: leadership,
    readOnly: true,
    destructive: false,
    examplePrompt: "이 멤버가 최근에 뭘 수정했어?",
    fileArgs: [],
  },
  {
    name: "member_update",
    title: "멤버 정보 수정",
    description:
      "멤버의 프로필, 역할, 기수를 수정합니다. 나보다 서열이 같거나 높은 사람은 수정할 수 없고, 마지막 회장은 강등할 수 없습니다. 역할을 바꾸기 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "이 멤버를 정회원으로 승인해줘",
    fileArgs: [],
  },
  {
    name: "member_bulk_role",
    title: "역할 일괄 변경",
    description:
      "여러 멤버의 역할을 한 번에 바꿉니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "25기 신입회원을 모두 정회원으로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "member_delete",
    title: "멤버 삭제",
    description:
      "멤버를 삭제합니다. 나보다 서열이 낮은 멤버만 삭제할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "탈퇴 요청한 멤버를 삭제해줘",
    fileArgs: [],
  },
  // 사이트 설정
  {
    name: "site_settings_get",
    title: "사이트 설정 조회",
    description:
      "푸터 연락처, 인스타그램, 후원 계좌 같은 사이트 기본 설정을 조회합니다.",
    category: "settings",
    exposure: can(["site_setting", "update"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "지금 후원 계좌 정보 뭐로 돼 있어?",
    fileArgs: [],
  },
  {
    name: "site_settings_update",
    title: "사이트 설정 수정",
    description: "사이트 기본 설정을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "settings",
    exposure: can(["site_setting", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "푸터 이메일을 새 주소로 바꿔줘",
    fileArgs: [],
  },
  {
    name: "recruiting_plan_get",
    title: "모집 계획 조회",
    description:
      "올해 모집 계획(제목, 내용, 홍보 이미지, 모집 기간)을 조회합니다.",
    category: "settings",
    exposure: leadership,
    readOnly: true,
    destructive: false,
    examplePrompt: "올해 모집 기간 언제로 돼 있어?",
    fileArgs: [],
  },
  {
    name: "recruiting_plan_upsert",
    title: "모집 계획 저장",
    description: `올해 모집 계획을 저장합니다. data.promotionImageUrls는 유지할 기존 이미지 URL 목록입니다. 새 홍보 이미지는 promotion_files 또는 promotion_upload_ids로 넣으면 뒤에 붙습니다. ${CLAUDE_FILE_HINT} (purpose=recruiting_image)`,
    category: "settings",
    exposure: leadership,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 포스터로 2027 모집 공고를 올려줘",
    fileArgs: ["promotion_files"],
  },
  // 통계·기록
  {
    name: "dashboard_overview",
    title: "대시보드 요약",
    description:
      "멤버 수, 승인 대기 수, 기수별 활동·전시 수, 저장공간 사용량을 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "저장공간 얼마나 남았어?",
    fileArgs: [],
  },
  {
    name: "page_view_stats",
    title: "방문 통계",
    description: "홈페이지 방문 통계(페이지별 합계)를 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "어떤 페이지 방문이 제일 많아?",
    fileArgs: [],
  },
  {
    name: "page_view_dashboard",
    title: "방문 추이",
    description: "오늘·이번 주 방문 수와 일별 추이를 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "이번 주 방문자 수 어때?",
    fileArgs: [],
  },
  {
    name: "audit_log_get",
    title: "변경 기록 조회",
    description:
      "콘텐츠 하나의 변경 기록(누가, 언제, 어떤 필드를)을 조회합니다. resourceType과 resourceId를 넣습니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "이 활동 누가 마지막으로 수정했어?",
    fileArgs: [],
  },
] as const satisfies readonly McpToolCatalogEntry[];

export type McpToolName = (typeof MCP_TOOL_CATALOG)[number]["name"];

export const MCP_UPLOAD_PURPOSES = [
  "activity_cover",
  "activity_image",
  "activity_file",
  "exhibition_cover",
  "exhibition_image",
  "profile_image",
  "recruiting_image",
  "site_file",
] as const;
export type McpUploadPurpose = (typeof MCP_UPLOAD_PURPOSES)[number];

/** Workers 요청 본문 한도(100MB)에 맞춘 MCP 업로드 상한 */
export const MCP_UPLOAD_MAX_BYTES = 100_000_000;
export const MCP_UPLOAD_TTL_MS = 10 * 60 * 1000;

export const MCP_UPLOAD_STATUSES = [
  "pending",
  "receiving",
  "completed",
  "consumed",
  "failed",
] as const;
export type McpUploadStatus = (typeof MCP_UPLOAD_STATUSES)[number];

export const apiMcpToolSummarySchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(MCP_TOOL_CATEGORIES),
  readOnly: z.boolean(),
  destructive: z.boolean(),
  examplePrompt: z.string(),
});
export type ApiMcpToolSummary = z.infer<typeof apiMcpToolSummarySchema>;

export const apiMcpOverviewSchema = z.object({
  serverUrl: z.url(),
  role: z.string(),
  tools: z.array(apiMcpToolSummarySchema),
});
export type ApiMcpOverview = z.infer<typeof apiMcpOverviewSchema>;

export const apiMcpConnectionSchema = z.object({
  clientId: z.string(),
  clientName: z.string().nullable(),
  clientUri: z.string().nullable(),
  scopes: z.array(z.string()),
  connectedAt: z.string(),
  updatedAt: z.string(),
});
export type ApiMcpConnection = z.infer<typeof apiMcpConnectionSchema>;

export const apiMcpUploadLookupSchema = z.object({
  uploadId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  declaredSize: z.number().int(),
  purpose: z.enum(MCP_UPLOAD_PURPOSES),
  status: z.enum(MCP_UPLOAD_STATUSES),
  expiresAt: z.string(),
  putUrl: z.url(),
});
export type ApiMcpUploadLookup = z.infer<typeof apiMcpUploadLookupSchema>;

export const apiMcpConsentContextSchema = z.object({
  client: z.object({
    clientId: z.string(),
    name: z.string().nullable(),
    uri: z.string().nullable(),
  }),
  scopes: z.array(z.string()),
  overview: apiMcpOverviewSchema,
});
export type ApiMcpConsentContext = z.infer<typeof apiMcpConsentContextSchema>;
```

`packages/contracts/package.json`의 `exports`에서 `"./linktree"` 줄 다음에 추가한다.

```json
    "./mcp": "./src/api/mcp.ts",
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/contracts exec vitest run tests/mcp.test.ts`
Expected: PASS (9 tests)

Run: `pnpm --filter @yonyoung/contracts typecheck && pnpm --filter @yonyoung/contracts lint`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add packages/contracts
git commit -m "feat(contracts): add MCP tool catalog, upload purposes and role labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 2: 내부 Actor 주입과 `loadActorByUserId` 분리

**Files:**

- Create: `apps/api/src/features/mcp/internal-actor.ts`
- Modify: `apps/api/src/lib/auth/session.ts`
- Modify: `apps/api/src/app/createApp.ts`
- Test: `apps/api/src/tests/mcp-internal-actor.test.ts`

**Interfaces:**

- Produces:
  - `MCP_ACTOR: unique symbol`
  - `withInternalActor<TEnv extends object>(env: TEnv | undefined, actor: Actor): TEnv`
  - `readInternalActor(env: unknown): Actor | undefined`
  - `withInternalActorResolution(dependencies: AppDependencies): AppDependencies`
  - `loadActorByUserId(database: D1Database, userId: string): Promise<Actor | null>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-internal-actor.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  MCP_ACTOR,
  readInternalActor,
  withInternalActor,
} from "../features/mcp/internal-actor";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createTestApp,
} from "./test-helpers";

describe("내부 Actor 주입", () => {
  it("env에 실린 Actor로 기존 라우트 권한을 판정한다", async () => {
    const listGenerations = vi.fn(async () => [createGeneration()]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations }),
    });

    const response = await app.fetch(
      new Request("http://localhost/api/generations"),
      withInternalActor(undefined, createActor("regular_member")),
    );

    expect(response.status).toBe(200);
    expect(listGenerations).toHaveBeenCalledTimes(1);
  });

  it("권한이 없는 내부 Actor는 기존 라우트에서 403을 받는다", async () => {
    const app = createTestApp({ actor: null });

    const response = await app.fetch(
      new Request(`http://localhost/api/generations/${IDs.generation}`, {
        method: "DELETE",
      }),
      withInternalActor(undefined, createActor("vice_president")),
    );

    expect(response.status).toBe(403);
  });

  it("env에 Actor가 없으면 원래 resolveActor를 쓴다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations");
    expect(response.status).toBe(401);
  });

  it("외부 요청은 헤더로 Actor를 주입할 수 없다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations", {
      headers: { "x-mcp-actor": JSON.stringify(createActor("president")) },
    });
    expect(response.status).toBe(401);
  });

  it("Symbol 키는 문자열 키로 흉내 낼 수 없다", () => {
    expect(
      readInternalActor({ "yonyoung.mcp.actor": createActor("president") }),
    ).toBeUndefined();
    expect(
      readInternalActor({ [MCP_ACTOR]: createActor("president") })?.role,
    ).toBe("president");
    expect(readInternalActor(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-internal-actor.test.ts`
Expected: FAIL — `Cannot find module '../features/mcp/internal-actor'`

- [ ] **Step 3: `internal-actor.ts`를 만든다**

```ts
import type { Actor } from "../../lib/authorization/types";
import type { AppDependencies } from "../../lib/services/dependencies";

/**
 * MCP 도구가 기존 라우트를 같은 Worker 안에서 호출할 때 Actor를 실어 보내는 env 키.
 * 외부 HTTP 요청은 env를 만들 수 없으므로 이 경로로 Actor를 위조할 수 없다.
 * Symbol.for가 아닌 Symbol을 써서 모듈 밖에서는 같은 키를 만들 수 없게 한다.
 */
export const MCP_ACTOR: unique symbol = Symbol("yonyoung.mcp.actor");

type EnvWithInternalActor = { [MCP_ACTOR]?: Actor };

export const withInternalActor = <TEnv extends object>(
  env: TEnv | undefined,
  actor: Actor,
): TEnv => ({ ...(env ?? {}), [MCP_ACTOR]: actor }) as TEnv;

export const readInternalActor = (env: unknown): Actor | undefined => {
  if (typeof env !== "object" || env === null) {
    return undefined;
  }
  return (env as EnvWithInternalActor)[MCP_ACTOR];
};

export const withInternalActorResolution = (
  dependencies: AppDependencies,
): AppDependencies => ({
  ...dependencies,
  resolveActor: (c) => readInternalActor(c.env) ?? dependencies.resolveActor(c),
});
```

- [ ] **Step 4: `createApp`에서 의존성을 감싼다**

`apps/api/src/app/createApp.ts`의 import에 추가한다.

```ts
import { withInternalActorResolution } from "../features/mcp/internal-actor";
```

`createApp` 안의 의존성 조립을 바꾼다.

```ts
const dependencies = withInternalActorResolution({
  ...createDefaultDependencies(),
  ...partialDependencies,
});
```

- [ ] **Step 5: `loadActorByUserId`를 분리한다**

`apps/api/src/lib/auth/session.ts`에서 `getActorFromSession`의 `const db = getDbClient(database);`부터 함수 끝까지를 새 함수로 옮긴다. 옮긴 본문의 `sessionUserId`는 모두 `userId`로 바꾼다. `getActorFromSession`은 다음처럼 끝난다.

```ts
  if (!sessionResult?.user?.id) {
    return null;
  }

  return loadActorByUserId(database, sessionResult.user.id);
};

/**
 * 사용자 ID로 Actor를 만든다. 세션 경로와 MCP 토큰 경로가 함께 쓴다.
 * role/generation은 호출할 때마다 D1에서 다시 읽으므로 강등·삭제가 즉시 반영된다.
 */
export const loadActorByUserId = async (
  database: D1Database,
  userId: string,
): Promise<Actor | null> => {
  const db = getDbClient(database);

  const buildUserQuery = () =>
    db.query.user.findFirst({
      where: and(eq(user.id, userId), isNull(user.deletedAt)),
      // ... 이하 기존 본문 그대로 (sessionUserId → userId)
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-internal-actor.test.ts src/tests/auth-session.test.ts src/tests/app-rbac.test.ts`
Expected: PASS

Run: `pnpm --filter @yonyoung/api typecheck`
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/features/mcp/internal-actor.ts apps/api/src/lib/auth/session.ts apps/api/src/app/createApp.ts apps/api/src/tests/mcp-internal-actor.test.ts
git commit -m "feat(api): let in-process callers pass an actor through env

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 3: 내부 API 클라이언트와 도구 결과 변환

**Files:**

- Create: `apps/api/src/features/mcp/internal-api.ts`
- Create: `apps/api/src/features/mcp/tool-result.ts`
- Test: `apps/api/src/tests/mcp-internal-api.test.ts`

**Interfaces:**

- Consumes: `withInternalActor`, `readInternalActor` (Task 2), `CORE_ROLE_LABELS` (Task 1)
- Produces:
  - `type InternalDispatch = (request: Request, env: unknown, executionCtx?: ExecutionContext) => Response | Promise<Response>`
  - `type InternalApiMethod = "GET" | "POST" | "PATCH" | "DELETE"`
  - `type InternalApiQuery = Record<string, string | number | boolean | null | undefined>`
  - `type InternalApiRequest = { method; path; query?; body? }`
  - `type InternalApiFailure = { ok: false; status: number; code: string; message: string; requestId: string | null }`
  - `type InternalApiResult = { ok: true; status: number; data: unknown } | InternalApiFailure`
  - `type InternalApiClient = { call(request: InternalApiRequest): Promise<InternalApiResult> }`
  - `createInternalApiClient(input: { dispatch; env; executionCtx?; actor; origin; requestId }): InternalApiClient`
  - `fillPath(template: string, params: Record<string, string>): string`
  - `toolSuccess(summary: string, data: unknown): CallToolResult`
  - `toolFailure(message: string): CallToolResult`
  - `describeApiFailure(failure: InternalApiFailure, role: Role): string`
  - `toToolResult(result: InternalApiResult, input: { summary: string; role: Role }): CallToolResult`

- [ ] **Step 1: MCP 서버 패키지를 설치한다**

`tool-result.ts`가 SDK의 `CallToolResult` 타입을 쓰므로 여기서 설치한다.

```bash
pnpm --filter @yonyoung/api add @modelcontextprotocol/server@2.3.1
pnpm --filter @yonyoung/api add -D @modelcontextprotocol/client@2.3.1
```

`apps/api/package.json`에 두 패키지가 캐럿 없이 `2.3.1`로 들어갔는지 확인한다. 캐럿이 붙었으면 지운다.

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-internal-api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { readInternalActor } from "../features/mcp/internal-actor";
import {
  createInternalApiClient,
  fillPath,
  type InternalDispatch,
} from "../features/mcp/internal-api";
import { toToolResult } from "../features/mcp/tool-result";
import { createActor } from "./test-helpers";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const createClient = (dispatch: InternalDispatch) =>
  createInternalApiClient({
    dispatch,
    env: { db: "binding" },
    actor: createActor("manager"),
    origin: "https://api.example.test",
    requestId: "req-1",
  });

describe("내부 API 클라이언트", () => {
  it("쿼리를 붙여 GET을 보내고 data를 꺼낸다", async () => {
    const dispatch = vi.fn<InternalDispatch>(async () =>
      jsonResponse(200, { data: [{ id: "a" }] }),
    );
    const result = await createClient(dispatch).call({
      method: "GET",
      path: "/api/activities",
      query: { generationId: "g-1", empty: undefined },
    });

    expect(result).toEqual({ ok: true, status: 200, data: [{ id: "a" }] });
    const [request, env] = dispatch.mock.calls[0]!;
    expect(request.url).toBe(
      "https://api.example.test/api/activities?generationId=g-1",
    );
    expect(request.headers.get("x-request-id")).toBe("req-1");
    expect(readInternalActor(env)?.role).toBe("manager");
    expect((env as { db: string }).db).toBe("binding");
  });

  it("본문을 JSON으로 보낸다", async () => {
    const dispatch = vi.fn<InternalDispatch>(async () =>
      jsonResponse(201, { data: { id: "n" } }),
    );
    await createClient(dispatch).call({
      method: "POST",
      path: "/api/linktree",
      body: { name: "공식 링크" },
    });

    const [request] = dispatch.mock.calls[0]!;
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(await request.json()).toEqual({ name: "공식 링크" });
  });

  it("204는 data null로 돌려준다", async () => {
    const result = await createClient(
      async () => new Response(null, { status: 204 }),
    ).call({
      method: "DELETE",
      path: "/api/linktree/x",
    });
    expect(result).toEqual({ ok: true, status: 204, data: null });
  });

  it("오류 봉투를 풀어 돌려준다", async () => {
    const result = await createClient(async () =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "권한이 없습니다.",
          requestId: "r-9",
        },
      }),
    ).call({ method: "DELETE", path: "/api/generations/x" });

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "권한이 없습니다.",
      requestId: "r-9",
    });
  });

  it("JSON이 아닌 오류 응답에도 기본 문구를 준다", async () => {
    const result = await createClient(
      async () => new Response("boom", { status: 502 }),
    ).call({
      method: "GET",
      path: "/api/activities",
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "UNKNOWN_ERROR",
    });
  });
});

describe("fillPath", () => {
  it("경로 파라미터를 인코딩해 채운다", () => {
    expect(fillPath("/api/users/{id}", { id: "a/b c" })).toBe(
      "/api/users/a%2Fb%20c",
    );
  });

  it("빠진 파라미터는 예외를 던진다", () => {
    expect(() => fillPath("/api/users/{id}", {})).toThrow("id");
  });
});

describe("toToolResult", () => {
  it("성공이면 요약과 JSON을 함께 준다", () => {
    const result = toToolResult(
      { ok: true, status: 200, data: { id: "a" } },
      { summary: "활동입니다.", role: "manager" },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toMatchObject({ type: "text" });
    expect((result.content[0] as { text: string }).text).toContain(
      "활동입니다.",
    );
    expect(result.structuredContent).toEqual({ data: { id: "a" } });
  });

  it("403이면 현재 역할 이름을 알려준다", () => {
    const result = toToolResult(
      {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
        requestId: "r-1",
      },
      { summary: "", role: "manager" },
    );
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("현재 역할(부장)");
    expect(text).toContain("사유: 권한이 없습니다.");
    expect(text).toContain("요청 ID: r-1");
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-internal-api.test.ts`
Expected: FAIL — `Cannot find module '../features/mcp/internal-api'`

- [ ] **Step 4: `internal-api.ts`를 만든다**

```ts
import type { Actor } from "../../lib/authorization/types";
import { withInternalActor } from "./internal-actor";

export type InternalDispatch = (
  request: Request,
  env: unknown,
  executionCtx?: ExecutionContext,
) => Response | Promise<Response>;

export type InternalApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type InternalApiQuery = Record<
  string,
  string | number | boolean | null | undefined
>;

export type InternalApiRequest = {
  method: InternalApiMethod;
  path: string;
  query?: InternalApiQuery;
  body?: unknown;
};

export type InternalApiFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
  requestId: string | null;
};

export type InternalApiResult =
  { ok: true; status: number; data: unknown } | InternalApiFailure;

export type InternalApiClient = {
  call: (request: InternalApiRequest) => Promise<InternalApiResult>;
};

const PATH_PARAM_PATTERN = /\{(\w+)\}/g;

/** `/api/activities/{id}` 같은 경로 템플릿을 채운다. 값은 경로 조각으로 인코딩한다. */
export const fillPath = (
  template: string,
  params: Record<string, string>,
): string =>
  template.replace(PATH_PARAM_PATTERN, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`경로 파라미터 ${key}가 없습니다.`);
    }
    return encodeURIComponent(value);
  });

type ErrorEnvelope = {
  error?: { code?: unknown; message?: unknown; requestId?: unknown };
};

const readFailure = async (response: Response): Promise<InternalApiFailure> => {
  const payload = (await response
    .json()
    .catch(() => null)) as ErrorEnvelope | null;
  const error = payload?.error;
  return {
    ok: false,
    status: response.status,
    code: typeof error?.code === "string" ? error.code : "UNKNOWN_ERROR",
    message:
      typeof error?.message === "string"
        ? error.message
        : "요청을 처리하지 못했습니다.",
    requestId: typeof error?.requestId === "string" ? error.requestId : null,
  };
};

/**
 * 기존 Hono 라우트를 같은 Worker 안에서 호출한다. 권한 가드·검증·감사 로그는
 * 라우트가 그대로 처리하므로 MCP 도구는 비즈니스 규칙을 다시 구현하지 않는다.
 */
export const createInternalApiClient = (input: {
  dispatch: InternalDispatch;
  env: unknown;
  executionCtx?: ExecutionContext;
  actor: Actor;
  origin: string;
  requestId: string;
}): InternalApiClient => {
  const env = withInternalActor(
    input.env as Record<string, unknown> | undefined,
    input.actor,
  );

  return {
    async call(request) {
      const url = new URL(request.path, input.origin);
      for (const [key, value] of Object.entries(request.query ?? {})) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      const headers = new Headers({
        accept: "application/json",
        "x-request-id": input.requestId,
      });
      let body: string | undefined;
      if (request.body !== undefined) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(request.body);
      }

      const response = await input.dispatch(
        new Request(url, { method: request.method, headers, body }),
        env,
        input.executionCtx,
      );

      if (!response.ok) {
        return readFailure(response);
      }
      if (response.status === 204) {
        return { ok: true, status: 204, data: null };
      }
      const payload = (await response.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      return { ok: true, status: response.status, data: payload?.data ?? null };
    },
  };
};
```

- [ ] **Step 5: `tool-result.ts`를 만든다**

```ts
import type { CallToolResult } from "@modelcontextprotocol/server";
import { CORE_ROLE_LABELS } from "@yonyoung/contracts/auth-roles";
import type { Role } from "../../lib/authorization/types";
import type { InternalApiFailure, InternalApiResult } from "./internal-api";

const guidanceByStatus = (status: number, role: Role): string => {
  if (status === 401) {
    return "연영 연결이 만료되었습니다. 커넥터를 다시 연결해 주세요.";
  }
  if (status === 403) {
    return `현재 역할(${CORE_ROLE_LABELS[role]})로는 할 수 없는 작업입니다.`;
  }
  if (status === 404) {
    return "대상을 찾을 수 없습니다. ID를 다시 확인해 주세요.";
  }
  if (status === 409) {
    return "다른 변경과 충돌했습니다. 최신 상태를 다시 조회한 뒤 시도해 주세요.";
  }
  if (status === 411) {
    return "파일 크기를 알 수 없습니다. Content-Length를 보내야 합니다.";
  }
  if (status === 413) {
    return "용량 한도를 넘었습니다.";
  }
  if (status === 415) {
    return "허용되지 않는 파일 형식입니다.";
  }
  if (status === 400 || status === 422) {
    return "입력값이 올바르지 않습니다.";
  }
  if (status >= 500) {
    return "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "요청을 처리하지 못했습니다.";
};

export const describeApiFailure = (
  failure: InternalApiFailure,
  role: Role,
): string => {
  const lines = [
    guidanceByStatus(failure.status, role),
    `사유: ${failure.message}`,
  ];
  if (failure.requestId) {
    lines.push(`요청 ID: ${failure.requestId}`);
  }
  return lines.join("\n");
};

export const toolSuccess = (
  summary: string,
  data: unknown,
): CallToolResult => ({
  content: [
    {
      type: "text",
      text:
        data === null
          ? summary
          : `${summary}\n\n${JSON.stringify(data, null, 2)}`,
    },
  ],
  structuredContent: { data },
});

export const toolFailure = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

export const toToolResult = (
  result: InternalApiResult,
  input: { summary: string; role: Role },
): CallToolResult =>
  result.ok
    ? toolSuccess(input.summary, result.data)
    : toolFailure(describeApiFailure(result, input.role));
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-internal-api.test.ts`
Expected: PASS (9 tests)

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/features/mcp/internal-api.ts apps/api/src/features/mcp/tool-result.ts apps/api/src/tests/mcp-internal-api.test.ts
git commit -m "feat(api): add in-process API client and MCP tool result mapping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

## 2단계: 인증

### Task 4: OAuth·업로드 DB 스키마와 마이그레이션

**Files:**

- Create: `apps/api/src/platform/db/schema/oauth.ts`
- Create: `apps/api/src/platform/db/schema/mcp.ts`
- Modify: `apps/api/src/platform/db/schema/index.ts`
- Modify: `apps/api/src/tests/auth-schema-parity.test.ts`
- Create (생성됨): `apps/api/drizzle/0012_dashboard_mcp.sql`, `apps/api/drizzle/meta/*`

**Interfaces:**

- Produces: Drizzle 테이블 `jwks`, `oauthClient`, `oauthResource`, `oauthClientResource`, `oauthRefreshToken`, `oauthAccessToken`, `oauthConsent`, `oauthClientAssertion`, `mcpUploads`

Better Auth Drizzle 어댑터는 스키마 객체의 **export 이름**으로 모델을 찾는다. 그래서 export 이름은 모델명(`oauthClient` 등)과 같아야 한다. 물리 테이블·컬럼 이름은 기존 규칙대로 snake_case를 쓴다. SQLite에서 어댑터는 `string[]`과 `json`을 JSON 문자열로 저장하므로 둘 다 `text` 컬럼으로 만든다.

- [ ] **Step 1: Better Auth MCP 플러그인을 설치한다**

```bash
pnpm --filter @yonyoung/api add @better-auth/mcp@1.7.7 @better-auth/oauth-provider@1.7.7
```

캐럿이 붙었으면 지워서 정확히 `1.7.7`로 고정한다.

- [ ] **Step 2: 정합성 테스트를 확장한다(실패 확인용)**

`apps/api/src/tests/auth-schema-parity.test.ts`를 다음처럼 바꾼다. 기존 세 검증을 함수로 묶고, OAuth 테이블에도 같은 검증과 필드 단위 unique 검증을 적용한다.

```ts
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { getAuthTables } from "better-auth/db";
import { jwt } from "better-auth/plugins";
import { mcp } from "@better-auth/mcp";
import { describe, expect, it } from "vitest";
import {
  account,
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  session,
  user,
  verification,
} from "../platform/db/schema";

const CORE_MODELS = ["user", "session", "account", "verification"];

const baseAuthOptions = {
  socialProviders: {
    google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
  },
  emailAndPassword: { enabled: true },
};

// Better Auth는 버전 업그레이드에서 코어 모델에 필드를 추가하거나 제거한다.
// Drizzle 스키마가 따라가지 않으면 어댑터가 런타임에서만
// `The field "x" does not exist in the schema for the model "y"`로 터지므로,
// 여기서 두 스키마의 필드 집합을 정적으로 대조한다.
const describeSchemaParity = (
  title: string,
  authTables: ReturnType<typeof getAuthTables>,
  drizzleTables: Record<string, SQLiteTable>,
) => {
  describe(title, () => {
    const models = Object.keys(drizzleTables);

    it.each(models)(
      "%s 모델이 요구하는 모든 필드를 Drizzle 테이블이 선언한다",
      (model) => {
        const expectedFields = Object.keys(authTables[model]?.fields ?? {});
        const declaredFields = Object.keys(
          getTableColumns(drizzleTables[model]!),
        );

        expect(expectedFields.length).toBeGreaterThan(0);
        expect(declaredFields).toEqual(expect.arrayContaining(expectedFields));
      },
    );

    it.each(models)(
      "%s 모델에 Better Auth가 쓰지 않는 필수 컬럼이 없다",
      (model) => {
        const expectedFields = Object.keys(authTables[model]?.fields ?? {});
        const unwrittenRequiredFields = Object.entries(
          getTableColumns(drizzleTables[model]!),
        )
          .filter(
            ([key, column]) =>
              !expectedFields.includes(key) &&
              column.notNull &&
              !column.hasDefault &&
              !column.primary,
          )
          .map(([key]) => key);
        expect(unwrittenRequiredFields).toEqual([]);
      },
    );

    it.each(models)(
      "%s 모델의 unique 필드를 Drizzle 컬럼도 unique로 선언한다",
      (model) => {
        const columns = getTableColumns(drizzleTables[model]!);
        for (const [field, definition] of Object.entries(
          authTables[model]?.fields ?? {},
        )) {
          if (definition.unique) {
            expect(columns[field]?.isUnique, `${model}.${field}`).toBe(true);
          }
        }
      },
    );

    it("Better Auth가 요구하는 고유 인덱스를 Drizzle 테이블이 선언한다", () => {
      for (const [model, table] of Object.entries(drizzleTables)) {
        const requiredUniqueIndexes = (authTables[model]?.indexes ?? []).filter(
          (index) => index.unique,
        );
        if (requiredUniqueIndexes.length === 0) {
          continue;
        }

        // Drizzle 어댑터는 물리 컬럼명이 아니라 스키마 객체의 키로 필드를 찾으므로
        // (snake_case 컬럼이어도 동작한다) 인덱스 비교도 키 기준으로 수행한다.
        const keyByColumnName = new Map(
          Object.entries(getTableColumns(table)).map(([key, column]) => [
            column.name,
            key,
          ]),
        );
        const declaredUniqueIndexes = getTableConfig(table)
          .indexes.filter((index) => index.config.unique)
          .map((index) =>
            index.config.columns
              // SQL 식 기반 인덱스는 Better Auth가 요구하는 컬럼 인덱스가 아니므로 제외한다.
              .filter((column) => "name" in column)
              .map((column) => keyByColumnName.get(column.name) ?? column.name)
              .join(","),
          );

        for (const required of requiredUniqueIndexes) {
          const requiredColumns = required.fields.join(",");
          expect(
            declaredUniqueIndexes,
            `${getTableName(table)} 테이블에 (${requiredColumns}) 고유 인덱스가 필요하다`,
          ).toContain(requiredColumns);
        }
      }
    });
  });
};

describeSchemaParity(
  "Better Auth 코어 스키마 ↔ Drizzle 스키마 정합성",
  getAuthTables({ ...baseAuthOptions, plugins: [] }),
  { user, session, account, verification },
);

const oauthAuthTables = getAuthTables({
  ...baseAuthOptions,
  plugins: [
    jwt(),
    mcp({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/mcp-consent",
      resource: "https://api.example.test/mcp",
    }),
  ],
});

const oauthDrizzleTables = {
  jwks,
  oauthClient,
  oauthResource,
  oauthClientResource,
  oauthRefreshToken,
  oauthAccessToken,
  oauthConsent,
  oauthClientAssertion,
};

describeSchemaParity(
  "Better Auth OAuth 플러그인 스키마 ↔ Drizzle 스키마 정합성",
  oauthAuthTables,
  oauthDrizzleTables,
);

describe("OAuth 플러그인 모델 목록", () => {
  it("플러그인이 요구하는 모델을 모두 Drizzle 테이블로 선언한다", () => {
    const pluginModels = Object.keys(oauthAuthTables)
      .filter((model) => !CORE_MODELS.includes(model))
      .sort();
    expect(Object.keys(oauthDrizzleTables).sort()).toEqual(pluginModels);
  });
});
```

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/auth-schema-parity.test.ts`
Expected: FAIL — `jwks`가 스키마에서 export되지 않음

- [ ] **Step 3: OAuth 테이블을 만든다**

`apps/api/src/platform/db/schema/oauth.ts`:

```ts
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { session, user } from "./auth";

// Better Auth jwt + @better-auth/mcp(oauth-provider) 플러그인 모델.
// export 이름이 곧 Better Auth 모델명이다. string[]과 json은 어댑터가 JSON 문자열로 저장한다.

export const jwks = sqliteTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  alg: text("alg"),
  crv: text("crv"),
});

export const oauthClient = sqliteTable(
  "oauth_client",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"),
    clientDiscoveryId: text("client_discovery_id"),
    disabled: integer("disabled", { mode: "boolean" }),
    skipConsent: integer("skip_consent", { mode: "boolean" }),
    enableEndSession: integer("enable_end_session", { mode: "boolean" }),
    subjectType: text("subject_type"),
    scopes: text("scopes"),
    clientCredentialsScopes: text("client_credentials_scopes"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
    name: text("name"),
    uri: text("uri"),
    icon: text("icon"),
    contacts: text("contacts"),
    tos: text("tos"),
    policy: text("policy"),
    softwareId: text("software_id"),
    softwareVersion: text("software_version"),
    softwareStatement: text("software_statement"),
    redirectUris: text("redirect_uris").notNull(),
    postLogoutRedirectUris: text("post_logout_redirect_uris"),
    backchannelLogoutUri: text("backchannel_logout_uri"),
    backchannelLogoutSessionRequired: integer(
      "backchannel_logout_session_required",
      {
        mode: "boolean",
      },
    ),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    applicationType: text("application_type"),
    jwks: text("jwks"),
    jwksUri: text("jwks_uri"),
    grantTypes: text("grant_types"),
    responseTypes: text("response_types"),
    requirePKCE: integer("require_pkce", { mode: "boolean" }),
    dpopBoundAccessTokens: integer("dpop_bound_access_tokens", {
      mode: "boolean",
    }),
    referenceId: text("reference_id"),
    metadata: text("metadata"),
  },
  (table) => [index("oauth_client_user_id_idx").on(table.userId)],
);

export const oauthResource = sqliteTable("oauth_resource", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  name: text("name").notNull(),
  accessTokenTtl: integer("access_token_ttl"),
  refreshTokenTtl: integer("refresh_token_ttl"),
  signingAlgorithm: text("signing_algorithm"),
  signingKeyId: text("signing_key_id"),
  allowedScopes: text("allowed_scopes"),
  customClaims: text("custom_claims"),
  dpopBoundAccessTokensRequired: integer("dpop_bound_access_tokens_required", {
    mode: "boolean",
  }),
  disabled: integer("disabled", { mode: "boolean" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  policyVersion: integer("policy_version"),
  metadata: text("metadata"),
});

export const oauthClientResource = sqliteTable(
  "oauth_client_resource",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => oauthResource.identifier, { onDelete: "cascade" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("oauth_client_resource_client_id_idx").on(table.clientId),
    index("oauth_client_resource_resource_id_idx").on(table.resourceId),
    uniqueIndex("oauth_client_resource_client_resource_idx").on(
      table.clientId,
      table.resourceId,
    ),
  ],
);

export const oauthRefreshToken = sqliteTable(
  "oauth_refresh_token",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text("resources"),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
    rotationReplayResponse: text("rotation_replay_response"),
    rotationReplayExpiresAt: integer("rotation_replay_expires_at", {
      mode: "timestamp_ms",
    }),
    authTime: integer("auth_time", { mode: "timestamp_ms" }),
    confirmation: text("confirmation"),
    scopes: text("scopes").notNull(),
  },
  (table) => [
    index("oauth_refresh_token_client_id_idx").on(table.clientId),
    index("oauth_refresh_token_session_id_idx").on(table.sessionId),
    index("oauth_refresh_token_user_id_idx").on(table.userId),
    index("oauth_refresh_token_authorization_code_id_idx").on(
      table.authorizationCodeId,
    ),
  ],
);

export const oauthAccessToken = sqliteTable(
  "oauth_access_token",
  {
    id: text("id").primaryKey(),
    token: text("token").unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text("resources"),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
      onDelete: "cascade",
    }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    confirmation: text("confirmation"),
    scopes: text("scopes").notNull(),
  },
  (table) => [
    index("oauth_access_token_client_id_idx").on(table.clientId),
    index("oauth_access_token_session_id_idx").on(table.sessionId),
    index("oauth_access_token_user_id_idx").on(table.userId),
    index("oauth_access_token_authorization_code_id_idx").on(
      table.authorizationCodeId,
    ),
    index("oauth_access_token_refresh_id_idx").on(table.refreshId),
  ],
);

export const oauthConsent = sqliteTable(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    resources: text("resources"),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    scopes: text("scopes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("oauth_consent_client_id_idx").on(table.clientId),
    index("oauth_consent_user_id_idx").on(table.userId),
  ],
);

export const oauthClientAssertion = sqliteTable("oauth_client_assertion", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 4: `mcp_uploads` 테이블을 만든다**

`apps/api/src/platform/db/schema/mcp.ts`:

```ts
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { nowTimestamp } from "./columns";

/** MCP 업로드. 토큰 원문은 저장하지 않고 SHA-256 hex만 둔다. */
export const mcpUploads = sqliteTable(
  "mcp_uploads",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    declaredSize: integer("declared_size").notNull(),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url").notNull(),
    width: integer("width"),
    height: integer("height"),
    reservationId: text("reservation_id"),
    status: text("status").notNull().default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("mcp_uploads_user_created_idx").on(table.userId, table.createdAt),
    index("mcp_uploads_expiry_idx").on(table.expiresAt),
  ],
);
```

`apps/api/src/platform/db/schema/index.ts` 끝에 추가한다.

```ts
export * from "./oauth";
export * from "./mcp";
```

- [ ] **Step 5: 정합성 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/auth-schema-parity.test.ts`
Expected: PASS

필드 누락으로 실패하면 메시지의 필드를 `oauth.ts`에 추가한다. 1.7.7에서 뽑은 필드 목록은 위 코드와 같다.

- [ ] **Step 6: 마이그레이션을 생성한다**

```bash
pnpm --filter @yonyoung/api exec drizzle-kit generate --name dashboard_mcp
```

Expected: `apps/api/drizzle/0012_dashboard_mcp.sql`이 생기고, 9개 테이블의 `CREATE TABLE`과 인덱스가 들어 있다. 기존 테이블을 바꾸는 문장(`ALTER`, `DROP`)이 **없어야** 한다. 있으면 생성물을 지우고 원인을 찾는다. 스키마에서 기존 테이블을 실수로 건드린 경우다.

```bash
grep -E "ALTER|DROP" apps/api/drizzle/0012_dashboard_mcp.sql
```

Expected: 출력 없음

- [ ] **Step 7: 로컬 D1에 적용해 본다**

```bash
pnpm db:migrate:local
```

Expected: `0012_dashboard_mcp.sql` 적용 성공

- [ ] **Step 8: 커밋**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/platform/db/schema apps/api/src/tests/auth-schema-parity.test.ts apps/api/drizzle
git commit -m "feat(api): add OAuth provider and MCP upload tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 5: Better Auth OAuth 서버, MCP 토큰 인증기, 연결 저장소

**Files:**

- Modify: `apps/api/src/bindings/types.ts` (`MCP_RESOURCE_URL?`, `MCP_AUTH_ISSUER?`)
- Modify: `apps/api/src/lib/config/runtime-env.ts`
- Modify: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/wrangler.jsonc`
- Create: `apps/api/src/features/mcp/mcp-auth.ts`
- Create: `apps/api/src/features/mcp/mcp-connection-store.ts`
- Create: `apps/api/src/features/mcp/mcp.routes.ts` (메타데이터 라우트만, Task 6에서 확장)
- Modify: `apps/api/src/lib/services/dependencies.ts`
- Modify: `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/tests/test-helpers.ts` (`overrides` 입력)
- Test: `apps/api/src/tests/mcp-auth.test.ts`

**Interfaces:**

- Consumes: `loadActorByUserId` (Task 2), OAuth 테이블 (Task 4)
- Produces:
  - `type McpRuntimeEnv = { resourceUrl: string; issuer: string; jwksUrl: string; resourceMetadataUrl: string }`
  - `resolveMcpRuntimeEnv(env: Partial<AppBindings> | undefined): McpRuntimeEnv`
  - `MCP_OAUTH_SCOPES = ["openid", "profile", "email", "offline_access", "mcp"]`
  - `type McpTokenIdentity = { userId: string; clientId: string; scopes: string[] }`
  - `type McpRequestAuthenticator = (c: Context<HonoAppType>, onAuthenticated: (identity: McpTokenIdentity) => Promise<Response>) => Promise<Response>`
  - `toMcpTokenIdentity(claims: JWTPayload): McpTokenIdentity | null`
  - `createBetterAuthMcpAuthenticator(): McpRequestAuthenticator`
  - `mcpUnauthorizedResponse(env: McpRuntimeEnv, message: string): Response`
  - `type McpConnection = { clientId; clientName: string | null; clientUri: string | null; scopes: string[]; connectedAt: number; updatedAt: number }`
  - `interface McpConnectionStore { hasConsent(userId, clientId): Promise<boolean>; list(userId): Promise<McpConnection[]>; revoke(userId, clientId, now): Promise<boolean> }`
  - `createD1McpConnectionStore(database)`, `createMemoryMcpConnectionStore(seed?: Array<{ userId: string; clientId: string; clientName?: string }>)`
  - `AppDependencies`에 추가되는 필드: `authenticateMcpRequest`, `loadActorByUserId: (c, userId) => Promise<Actor | null>`, `getMcpConnectionStore: (c) => McpConnectionStore`
  - `registerMcpRoutes(app: OpenAPIHono<HonoAppType>, dependencies: AppDependencies): void`
  - `createTestApp({ ..., overrides?: Partial<AppDependencies> })`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toMcpTokenIdentity } from "../features/mcp/mcp-auth";
import { createMemoryMcpConnectionStore } from "../features/mcp/mcp-connection-store";
import { resolveMcpRuntimeEnv } from "../lib/config/runtime-env";
import { createApp } from "../app";

const AUTH_TEST_ENV = {
  BETTER_AUTH_URL: "https://web.example.test",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://web.example.test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  MCP_RESOURCE_URL: "https://api.example.test/mcp",
  MCP_AUTH_ISSUER: "https://web.example.test/api/auth",
  db: {} as D1Database,
};

describe("MCP 런타임 환경", () => {
  it("명시한 리소스 URL과 issuer를 쓴다", () => {
    expect(resolveMcpRuntimeEnv(AUTH_TEST_ENV)).toEqual({
      resourceUrl: "https://api.example.test/mcp",
      issuer: "https://web.example.test/api/auth",
      jwksUrl: "https://web.example.test/api/auth/jwks",
      resourceMetadataUrl:
        "https://api.example.test/.well-known/oauth-protected-resource/mcp",
    });
  });

  it("값이 없으면 BETTER_AUTH_URL에서 기본값을 만든다", () => {
    const env = resolveMcpRuntimeEnv({
      BETTER_AUTH_URL: "http://localhost:8787",
    });
    expect(env.resourceUrl).toBe("http://localhost:8787/mcp");
    expect(env.issuer).toBe("http://localhost:8787/api/auth");
  });
});

describe("토큰 클레임 해석", () => {
  it("사용자 토큰에서 sub, azp, scope를 꺼낸다", () => {
    expect(
      toMcpTokenIdentity({
        sub: "user-1",
        azp: "client-1",
        scope: "openid mcp",
      }),
    ).toEqual({
      userId: "user-1",
      clientId: "client-1",
      scopes: ["openid", "mcp"],
    });
  });

  it("client_credentials 토큰(sub=client)은 거부한다", () => {
    expect(
      toMcpTokenIdentity({ sub: "client-1", azp: "client-1", scope: "mcp" }),
    ).toBeNull();
  });

  it("sub나 클라이언트가 없으면 거부한다", () => {
    expect(toMcpTokenIdentity({ azp: "client-1" })).toBeNull();
    expect(toMcpTokenIdentity({ sub: "user-1" })).toBeNull();
  });
});

describe("메모리 연결 저장소", () => {
  it("동의를 확인하고 해제한다", async () => {
    const store = createMemoryMcpConnectionStore([
      { userId: "u1", clientId: "c1", clientName: "Claude" },
    ]);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
    expect(await store.list("u1")).toMatchObject([
      { clientId: "c1", clientName: "Claude" },
    ]);
    expect(await store.revoke("u1", "c1", Date.now())).toBe(true);
    expect(await store.hasConsent("u1", "c1")).toBe(false);
    expect(await store.revoke("u1", "c1", Date.now())).toBe(false);
  });

  it("다른 사용자의 연결은 해제하지 못한다", async () => {
    const store = createMemoryMcpConnectionStore([
      { userId: "u1", clientId: "c1" },
    ]);
    expect(await store.revoke("u2", "c1", Date.now())).toBe(false);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
  });
});

describe("보호 리소스 메타데이터", () => {
  it("MCP 리소스와 인증 서버를 알려준다", async () => {
    const app = createApp();
    const response = await app.request(
      "https://api.example.test/.well-known/oauth-protected-resource/mcp",
      {},
      AUTH_TEST_ENV,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
      scopes_supported?: string[];
    };
    expect(body.resource).toBe("https://api.example.test/mcp");
    expect(body.authorization_servers).toEqual([
      "https://web.example.test/api/auth",
    ]);
    expect(body.scopes_supported).toContain("mcp");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-auth.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 바인딩 타입과 런타임 환경을 추가한다**

`apps/api/src/bindings/types.ts`의 `RuntimeBindingOverrides`에서 `BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED?: string;` 다음에 추가한다.

```ts
  /** MCP 보호 리소스 URL. 토큰 audience로 쓴다. 예: https://api.yonyoung.moveto.kr/mcp */
  MCP_RESOURCE_URL?: string;
  /** 액세스 토큰 issuer. 웹 도메인의 Better Auth 경로. 예: https://yonyoung.yonsei.ac.kr/api/auth */
  MCP_AUTH_ISSUER?: string;
```

`apps/api/src/lib/config/runtime-env.ts`에서 `AuthRuntimeEnv`에 두 필드를 추가한다.

```ts
export type AuthRuntimeEnv = {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  googleClientId: string;
  googleClientSecret: string;
  emailAndPasswordEnabled: boolean;
  mcpResourceUrl: string;
  mcpIssuer: string;
};
```

파일 끝에 추가한다.

```ts
export type McpRuntimeEnv = {
  resourceUrl: string;
  issuer: string;
  jwksUrl: string;
  resourceMetadataUrl: string;
};

/**
 * `/api/auth/*`는 BETTER_AUTH_URL을 요청 오리진으로 덮어쓰므로 issuer를 거기서 계산하면
 * API 도메인과 웹 도메인 요청이 서로 다른 값을 만든다. 운영에서는 두 값을 명시한다.
 */
export const resolveMcpRuntimeEnv = (
  env: Partial<AppBindings> | undefined,
): McpRuntimeEnv => {
  const authBaseUrl = normalizeUrl(
    readRuntimeString(env, "BETTER_AUTH_URL", AUTH_DEV_DEFAULTS.baseURL),
    { label: "BETTER_AUTH_URL" },
  );
  const resourceUrl = normalizeUrl(
    readBindingValue(env, "MCP_RESOURCE_URL") ??
      readProcessValue("MCP_RESOURCE_URL") ??
      `${authBaseUrl}/mcp`,
    { label: "MCP_RESOURCE_URL", preservePath: true },
  );
  const issuer = normalizeUrl(
    readBindingValue(env, "MCP_AUTH_ISSUER") ??
      readProcessValue("MCP_AUTH_ISSUER") ??
      `${authBaseUrl}/api/auth`,
    { label: "MCP_AUTH_ISSUER", preservePath: true },
  );
  const resource = new URL(resourceUrl);

  return {
    resourceUrl,
    issuer,
    jwksUrl: `${issuer}/jwks`,
    resourceMetadataUrl: `${resource.origin}/.well-known/oauth-protected-resource${resource.pathname}`,
  };
};
```

`resolveAuthRuntimeEnv`의 반환 객체에 두 필드를 넣는다.

```ts
const mcpEnv = resolveMcpRuntimeEnv(env);

return {
  baseURL,
  // ...기존 필드
  emailAndPasswordEnabled,
  mcpResourceUrl: mcpEnv.resourceUrl,
  mcpIssuer: mcpEnv.issuer,
};
```

- [ ] **Step 4: Better Auth에 jwt와 mcp 플러그인을 붙인다**

`apps/api/src/lib/auth.ts` 상단 import에 추가한다.

```ts
import { jwt, openAPI } from "better-auth/plugins";
import { mcp } from "@better-auth/mcp";
```

(기존 `import { openAPI } from "better-auth/plugins";` 줄을 위 줄로 바꾼다.)

파일 상단 상수 영역에 추가한다.

```ts
export const MCP_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "mcp",
];
const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const MCP_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
```

`betterAuth({...})` 설정에서 `basePath: "/api/auth",` 다음 줄에 추가한다.

```ts
    // jwt 플러그인의 /token은 OAuth 토큰 엔드포인트와 겹친다(Better Auth 문서 권장).
    disabledPaths: ["/token"],
```

`plugins` 배열을 다음으로 바꾼다.

```ts
    plugins: [
      openAPI({
        disableDefaultReference: true,
      }),
      // issuer는 요청 호스트와 무관하게 고정한다. MCP 리소스 서버가 같은 값으로 검증한다.
      jwt({ jwt: { issuer: env.mcpIssuer } }),
      mcp({
        loginPage: "/auth/sign-in",
        consentPage: "/auth/mcp-consent",
        resource: env.mcpResourceUrl,
        scopes: MCP_OAUTH_SCOPES,
        clientRegistrationDefaultScopes: MCP_OAUTH_SCOPES,
        // Claude·ChatGPT가 쓰는 DCR. CIMD는 Workers에서 DNS 고정을 보장할 수 없어 쓰지 않는다.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        accessTokenExpiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
        refreshTokenExpiresIn: MCP_REFRESH_TOKEN_TTL_SECONDS,
      }),
    ],
```

`buildAuthCacheSignature`의 배열 끝에 두 값을 추가한다.

```ts
    env.mcpResourceUrl,
    env.mcpIssuer,
```

- [ ] **Step 5: wrangler 변수를 추가한다**

`apps/api/wrangler.jsonc`의 최상위 `vars`에서 `"BETTER_AUTH_TRUSTED_ORIGINS"` 다음 줄에 추가한다.

```jsonc
    "MCP_RESOURCE_URL": "https://api.yonyoung.moveto.kr/mcp",
    "MCP_AUTH_ISSUER": "https://yonyoung.yonsei.ac.kr/api/auth",
```

`env.dev.vars`에도 추가한다. 로컬 개발은 웹이 3000, API가 8787이다.

```jsonc
        "MCP_RESOURCE_URL": "http://localhost:8787/mcp",
        "MCP_AUTH_ISSUER": "http://localhost:3000/api/auth",
```

```bash
pnpm cf-typegen
```

Expected: `worker-configuration.d.ts`에 두 변수가 추가된다.

- [ ] **Step 6: 인증기를 만든다**

`apps/api/src/features/mcp/mcp-auth.ts`:

```ts
import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import type { Context } from "hono";
import type { JWTPayload } from "jose";
import {
  resolveMcpRuntimeEnv,
  type McpRuntimeEnv,
} from "../../lib/config/runtime-env";
import type HonoAppType from "../../types/honoAppType";

export type McpTokenIdentity = {
  userId: string;
  clientId: string;
  scopes: string[];
};

export type McpRequestAuthenticator = (
  c: Context<HonoAppType>,
  onAuthenticated: (identity: McpTokenIdentity) => Promise<Response>,
) => Promise<Response>;

const MCP_REQUIRED_SCOPES = ["mcp"] as const;

export const toMcpTokenIdentity = (
  claims: JWTPayload,
): McpTokenIdentity | null => {
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const clientClaim = claims.azp ?? claims.client_id;
  const clientId = typeof clientClaim === "string" ? clientClaim : null;
  // client_credentials 토큰은 sub가 클라이언트 ID다. 사용자 없는 토큰은 받지 않는다.
  if (!userId || !clientId || userId === clientId) {
    return null;
  }
  const scopes =
    typeof claims.scope === "string"
      ? claims.scope.split(" ").filter(Boolean)
      : [];
  return { userId, clientId, scopes };
};

/** 헤더 값은 ASCII여야 하므로 사람이 읽을 한국어 설명은 JSON-RPC 본문에만 넣는다. */
export const mcpUnauthorizedResponse = (
  env: McpRuntimeEnv,
  message: string,
): Response =>
  new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer error="invalid_token", resource_metadata="${env.resourceMetadataUrl}"`,
      },
    },
  );

type ProtectedHandler = (request: Request) => Promise<Response>;

// 원격 JWKS 캐시를 요청 사이에 재사용하려면 보호 핸들러를 설정별로 한 번만 만든다.
// 요청마다 다른 후속 처리는 Request 객체를 키로 넘긴다.
const protectedHandlers = new Map<string, ProtectedHandler>();
const continuations = new WeakMap<
  Request,
  (identity: McpTokenIdentity) => Promise<Response>
>();

const getProtectedHandler = (env: McpRuntimeEnv): ProtectedHandler => {
  const key = `${env.issuer}|${env.resourceUrl}|${env.jwksUrl}`;
  const existing = protectedHandlers.get(key);
  if (existing) {
    return existing;
  }

  const handler = createMcpProtectedRequestHandler(
    {
      issuer: env.issuer,
      audience: env.resourceUrl,
      jwksUrl: env.jwksUrl,
      requiredScopes: MCP_REQUIRED_SCOPES,
    },
    async (request, claims) => {
      const identity = toMcpTokenIdentity(claims);
      if (!identity) {
        return mcpUnauthorizedResponse(
          env,
          "사용자 계정으로 발급된 토큰이 아닙니다.",
        );
      }
      const next = continuations.get(request);
      if (!next) {
        throw new Error("MCP 인증 후속 처리가 등록되지 않았습니다.");
      }
      return next(identity);
    },
  );
  protectedHandlers.set(key, handler);
  return handler;
};

export const createBetterAuthMcpAuthenticator =
  (): McpRequestAuthenticator => async (c, onAuthenticated) => {
    const request = c.req.raw;
    continuations.set(request, onAuthenticated);
    return getProtectedHandler(resolveMcpRuntimeEnv(c.env))(request);
  };
```

`jose`는 `@better-auth/mcp`의 의존성이다. 타입 import가 해석되지 않으면 `pnpm --filter @yonyoung/api add jose@<@better-auth/mcp가 쓰는 버전>`으로 직접 추가한다. 버전은 `pnpm --filter @yonyoung/api why jose`로 확인한다.

- [ ] **Step 7: 연결 저장소를 만든다**

`apps/api/src/features/mcp/mcp-connection-store.ts`:

```ts
export type McpConnection = {
  clientId: string;
  clientName: string | null;
  clientUri: string | null;
  scopes: string[];
  connectedAt: number;
  updatedAt: number;
};

export interface McpConnectionStore {
  hasConsent(userId: string, clientId: string): Promise<boolean>;
  list(userId: string): Promise<McpConnection[]>;
  /** 동의를 지우고 그 클라이언트의 토큰을 폐기한다. 지운 동의가 있었으면 true. */
  revoke(userId: string, clientId: string, now: number): Promise<boolean>;
}

type ConnectionDatabase = Pick<D1Database, "prepare" | "batch">;

type ConnectionRow = {
  client_id: string;
  name: string | null;
  uri: string | null;
  scopes: string | null;
  created_at: number | null;
  updated_at: number | null;
};

const parseScopes = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

/**
 * Better Auth oauth-provider 테이블을 직접 읽고 쓴다. delete-consent 엔드포인트는
 * 리프레시 토큰을 남기므로 연결 해제는 여기서 동의 삭제와 토큰 폐기를 한 batch로 처리한다.
 */
export const createD1McpConnectionStore = (
  database: ConnectionDatabase,
): McpConnectionStore => ({
  async hasConsent(userId, clientId) {
    const row = await database
      .prepare(
        "SELECT 1 AS found FROM oauth_consent WHERE user_id = ? AND client_id = ? LIMIT 1",
      )
      .bind(userId, clientId)
      .first<{ found: number }>();
    return row !== null;
  },

  async list(userId) {
    const result = await database
      .prepare(
        `
        SELECT c.client_id, oc.name, oc.uri, c.scopes, c.created_at, c.updated_at
        FROM oauth_consent c
        LEFT JOIN oauth_client oc ON oc.client_id = c.client_id
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
        `,
      )
      .bind(userId)
      .all<ConnectionRow>();
    return result.results.map((row) => ({
      clientId: row.client_id,
      clientName: row.name,
      clientUri: row.uri,
      scopes: parseScopes(row.scopes),
      connectedAt: Number(row.created_at ?? 0),
      updatedAt: Number(row.updated_at ?? row.created_at ?? 0),
    }));
  },

  async revoke(userId, clientId, now) {
    const [deleted] = await database.batch([
      database
        .prepare(
          "DELETE FROM oauth_consent WHERE user_id = ? AND client_id = ?",
        )
        .bind(userId, clientId),
      database
        .prepare(
          "UPDATE oauth_refresh_token SET revoked = ? WHERE user_id = ? AND client_id = ? AND revoked IS NULL",
        )
        .bind(now, userId, clientId),
      database
        .prepare(
          "UPDATE oauth_access_token SET revoked = ? WHERE user_id = ? AND client_id = ? AND revoked IS NULL",
        )
        .bind(now, userId, clientId),
    ]);
    return Number(deleted?.meta.changes ?? 0) > 0;
  },
});

export const createMemoryMcpConnectionStore = (
  seed: Array<{ userId: string; clientId: string; clientName?: string }> = [],
): McpConnectionStore => {
  const consents = new Map<string, McpConnection & { userId: string }>();
  const key = (userId: string, clientId: string) =>
    `${userId}\u0000${clientId}`;
  for (const entry of seed) {
    consents.set(key(entry.userId, entry.clientId), {
      userId: entry.userId,
      clientId: entry.clientId,
      clientName: entry.clientName ?? null,
      clientUri: null,
      scopes: ["openid", "mcp"],
      connectedAt: 0,
      updatedAt: 0,
    });
  }

  return {
    async hasConsent(userId, clientId) {
      return consents.has(key(userId, clientId));
    },
    async list(userId) {
      return [...consents.values()]
        .filter((consent) => consent.userId === userId)
        .map(({ userId: _userId, ...connection }) => connection);
    },
    async revoke(userId, clientId) {
      return consents.delete(key(userId, clientId));
    },
  };
};
```

- [ ] **Step 8: 의존성과 테스트 헬퍼를 확장한다**

`apps/api/src/lib/services/dependencies.ts`:

```ts
import { getActorFromSession, loadActorByUserId } from "../auth/session";
import {
  createBetterAuthMcpAuthenticator,
  type McpRequestAuthenticator,
} from "../../features/mcp/mcp-auth";
import {
  createD1McpConnectionStore,
  type McpConnectionStore,
} from "../../features/mcp/mcp-connection-store";
```

(`getActorFromSession` import 줄을 위 첫 줄로 바꾼다.)

`AppDependencies`에 추가한다.

```ts
authenticateMcpRequest: McpRequestAuthenticator;
loadActorByUserId: (c: Context<HonoAppType>, userId: string) =>
  Promise<Actor | null>;
getMcpConnectionStore: (c: Context<HonoAppType>) => McpConnectionStore;
```

`createDefaultDependencies`에 추가한다.

```ts
  authenticateMcpRequest: createBetterAuthMcpAuthenticator(),
  loadActorByUserId: (c, userId) =>
    loadActorByUserId(resolveD1Database(c.env), userId),
  getMcpConnectionStore: (c) =>
    createD1McpConnectionStore(resolveD1Database(c.env)),
```

`apps/api/src/tests/test-helpers.ts`의 `createTestApp` 입력 타입에 `overrides?: Partial<AppDependencies>;`를 추가하고, `createApp({...})` 객체 마지막 줄에 `...input.overrides,`를 넣는다. `AppDependencies`는 `../lib/services/dependencies`에서 import한다.

- [ ] **Step 9: 메타데이터 라우트를 만든다**

`apps/api/src/features/mcp/mcp.routes.ts`:

```ts
import type { OpenAPIHono } from "@hono/zod-openapi";
import { resolveD1Database } from "../../infra/db/client";
import { createAuth } from "../../lib/auth";
import type { AppDependencies } from "../../lib/services/dependencies";
import type HonoAppType from "../../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

const PROTECTED_RESOURCE_METADATA_PATHS = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

export const registerMcpRoutes = (app: App, _dependencies: AppDependencies) => {
  // RFC 9728 메타데이터는 @better-auth/mcp 플러그인의 onRequest가 만든다.
  app.on(["GET", "HEAD"], PROTECTED_RESOURCE_METADATA_PATHS, (c) =>
    createAuth(resolveD1Database(c.env), c.env).handler(c.req.raw),
  );
};
```

`_dependencies`는 Task 6에서 쓴다.

`apps/api/src/routes/index.ts`의 `mountDomainRouters` 마지막 `registerDocsRoutes(app, dependencies);` 앞에 추가한다.

```ts
registerMcpRoutes(app, dependencies);
```

import: `import { registerMcpRoutes } from "../features/mcp/mcp.routes";`

MCP 라우트는 내부 디스패치에서 루트 `app.fetch`를 써야 하므로 도메인 라우터가 아니라 `app`에 직접 등록한다.

- [ ] **Step 10: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-auth.test.ts src/tests/auth.routes.test.ts src/tests/auth-session.test.ts src/tests/auth-schema-parity.test.ts`
Expected: PASS

메타데이터 테스트가 404면 Better Auth 핸들러가 `basePath` 밖 경로에서 플러그인 `onRequest`를 부르지 않는 경우다. 이때는 라우트 핸들러를 다음으로 바꾼다. 플러그인과 같은 문서를 직접 만든다.

```ts
app.on(["GET", "HEAD"], PROTECTED_RESOURCE_METADATA_PATHS, (c) => {
  const env = resolveMcpRuntimeEnv(c.env);
  return c.json({
    resource: env.resourceUrl,
    authorization_servers: [env.issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
});
```

Run: `pnpm --filter @yonyoung/api test:node`
Expected: 기존 테스트 포함 전부 PASS. OpenAPI 스냅샷도 바뀌지 않는다.

- [ ] **Step 11: 커밋**

```bash
git add apps/api
git commit -m "feat(api): turn Better Auth into the MCP OAuth server

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

## 3단계: MCP 서버

### Task 6: 도구 프레임워크, MCP 엔드포인트, 조회 도구

**Files:**

- Create: `apps/api/src/features/mcp/exposure.ts`
- Create: `apps/api/src/features/mcp/tool-definition.ts`
- Create: `apps/api/src/features/mcp/mcp-server.ts`
- Create: `apps/api/src/features/mcp/tools/index.ts`
- Create: `apps/api/src/features/mcp/tools/{account,generation,activity,exhibition,linktree,attachment,member,settings,stats}.tools.ts`
- Modify: `apps/api/src/features/mcp/mcp.routes.ts`
- Create: `apps/api/src/tests/mcp-test-harness.ts`
- Test: `apps/api/src/tests/mcp-server.test.ts`

**Interfaces:**

- Consumes: `createInternalApiClient`, `fillPath`, `InternalApiRequest` (Task 3), `toToolResult`, `toolSuccess`, `toolFailure`, `describeApiFailure` (Task 3), `MCP_TOOL_CATALOG` (Task 1), `McpRequestAuthenticator`, `mcpUnauthorizedResponse`, `McpConnectionStore` (Task 5)
- Produces:
  - `isToolExposed(exposure: McpToolExposure, role: Role): boolean`
  - `listExposedTools(role: Role): McpToolCatalogEntry[]`
  - `type McpToolContext = { actor: Actor; api: InternalApiClient }` (Task 11, 12에서 필드 추가)
  - `type McpToolDefinition = { name: McpToolName; inputSchema: z.ZodObject; handler(args: unknown, context: McpToolContext): Promise<CallToolResult>; route?: { buildRequest(args: unknown, context: McpToolContext): InternalApiRequest } }`
  - `defineTool(...)`, `routeTool(...)`, `uuidArg(description: string)`
  - `buildMcpServer(context: McpToolContext, definitions: ReadonlyMap<McpToolName, McpToolDefinition>): McpServer`
  - `MCP_TOOL_DEFINITIONS: ReadonlyMap<McpToolName, McpToolDefinition>`
  - 테스트 헬퍼: `createMcpTestApp(input)`, `connectMcpClient(app, options?: { token?: string; env?: Record<string, unknown> })`, `resultText(result)`, `TEST_MCP_CLIENT_ID`

- [ ] **Step 1: 테스트 하네스를 만든다**

`apps/api/src/tests/mcp-test-harness.ts`:

```ts
import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
} from "@modelcontextprotocol/client";
import {
  createMemoryMcpConnectionStore,
  type McpConnectionStore,
} from "../features/mcp/mcp-connection-store";
import type { Actor } from "../lib/authorization/types";
import type { AppDependencies } from "../lib/services/dependencies";
import type { DataService, PresignService } from "../lib/services/types";
import { createTestApp } from "./test-helpers";

export const TEST_MCP_CLIENT_ID = "test-mcp-client";
export const TEST_MCP_TOKEN = "test-token";

type TestApp = ReturnType<typeof createTestApp>;

/**
 * MCP 테스트 앱. 세션 쿠키는 없고, Bearer test-token이면 getActor()의 사용자로 인증된다.
 * getActor는 요청마다 다시 불리므로 테스트 중간에 역할을 바꿀 수 있다.
 */
export const createMcpTestApp = (input: {
  getActor: () => Actor | null;
  consent?: boolean;
  dataService?: DataService;
  presignService?: PresignService;
  connectionStore?: McpConnectionStore;
  overrides?: Partial<AppDependencies>;
}): TestApp => {
  const initialActor = input.getActor();
  const connectionStore =
    input.connectionStore ??
    createMemoryMcpConnectionStore(
      initialActor && input.consent !== false
        ? [
            {
              userId: initialActor.id,
              clientId: TEST_MCP_CLIENT_ID,
              clientName: "Claude",
            },
          ]
        : [],
    );

  return createTestApp({
    actor: null,
    dataService: input.dataService,
    presignService: input.presignService,
    overrides: {
      authenticateMcpRequest: async (c, onAuthenticated) => {
        if (c.req.header("authorization") !== `Bearer ${TEST_MCP_TOKEN}`) {
          return new Response(null, { status: 401 });
        }
        return onAuthenticated({
          userId: initialActor?.id ?? "missing-user",
          clientId: TEST_MCP_CLIENT_ID,
          scopes: ["mcp"],
        });
      },
      loadActorByUserId: async (_c, userId) => {
        const actor = input.getActor();
        return actor && actor.id === userId ? actor : null;
      },
      getMcpConnectionStore: () => connectionStore,
      ...input.overrides,
    },
  });
};

/** env를 넘기면 바깥 요청과 내부 라우트 호출이 그 바인딩을 쓴다(예: 서명된 미디어 URL 검증). */
export const connectMcpClient = async (
  app: TestApp,
  options: { token?: string; env?: Record<string, unknown> } = {},
): Promise<Client> => {
  const client = new Client({ name: "yonyoung-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost/mcp"),
    {
      fetch: (url, init) => app.request(url, init, options.env as never),
      requestInit: {
        headers: { authorization: `Bearer ${options.token ?? TEST_MCP_TOKEN}` },
      },
    },
  );
  await client.connect(transport);
  return client;
};

export const resultText = (result: CallToolResult): string =>
  result.content
    .filter(
      (block): block is { type: "text"; text: string } => block.type === "text",
    )
    .map((block) => block.text)
    .join("\n");
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-server.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
} from "./mcp-test-harness";
import {
  IDs,
  createActivity,
  createActor,
  createDataServiceMock,
  createUser,
} from "./test-helpers";

const listToolNames = async (
  getActor: () => ReturnType<typeof createActor>,
) => {
  const client = await connectMcpClient(createMcpTestApp({ getActor }));
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name);
};

describe("MCP 엔드포인트 인증", () => {
  it("토큰이 틀리면 연결되지 않는다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member"),
    });
    await expect(
      connectMcpClient(app, { token: "wrong-token" }),
    ).rejects.toThrow();
  });

  it("동의가 해제된 연결은 거부한다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member"),
      consent: false,
    });
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("승인 대기 사용자는 연결되지 않는다", async () => {
    const app = createMcpTestApp({ getActor: () => createActor("unverified") });
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("삭제된 사용자는 연결되지 않는다", async () => {
    const actor = createActor("regular_member");
    let current: typeof actor | null = actor;
    const app = createMcpTestApp({ getActor: () => current });
    current = null;
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("GET /mcp는 405다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member"),
    });
    const response = await app.request("/mcp");
    expect(response.status).toBe(405);
  });
});

describe("역할별 도구 목록", () => {
  it("부원은 조회 도구와 본인 도구만 본다", async () => {
    const names = await listToolNames(() => createActor("regular_member"));
    expect(names).toContain("whoami");
    expect(names).toContain("activity_list");
    expect(names).not.toContain("dashboard_overview");
    expect(names).not.toContain("generation_create");
  });

  it("부장은 통계를 보지만 기수를 만들지 못한다", async () => {
    const names = await listToolNames(() =>
      createActor("manager", IDs.manager),
    );
    expect(names).toContain("dashboard_overview");
    expect(names).not.toContain("generation_create");
    expect(names).not.toContain("member_resource_history");
  });

  it("도구 정의는 카탈로그에 있는 이름만 쓴다", () => {
    const catalogNames = new Set<string>(
      MCP_TOOL_CATALOG.map((tool) => tool.name),
    );
    for (const name of MCP_TOOL_DEFINITIONS.keys()) {
      expect(catalogNames.has(name), name).toBe(true);
    }
  });

  it("조회 도구에는 readOnlyHint를 붙인다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("regular_member") }),
    );
    const { tools } = await client.listTools();
    const activityList = tools.find((tool) => tool.name === "activity_list");
    expect(activityList?.annotations?.readOnlyHint).toBe(true);
    expect(activityList?.annotations?.destructiveHint).toBe(false);
  });
});

describe("조회 도구 호출", () => {
  it("activity_list는 기존 라우트를 그대로 호출한다", async () => {
    const listActivities = vi.fn(async () => [createActivity()]);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("regular_member"),
        dataService: createDataServiceMock({ listActivities }),
      }),
    );

    const result = await client.callTool({
      name: "activity_list",
      arguments: { generationId: IDs.generation },
    });

    expect(result.isError).toBeFalsy();
    expect(resultText(result)).toContain("활동 목록입니다.");
    expect(listActivities).toHaveBeenCalledTimes(1);
  });

  it("whoami는 역할 이름과 쓸 수 있는 도구를 알려준다", async () => {
    const actor = createActor("manager", IDs.manager);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({
          getUserById: async () =>
            createUser({ id: IDs.manager, role: "manager" }),
        }),
      }),
    );

    const result = await client.callTool({ name: "whoami", arguments: {} });
    expect(resultText(result)).toContain("부장");
    const data = (
      result.structuredContent as { data: { tools: Array<{ name: string }> } }
    ).data;
    expect(data.tools.map((tool) => tool.name)).toContain("dashboard_overview");
  });

  it("역할이 강등되면 숨겨진 도구를 더는 실행하지 못한다", async () => {
    let actor = createActor("manager", IDs.manager);
    const deleteActivity = vi.fn(async () => true);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({ deleteActivity }),
      }),
    );
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      "activity_delete",
    );

    actor = createActor("regular_member", IDs.manager);
    const outcome = await client
      .callTool({ name: "activity_delete", arguments: { id: IDs.activity } })
      .then(
        (result) => result.isError === true,
        () => true,
      );

    expect(outcome).toBe(true);
    expect(deleteActivity).not.toHaveBeenCalled();
  });
});
```

`activity_delete`는 Task 7에서 정의된다. 이 마지막 테스트는 Task 7을 끝낸 뒤 통과한다. Task 6 Step 7에서는 이 테스트 하나만 실패하는 것이 정상이다.

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-server.test.ts`
Expected: FAIL — `Cannot find module '../features/mcp/tools'`

- [ ] **Step 4: 노출 판정과 도구 정의 도우미를 만든다**

`apps/api/src/features/mcp/exposure.ts`:

```ts
import {
  MCP_TOOL_CATALOG,
  type McpToolCatalogEntry,
  type McpToolExposure,
} from "@yonyoung/contracts/mcp";
import { can, isManagerLikeRole } from "../../lib/authorization/policy";
import type { Role } from "../../lib/authorization/types";

const LEADERSHIP_ROLES: ReadonlySet<Role> = new Set([
  "president",
  "vice_president",
]);

export const isToolExposed = (
  exposure: McpToolExposure,
  role: Role,
): boolean => {
  if (role === "unverified") {
    return false;
  }
  switch (exposure.kind) {
    case "verified":
      return true;
    case "manager_like":
      return isManagerLikeRole(role);
    case "leadership":
      return LEADERSHIP_ROLES.has(role);
    case "permission":
      return exposure.anyOf.some(({ resource, action }) =>
        can(role, resource, action),
      );
  }
};

export const listExposedTools = (role: Role): McpToolCatalogEntry[] =>
  MCP_TOOL_CATALOG.filter((tool) => isToolExposed(tool.exposure, role));
```

`apps/api/src/features/mcp/tool-definition.ts`:

```ts
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { McpToolName } from "@yonyoung/contracts/mcp";
import { z } from "zod";
import type { Actor } from "../../lib/authorization/types";
import {
  fillPath,
  type InternalApiClient,
  type InternalApiMethod,
  type InternalApiQuery,
  type InternalApiRequest,
} from "./internal-api";
import { toToolResult } from "./tool-result";

export type McpToolContext = {
  actor: Actor;
  api: InternalApiClient;
};

export type McpToolDefinition = {
  name: McpToolName;
  inputSchema: z.ZodObject;
  handler: (args: unknown, context: McpToolContext) => Promise<CallToolResult>;
  /** 기존 라우트 하나를 그대로 호출하는 도구. 노출 일치 테스트가 이 요청을 직접 보낸다. */
  route?: {
    buildRequest: (
      args: unknown,
      context: McpToolContext,
    ) => InternalApiRequest;
  };
};

export const uuidArg = (description: string) => z.uuid().describe(description);

export const defineTool = <TSchema extends z.ZodObject>(definition: {
  name: McpToolName;
  inputSchema: TSchema;
  handler: (
    args: z.output<TSchema>,
    context: McpToolContext,
  ) => Promise<CallToolResult>;
}): McpToolDefinition => ({
  name: definition.name,
  inputSchema: definition.inputSchema,
  handler: (args, context) =>
    definition.handler(args as z.output<TSchema>, context),
});

type RouteRequestParts = {
  pathParams?: Record<string, string>;
  query?: InternalApiQuery;
  body?: unknown;
};

const PATH_PARAM_PATTERN = /\{(\w+)\}/g;

/**
 * 도구 입력 규칙(경로 파라미터는 최상위, 본문은 data, 배열 본문은 items)으로
 * 라우트 요청을 만든다. GET은 경로 파라미터를 뺀 나머지를 쿼리로 보낸다.
 */
const buildDefaultRequest = (
  path: string,
  method: InternalApiMethod,
  args: Record<string, unknown>,
): RouteRequestParts => {
  const pathKeys = [...path.matchAll(PATH_PARAM_PATTERN)].map(
    (match) => match[1]!,
  );
  const pathParams = Object.fromEntries(
    pathKeys.map((key) => [key, String(args[key])]),
  );
  if (method === "GET") {
    const query = Object.fromEntries(
      Object.entries(args).filter(([key]) => !pathKeys.includes(key)),
    ) as InternalApiQuery;
    return { pathParams, query };
  }
  const body =
    "data" in args ? args.data : "items" in args ? args.items : undefined;
  return { pathParams, body };
};

export const routeTool = <TSchema extends z.ZodObject>(definition: {
  name: McpToolName;
  method: InternalApiMethod;
  path: string;
  inputSchema: TSchema;
  summary: string;
  toRequest?: (
    args: z.output<TSchema>,
    context: McpToolContext,
  ) => RouteRequestParts;
}): McpToolDefinition => {
  const buildRequest = (
    args: unknown,
    context: McpToolContext,
  ): InternalApiRequest => {
    const parts = definition.toRequest
      ? definition.toRequest(args as z.output<TSchema>, context)
      : buildDefaultRequest(
          definition.path,
          definition.method,
          args as Record<string, unknown>,
        );
    return {
      method: definition.method,
      path: fillPath(definition.path, parts.pathParams ?? {}),
      query: parts.query,
      body: parts.body,
    };
  };

  return {
    name: definition.name,
    inputSchema: definition.inputSchema,
    route: { buildRequest },
    handler: async (args, context) =>
      toToolResult(await context.api.call(buildRequest(args, context)), {
        summary: definition.summary,
        role: context.actor.role,
      }),
  };
};
```

- [ ] **Step 5: 조회 도구를 만든다**

`apps/api/src/features/mcp/tools/account.tools.ts`:

```ts
import { CORE_ROLE_LABELS } from "@yonyoung/contracts/auth-roles";
import { z } from "zod";
import { listExposedTools } from "../exposure";
import { defineTool } from "../tool-definition";
import { describeApiFailure, toolFailure, toolSuccess } from "../tool-result";

export const accountTools = [
  defineTool({
    name: "whoami",
    inputSchema: z.object({}),
    handler: async (_args, context) => {
      const result = await context.api.call({
        method: "GET",
        path: "/api/users/me",
      });
      if (!result.ok) {
        return toolFailure(describeApiFailure(result, context.actor.role));
      }
      const roleLabel = CORE_ROLE_LABELS[context.actor.role];
      const tools = listExposedTools(context.actor.role).map((tool) => ({
        name: tool.name,
        title: tool.title,
      }));
      return toolSuccess(
        `${context.actor.name}님은 ${roleLabel} 역할로 연결되어 있습니다. 쓸 수 있는 도구는 ${tools.length}개입니다.`,
        { user: result.data, role: context.actor.role, roleLabel, tools },
      );
    },
  }),
];
```

`apps/api/src/features/mcp/tools/generation.tools.ts`:

```ts
import { z } from "zod";
import { routeTool, uuidArg } from "../tool-definition";

const byId = z.object({ id: uuidArg("기수 ID. generation_list로 찾습니다.") });

export const generationTools = [
  routeTool({
    name: "generation_list",
    method: "GET",
    path: "/api/generations",
    inputSchema: z.object({}),
    summary: "기수 목록입니다.",
  }),
  routeTool({
    name: "generation_get",
    method: "GET",
    path: "/api/generations/{id}",
    inputSchema: byId,
    summary: "기수 정보입니다.",
  }),
  routeTool({
    name: "generation_members",
    method: "GET",
    path: "/api/generations/{id}/members",
    inputSchema: byId,
    summary: "기수 멤버 목록입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/activity.tools.ts`:

```ts
import { z } from "zod";
import { ApiListActivitiesQuerySchema } from "../../activities/activity.contract";
import { routeTool, uuidArg } from "../tool-definition";

const activityId = uuidArg("활동 ID. activity_list로 찾습니다.");

export const activityTools = [
  routeTool({
    name: "activity_list",
    method: "GET",
    path: "/api/activities",
    inputSchema: ApiListActivitiesQuerySchema,
    summary: "활동 목록입니다.",
  }),
  routeTool({
    name: "activity_get",
    method: "GET",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동 정보입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/exhibition.tools.ts`:

```ts
import { z } from "zod";
import { ApiListExhibitionsQuerySchema } from "../../exhibitions/exhibition.contract";
import { routeTool, uuidArg } from "../tool-definition";

const exhibitionId = uuidArg("전시 ID. exhibition_list로 찾습니다.");

export const exhibitionTools = [
  routeTool({
    name: "exhibition_list",
    method: "GET",
    path: "/api/exhibitions",
    inputSchema: ApiListExhibitionsQuerySchema,
    summary: "전시 목록입니다.",
  }),
  routeTool({
    name: "exhibition_get",
    method: "GET",
    path: "/api/exhibitions/{id}",
    inputSchema: z.object({ id: exhibitionId }),
    summary: "전시 정보입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/linktree.tools.ts`:

```ts
import { z } from "zod";
import { routeTool, uuidArg } from "../tool-definition";

const linktreeId = uuidArg("링크 모음 ID. linktree_list로 찾습니다.");

export const linktreeTools = [
  routeTool({
    name: "linktree_list",
    method: "GET",
    path: "/api/linktree",
    inputSchema: z.object({}),
    summary: "링크 모음 목록입니다.",
  }),
  routeTool({
    name: "linktree_get",
    method: "GET",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId }),
    summary: "링크 모음 정보입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/attachment.tools.ts`:

```ts
import { ApiAttachmentListQuerySchema } from "../../attachments/attachment.contract";
import { routeTool } from "../tool-definition";

export const attachmentTools = [
  routeTool({
    name: "attachment_list",
    method: "GET",
    path: "/api/attachments",
    inputSchema: ApiAttachmentListQuerySchema,
    summary: "첨부 자료 목록입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/member.tools.ts`:

```ts
import { z } from "zod";
import { ApiUserResourceHistoryQuerySchema } from "../../users/user.contract";
import { routeTool } from "../tool-definition";

const userId = z.string().min(1).describe("멤버 ID. member_list로 찾습니다.");

export const memberTools = [
  routeTool({
    name: "member_list",
    method: "GET",
    path: "/api/users",
    inputSchema: z.object({}),
    summary: "멤버 목록입니다.",
  }),
  routeTool({
    name: "member_get",
    method: "GET",
    path: "/api/users/{id}",
    inputSchema: z.object({ id: userId }),
    summary: "멤버 정보입니다.",
  }),
  routeTool({
    name: "member_resource_history",
    method: "GET",
    path: "/api/users/{id}/resource-history",
    inputSchema: z.object({
      id: userId,
      ...ApiUserResourceHistoryQuerySchema.shape,
    }),
    summary: "멤버 작업 이력입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/settings.tools.ts`:

```ts
import { z } from "zod";
import { routeTool } from "../tool-definition";

export const settingsTools = [
  routeTool({
    name: "site_settings_get",
    method: "GET",
    path: "/api/site-settings",
    inputSchema: z.object({}),
    summary: "사이트 설정입니다.",
  }),
  routeTool({
    name: "recruiting_plan_get",
    method: "GET",
    path: "/api/recruiting-plan/current",
    inputSchema: z.object({}),
    summary: "올해 모집 계획입니다. 저장된 계획이 없으면 data가 null입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/stats.tools.ts`:

```ts
import { z } from "zod";
import {
  ApiAuditParamSchema,
  ApiAuditQuerySchema,
} from "../../audit/audit.contract";
import { ApiAdminDashboardStatsQuerySchema } from "../../dashboard/dashboard.contract";
import { routeTool } from "../tool-definition";

export const statsTools = [
  routeTool({
    name: "dashboard_overview",
    method: "GET",
    path: "/api/admin/dashboard",
    inputSchema: ApiAdminDashboardStatsQuerySchema,
    summary: "대시보드 요약입니다.",
  }),
  routeTool({
    name: "page_view_stats",
    method: "GET",
    path: "/api/admin/page-views/stats",
    inputSchema: z.object({}),
    summary: "방문 통계입니다.",
  }),
  routeTool({
    name: "page_view_dashboard",
    method: "GET",
    path: "/api/admin/page-views/dashboard",
    inputSchema: z.object({}),
    summary: "방문 추이입니다.",
  }),
  routeTool({
    name: "audit_log_get",
    method: "GET",
    path: "/api/audit/{resourceType}/{resourceId}",
    inputSchema: z.object({
      ...ApiAuditParamSchema.shape,
      ...ApiAuditQuerySchema.shape,
    }),
    summary: "변경 기록입니다.",
  }),
];
```

`apps/api/src/features/mcp/tools/index.ts`:

```ts
import type { McpToolName } from "@yonyoung/contracts/mcp";
import type { McpToolDefinition } from "../tool-definition";
import { accountTools } from "./account.tools";
import { activityTools } from "./activity.tools";
import { attachmentTools } from "./attachment.tools";
import { exhibitionTools } from "./exhibition.tools";
import { generationTools } from "./generation.tools";
import { linktreeTools } from "./linktree.tools";
import { memberTools } from "./member.tools";
import { settingsTools } from "./settings.tools";
import { statsTools } from "./stats.tools";

const ALL_TOOLS: McpToolDefinition[] = [
  ...accountTools,
  ...generationTools,
  ...activityTools,
  ...exhibitionTools,
  ...linktreeTools,
  ...attachmentTools,
  ...memberTools,
  ...settingsTools,
  ...statsTools,
];

export const MCP_TOOL_DEFINITIONS: ReadonlyMap<McpToolName, McpToolDefinition> =
  new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));
```

- [ ] **Step 6: 서버 생성기와 `/mcp` 라우트를 만든다**

`apps/api/src/features/mcp/mcp-server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import type { McpToolName } from "@yonyoung/contracts/mcp";
import { listExposedTools } from "./exposure";
import type { McpToolContext, McpToolDefinition } from "./tool-definition";

const MCP_SERVER_INFO = { name: "yonyoung-dashboard", version: "1.0.0" };

const MCP_SERVER_INSTRUCTIONS = [
  "연영 홈페이지 대시보드를 다루는 도구입니다.",
  "- 무엇을 할 수 있는지 모르면 whoami를 먼저 호출하세요.",
  "- ID가 필요한 도구는 generation_list, activity_list 같은 목록 도구로 ID를 먼저 찾으세요.",
  "- 삭제나 역할 변경처럼 되돌리기 어려운 작업은 실행 전에 사용자에게 확인하세요.",
  "- Claude에서 채팅에 첨부한 파일을 올릴 때: upload_prepare → 코드 실행 환경에서 `curl -sS -T <파일> <put_url>` → 실패하면 사용자에게 browser_url을 안내하고 upload_status로 완료 확인 → upload_id를 파일 도구에 넘깁니다.",
  "- ChatGPT에서는 채팅에 올린 파일이 파일 인자로 자동 전달됩니다.",
].join("\n");

/**
 * 요청한 사용자의 역할로 노출되는 도구만 등록한 서버를 만든다.
 * 요청마다 새로 만들므로 역할이 바뀌면 다음 요청부터 목록이 달라진다.
 */
export const buildMcpServer = (
  context: McpToolContext,
  definitions: ReadonlyMap<McpToolName, McpToolDefinition>,
): McpServer => {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  for (const tool of listExposedTools(context.actor.role)) {
    const definition = definitions.get(tool.name);
    if (!definition) {
      continue;
    }
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: definition.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.readOnly,
          destructiveHint: tool.destructive,
          openWorldHint: false,
        },
        ...(tool.fileArgs.length > 0
          ? { _meta: { "openai/fileParams": [...tool.fileArgs] } }
          : {}),
      },
      (args) => definition.handler(args, context),
    );
  }

  return server;
};
```

정의가 없는 카탈로그 항목은 건너뛴다. 모든 항목이 정의되었는지는 Task 13의 1:1 테스트가 보장한다.

`apps/api/src/features/mcp/mcp.routes.ts`를 다음으로 바꾼다.

```ts
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { Context } from "hono";
import type { Bindings } from "../../bindings/types";
import { resolveD1Database } from "../../infra/db/client";
import { createAuth } from "../../lib/auth";
import type { Actor } from "../../lib/authorization/types";
import { resolveMcpRuntimeEnv } from "../../lib/config/runtime-env";
import type { AppDependencies } from "../../lib/services/dependencies";
import type HonoAppType from "../../types/honoAppType";
import { createInternalApiClient, type InternalDispatch } from "./internal-api";
import { mcpUnauthorizedResponse } from "./mcp-auth";
import { buildMcpServer } from "./mcp-server";
import type { McpToolContext } from "./tool-definition";
import { MCP_TOOL_DEFINITIONS } from "./tools";

type App = OpenAPIHono<HonoAppType>;

const PROTECTED_RESOURCE_METADATA_PATHS = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

const mcpForbiddenResponse = (message: string): Response =>
  new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32003, message },
      id: null,
    }),
    { status: 403, headers: { "content-type": "application/json" } },
  );

const readExecutionContext = (
  c: Context<HonoAppType>,
): ExecutionContext | undefined => {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
};

const createMcpToolContext = (
  c: Context<HonoAppType>,
  input: { actor: Actor; dispatch: InternalDispatch },
): McpToolContext => ({
  actor: input.actor,
  api: createInternalApiClient({
    dispatch: input.dispatch,
    env: c.env,
    executionCtx: readExecutionContext(c),
    actor: input.actor,
    origin: new URL(c.req.url).origin,
    requestId: c.get("requestId") ?? crypto.randomUUID(),
  }),
});

export const registerMcpRoutes = (app: App, dependencies: AppDependencies) => {
  const dispatch: InternalDispatch = (request, env, executionCtx) =>
    app.fetch(request, env as Bindings, executionCtx);

  // RFC 9728 메타데이터는 @better-auth/mcp 플러그인의 onRequest가 만든다.
  app.on(["GET", "HEAD"], PROTECTED_RESOURCE_METADATA_PATHS, (c) =>
    createAuth(resolveD1Database(c.env), c.env).handler(c.req.raw),
  );

  app.post("/mcp", (c) =>
    dependencies.authenticateMcpRequest(c, async (identity) => {
      const mcpEnv = resolveMcpRuntimeEnv(c.env);
      const connections = dependencies.getMcpConnectionStore(c);
      if (!(await connections.hasConsent(identity.userId, identity.clientId))) {
        return mcpUnauthorizedResponse(
          mcpEnv,
          "연결이 해제되었습니다. 커넥터를 다시 연결해 주세요.",
        );
      }

      const actor = await dependencies.loadActorByUserId(c, identity.userId);
      if (!actor) {
        return mcpUnauthorizedResponse(
          mcpEnv,
          "계정을 찾을 수 없습니다. 다시 연결해 주세요.",
        );
      }
      if (actor.role === "unverified") {
        return mcpForbiddenResponse("관리자 승인 후 사용할 수 있습니다.");
      }

      const context = createMcpToolContext(c, { actor, dispatch });
      const handler = createMcpHandler(() =>
        buildMcpServer(context, MCP_TOOL_DEFINITIONS),
      );
      return handler.fetch(c.req.raw);
    }),
  );

  app.on(["GET", "DELETE"], "/mcp", (c) =>
    c.body(null, 405, { Allow: "POST" }),
  );
};
```

Task 5 Step 10에서 메타데이터 라우트를 직접 응답으로 바꿨다면 그 구현을 그대로 둔다.

- [ ] **Step 7: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-server.test.ts`
Expected: "역할이 강등되면…" 1개만 FAIL(`activity_delete` 미정의), 나머지 PASS

도구 목록 테스트가 JSON Schema 변환 오류로 실패하면, 오류 메시지가 가리키는 스키마가 Standard Schema `~standard.jsonSchema`를 제공하는지 확인한다. 2026-10-08에 모든 요청 스키마의 변환을 확인했다.

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/features/mcp apps/api/src/tests/mcp-test-harness.ts apps/api/src/tests/mcp-server.test.ts
git commit -m "feat(api): serve role-filtered MCP tools over /mcp

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 7: 파일이 없는 쓰기 도구

**Files:**

- Modify: `apps/api/src/features/mcp/tools/{account,generation,activity,exhibition,linktree,attachment,member,settings}.tools.ts`
- Test: `apps/api/src/tests/mcp-write-tools.test.ts`

**Interfaces:**

- Consumes: `routeTool`, `uuidArg` (Task 6), 각 feature contract의 요청 스키마
- Produces: 도구 25개 — `my_profile_update`, `generation_create/update/reorder/delete`, `activity_delete`, `activity_image_update`, `activity_images_update`, `activity_image_delete`, `exhibition_delete`, `exhibition_image_update`, `exhibition_images_update`, `exhibition_image_delete`, `linktree_create/update/delete`, `linktree_item_add/update/delete`, `attachment_update/delete`, `member_update`, `member_bulk_role`, `member_delete`, `site_settings_update`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-write-tools.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
} from "./mcp-test-harness";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createLinktree,
  createUser,
} from "./test-helpers";

describe("쓰기 도구", () => {
  it("generation_create는 data를 그대로 본문으로 보낸다", async () => {
    const createGenerationMock = vi.fn(async () => createGeneration());
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
        dataService: createDataServiceMock({
          createGeneration: createGenerationMock,
        }),
      }),
    );

    const data = {
      name: "99기",
      sortOrder: 99,
      startDate: Date.UTC(2030, 2, 1),
      endDate: Date.UTC(2031, 1, 28),
    };
    const result = await client.callTool({
      name: "generation_create",
      arguments: { data },
    });

    expect(result.isError).toBeFalsy();
    expect(createGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "99기" }),
    );
  });

  it("my_profile_update는 항상 본인 ID로 보낸다", async () => {
    const actor = createActor("regular_member", IDs.member);
    const updateUser = vi.fn(async () =>
      createUser({ id: IDs.member, department: "시각디자인학과" }),
    );
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({
          getUserById: async () => createUser({ id: IDs.member }),
          updateUser,
        }),
      }),
    );

    const result = await client.callTool({
      name: "my_profile_update",
      arguments: { data: { department: "시각디자인학과" } },
    });

    expect(result.isError).toBeFalsy();
    expect(updateUser).toHaveBeenCalledWith(
      IDs.member,
      expect.anything(),
      expect.anything(),
    );
  });

  it("linktree_item_delete는 경로 파라미터를 채워 DELETE를 보낸다", async () => {
    const deleteLinktreeItem = vi.fn(async () => true);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("manager", IDs.manager),
        dataService: createDataServiceMock({
          getLinktreeById: async () => createLinktree(),
          deleteLinktreeItem,
        }),
      }),
    );

    const result = await client.callTool({
      name: "linktree_item_delete",
      arguments: { id: IDs.linktree, itemId: IDs.linktreeItem },
    });

    expect(result.isError).toBeFalsy();
    expect(deleteLinktreeItem).toHaveBeenCalled();
  });

  it("파괴적 도구에는 destructiveHint가 붙는다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
      }),
    );
    const { tools } = await client.listTools();
    const destructive = tools
      .filter((tool) => tool.annotations?.destructiveHint === true)
      .map((tool) => tool.name);
    expect(destructive).toEqual(
      expect.arrayContaining([
        "generation_delete",
        "member_update",
        "member_delete",
      ]),
    );
  });

  it("라우트가 거부하면 역할과 사유를 담은 오류를 돌려준다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("vice_president", IDs.vicePresident),
        dataService: createDataServiceMock({
          getUserById: async () =>
            createUser({ id: IDs.president, role: "president" }),
        }),
      }),
    );

    const result = await client.callTool({
      name: "member_update",
      arguments: { id: IDs.president, data: { role: "regular_member" } },
    });

    expect(result.isError).toBe(true);
    const text = resultText(result);
    expect(text).toContain("현재 역할(부회장)");
    expect(text).toContain(
      "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
    );
  });
});
```

`updateUser`의 실제 시그니처는 `apps/api/src/lib/services/types.ts`의 `DataService.updateUser`를 따른다. 인자 수가 다르면 `toHaveBeenCalledWith`의 나머지 인자를 맞춘다. 첫 인자가 사용자 ID라는 점만 검증한다.

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-write-tools.test.ts`
Expected: FAIL — `generation_create` 등 도구 없음

- [ ] **Step 3: 쓰기 도구를 추가한다**

`exhibition.contract.ts`의 `ExhibitionInputObjectSchema`는 Task 13에서 export한다. 이 Task에서는 건드리지 않는다.

`account.tools.ts`의 배열에 추가하고 import를 보탠다.

```ts
import { ApiMemberProfileUpdateSchema } from "../../users/user.contract";
import { defineTool, routeTool } from "../tool-definition";

  routeTool({
    name: "my_profile_update",
    method: "PATCH",
    path: "/api/users/{id}",
    inputSchema: z.object({
      data: ApiMemberProfileUpdateSchema.describe("바꿀 프로필 필드만 넣습니다."),
    }),
    toRequest: (args, context) => ({
      pathParams: { id: context.actor.id },
      body: args.data,
    }),
    summary: "내 프로필을 수정했습니다.",
  }),
```

`generation.tools.ts`:

```ts
import {
  ApiCreateGenerationSchema,
  ApiReorderGenerationsSchema,
  ApiUpdateGenerationSchema,
} from "../../generations/generation.contract";

  routeTool({
    name: "generation_create",
    method: "POST",
    path: "/api/generations",
    inputSchema: z.object({
      data: ApiCreateGenerationSchema.describe("날짜는 밀리초 단위 Unix 시간입니다."),
    }),
    summary: "기수를 만들었습니다.",
  }),
  routeTool({
    name: "generation_update",
    method: "PATCH",
    path: "/api/generations/{id}",
    inputSchema: z.object({
      id: uuidArg("기수 ID"),
      data: ApiUpdateGenerationSchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "기수를 수정했습니다.",
  }),
  routeTool({
    name: "generation_reorder",
    method: "POST",
    path: "/api/generations/reorder",
    inputSchema: z.object({ data: ApiReorderGenerationsSchema }),
    summary: "기수 순서를 바꿨습니다.",
  }),
  routeTool({
    name: "generation_delete",
    method: "DELETE",
    path: "/api/generations/{id}",
    inputSchema: byId,
    summary: "기수를 삭제했습니다.",
  }),
```

`activity.tools.ts`:

```ts
import {
  ApiListActivitiesQuerySchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
} from "../../activities/activity.contract";

const imageId = uuidArg("세부 이미지 ID. activity_get 결과의 detailImages[].id입니다.");

  routeTool({
    name: "activity_delete",
    method: "DELETE",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동을 삭제했습니다.",
  }),
  routeTool({
    name: "activity_image_update",
    method: "PATCH",
    path: "/api/activities/{id}/images/{imageId}",
    inputSchema: z.object({ id: activityId, imageId, data: ApiUpdateActivityImageSchema }),
    summary: "세부 이미지를 수정했습니다.",
  }),
  routeTool({
    name: "activity_images_update",
    method: "PATCH",
    path: "/api/activities/{id}/images/batch",
    inputSchema: z.object({ id: activityId, items: ApiUpdateActivityImageBatchSchema }),
    summary: "세부 이미지들을 수정했습니다.",
  }),
  routeTool({
    name: "activity_image_delete",
    method: "DELETE",
    path: "/api/activities/{id}/images/{imageId}",
    inputSchema: z.object({ id: activityId, imageId }),
    summary: "세부 이미지를 삭제했습니다.",
  }),
```

`exhibition.tools.ts`:

```ts
import {
  ApiListExhibitionsQuerySchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
} from "../../exhibitions/exhibition.contract";

const imageId = uuidArg("세부 이미지 ID. exhibition_get 결과의 detailImages[].id입니다.");

  routeTool({
    name: "exhibition_delete",
    method: "DELETE",
    path: "/api/exhibitions/{id}",
    inputSchema: z.object({ id: exhibitionId }),
    summary: "전시를 삭제했습니다.",
  }),
  routeTool({
    name: "exhibition_image_update",
    method: "PATCH",
    path: "/api/exhibitions/{id}/images/{imageId}",
    inputSchema: z.object({ id: exhibitionId, imageId, data: ApiUpdateExhibitionImageSchema }),
    summary: "세부 이미지를 수정했습니다.",
  }),
  routeTool({
    name: "exhibition_images_update",
    method: "PATCH",
    path: "/api/exhibitions/{id}/images/batch",
    inputSchema: z.object({ id: exhibitionId, items: ApiUpdateExhibitionImageBatchSchema }),
    summary: "세부 이미지들을 수정했습니다.",
  }),
  routeTool({
    name: "exhibition_image_delete",
    method: "DELETE",
    path: "/api/exhibitions/{id}/images/{imageId}",
    inputSchema: z.object({ id: exhibitionId, imageId }),
    summary: "세부 이미지를 삭제했습니다.",
  }),
```

`linktree.tools.ts`:

```ts
import {
  ApiCreateLinktreeItemSchema,
  ApiCreateLinktreeSchema,
  ApiUpdateLinktreeItemSchema,
  ApiUpdateLinktreeSchema,
} from "../../linktree/linktree.contract";

const itemId = uuidArg("링크 ID. linktree_get 결과의 items[].id입니다.");

  routeTool({
    name: "linktree_create",
    method: "POST",
    path: "/api/linktree",
    inputSchema: z.object({ data: ApiCreateLinktreeSchema }),
    summary: "링크 모음을 만들었습니다.",
  }),
  routeTool({
    name: "linktree_update",
    method: "PATCH",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId, data: ApiUpdateLinktreeSchema }),
    summary: "링크 모음을 수정했습니다.",
  }),
  routeTool({
    name: "linktree_delete",
    method: "DELETE",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId }),
    summary: "링크 모음을 삭제했습니다.",
  }),
  routeTool({
    name: "linktree_item_add",
    method: "POST",
    path: "/api/linktree/{id}/items",
    inputSchema: z.object({ id: linktreeId, data: ApiCreateLinktreeItemSchema }),
    summary: "링크를 추가했습니다.",
  }),
  routeTool({
    name: "linktree_item_update",
    method: "PATCH",
    path: "/api/linktree/{id}/items/{itemId}",
    inputSchema: z.object({ id: linktreeId, itemId, data: ApiUpdateLinktreeItemSchema }),
    summary: "링크를 수정했습니다.",
  }),
  routeTool({
    name: "linktree_item_delete",
    method: "DELETE",
    path: "/api/linktree/{id}/items/{itemId}",
    inputSchema: z.object({ id: linktreeId, itemId }),
    summary: "링크를 삭제했습니다.",
  }),
```

`attachment.tools.ts`:

```ts
import { z } from "zod";
import {
  ApiAttachmentListQuerySchema,
  ApiUpdateAttachmentSchema,
} from "../../attachments/attachment.contract";
import { routeTool, uuidArg } from "../tool-definition";

const attachmentId = uuidArg("첨부 자료 ID. attachment_list로 찾습니다.");

  routeTool({
    name: "attachment_update",
    method: "PATCH",
    path: "/api/attachments/{id}",
    inputSchema: z.object({ id: attachmentId, data: ApiUpdateAttachmentSchema }),
    summary: "첨부 자료를 수정했습니다.",
  }),
  routeTool({
    name: "attachment_delete",
    method: "DELETE",
    path: "/api/attachments/{id}",
    inputSchema: z.object({ id: attachmentId }),
    summary: "첨부 자료를 삭제했습니다.",
  }),
```

`member.tools.ts`:

```ts
import {
  ApiAdminUpdateUserSchema,
  ApiBulkUpdateUserRoleSchema,
  ApiUserResourceHistoryQuerySchema,
} from "../../users/user.contract";

  routeTool({
    name: "member_update",
    method: "PATCH",
    path: "/api/users/{id}",
    inputSchema: z.object({
      id: userId,
      data: ApiAdminUpdateUserSchema.describe("바꿀 필드만 넣습니다. 역할은 role, 기수는 generationIds입니다."),
    }),
    summary: "멤버 정보를 수정했습니다.",
  }),
  routeTool({
    name: "member_bulk_role",
    method: "PATCH",
    path: "/api/users/bulk-role",
    inputSchema: z.object({ data: ApiBulkUpdateUserRoleSchema }),
    summary: "멤버 역할을 일괄 변경했습니다.",
  }),
  routeTool({
    name: "member_delete",
    method: "DELETE",
    path: "/api/users/{id}",
    inputSchema: z.object({ id: userId }),
    summary: "멤버를 삭제했습니다.",
  }),
```

`settings.tools.ts`:

```ts
import { ApiUpdateSiteSettingsSchema } from "../../site-settings/site-settings.contract";

  routeTool({
    name: "site_settings_update",
    method: "PATCH",
    path: "/api/site-settings",
    inputSchema: z.object({
      data: ApiUpdateSiteSettingsSchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "사이트 설정을 수정했습니다.",
  }),
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-write-tools.test.ts src/tests/mcp-server.test.ts`
Expected: PASS (Task 6의 "역할이 강등되면…" 포함)

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/features/mcp/tools apps/api/src/tests/mcp-write-tools.test.ts
git commit -m "feat(api): add MCP write tools that delegate to existing routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 8: 노출 일치 테스트와 권한 위임 테스트

이 Task는 테스트만 추가한다. 테스트가 실패하면 고칠 곳은 **카탈로그의 노출 조건**이다. 라우트 가드는 고치지 않는다.

**Files:**

- Test: `apps/api/src/tests/mcp-exposure.test.ts`

**Interfaces:**

- Consumes: `MCP_TOOL_DEFINITIONS`, `isToolExposed` (Task 6), `createInternalApiClient` (Task 3)

- [ ] **Step 1: 테스트를 쓴다**

`apps/api/src/tests/mcp-exposure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CORE_ROLE_VALUES } from "@yonyoung/contracts/auth-roles";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { isToolExposed } from "../features/mcp/exposure";
import { createInternalApiClient } from "../features/mcp/internal-api";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import type { McpToolContext } from "../features/mcp/tool-definition";
import type { Actor, Role } from "../lib/authorization/types";
import type { DataService } from "../lib/services/types";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
} from "./mcp-test-harness";
import {
  IDs,
  buildManagedFileUrl,
  createActivity,
  createActor,
  createAttachment,
  createDataServiceMock,
  createExhibition,
  createGeneration,
  createLinktree,
  createTestApp,
  createUser,
} from "./test-helpers";

const VERIFIED_ROLES = CORE_ROLE_VALUES.filter((role) => role !== "unverified");

const ACTOR_ID_BY_ROLE: Record<Role, string> = {
  president: IDs.president,
  vice_president: IDs.vicePresident,
  manager: IDs.manager,
  new_member: IDs.member,
  associate_member: IDs.member,
  regular_member: IDs.member,
  unverified: IDs.member,
};

const generationData = {
  name: "99기",
  sortOrder: 99,
  startDate: Date.UTC(2030, 2, 1),
  endDate: Date.UTC(2031, 1, 28),
};

/** 라우트 검증을 통과하는 최소 입력. 검증에서 422가 나면 권한 판정까지 가지 못한다. */
const sampleArgs = (name: string, actor: Actor): Record<string, unknown> => {
  const samples: Record<string, Record<string, unknown>> = {
    generation_list: {},
    generation_get: { id: IDs.generation },
    generation_members: { id: IDs.generation },
    generation_create: { data: generationData },
    generation_update: { id: IDs.generation, data: { name: "99기" } },
    generation_reorder: {
      data: {
        items: [
          { id: IDs.generation, sortOrder: 1 },
          { id: IDs.generationAlt, sortOrder: 0 },
        ],
      },
    },
    generation_delete: { id: IDs.generation },
    activity_list: {},
    activity_get: { id: IDs.activity },
    activity_delete: { id: IDs.activity },
    activity_image_update: {
      id: IDs.activity,
      imageId: IDs.activityImage,
      data: { sortOrder: 1 },
    },
    activity_images_update: {
      id: IDs.activity,
      items: [{ imageId: IDs.activityImage, sortOrder: 1 }],
    },
    activity_image_delete: { id: IDs.activity, imageId: IDs.activityImage },
    exhibition_list: {},
    exhibition_get: { id: IDs.exhibition },
    exhibition_delete: { id: IDs.exhibition },
    exhibition_image_update: {
      id: IDs.exhibition,
      imageId: IDs.exhibitionImage,
      data: { sortOrder: 1 },
    },
    exhibition_images_update: {
      id: IDs.exhibition,
      items: [{ imageId: IDs.exhibitionImage, sortOrder: 1 }],
    },
    exhibition_image_delete: {
      id: IDs.exhibition,
      imageId: IDs.exhibitionImage,
    },
    linktree_list: {},
    linktree_get: { id: IDs.linktree },
    linktree_create: { data: { name: "공식 링크" } },
    linktree_update: { id: IDs.linktree, data: { name: "새 이름" } },
    linktree_delete: { id: IDs.linktree },
    linktree_item_add: {
      id: IDs.linktree,
      data: { name: "인스타그램", link: "https://instagram.com/yonyoung" },
    },
    linktree_item_update: {
      id: IDs.linktree,
      itemId: IDs.linktreeItem,
      data: { name: "인스타" },
    },
    linktree_item_delete: { id: IDs.linktree, itemId: IDs.linktreeItem },
    attachment_list: { scope: "activity", resourceId: IDs.activity },
    attachment_update: { id: IDs.attachment, data: { title: "새 제목" } },
    attachment_delete: { id: IDs.attachment },
    member_list: {},
    member_get: { id: actor.id },
    member_resource_history: { id: IDs.otherUser },
    member_update: { id: IDs.otherUser, data: { role: "regular_member" } },
    member_bulk_role: {
      data: { userIds: [IDs.otherUser], role: "regular_member" },
    },
    member_delete: { id: IDs.otherUser },
    my_profile_update: { data: { department: "시각디자인학과" } },
    site_settings_get: {},
    site_settings_update: { data: { footerPhone: "02-000-0000" } },
    recruiting_plan_get: {},
    dashboard_overview: {},
    page_view_stats: {},
    page_view_dashboard: {},
    audit_log_get: { resourceType: "activity", resourceId: IDs.activity },
  };
  const sample = samples[name];
  if (!sample) {
    throw new Error(`${name}의 샘플 입력이 없습니다.`);
  }
  return sample;
};

/**
 * 조회 메서드만 고정 데이터를 돌려주고 나머지는 예외(→500)를 던진다.
 * 데이터를 읽은 뒤 권한을 판정하는 라우트도 403까지 도달하게 한다.
 */
const createExposureDataService = (): DataService =>
  createDataServiceMock({
    getGenerationById: async () => createGeneration(),
    getActivityById: async () => createActivity(),
    getExhibitionById: async () => createExhibition(),
    getLinktreeById: async () => createLinktree(),
    // 기본 픽스처는 회장단 전용인 site_donate다. 노출 조건(활동 자료 기준)과 맞추려면 activity 자료로 둔다.
    getAttachmentById: async () =>
      createAttachment({
        scope: "activity",
        resourceId: IDs.activity,
        fileUrl: buildManagedFileUrl("activities"),
      }),
    getUserById: async (id: string) =>
      createUser({ id, role: "regular_member" }),
  });

describe("노출 조건 ↔ 라우트 가드 일치", () => {
  const routeTools = [...MCP_TOOL_DEFINITIONS.values()].filter(
    (tool) => tool.route,
  );

  it.each(VERIFIED_ROLES)(
    "%s: 노출된 도구는 403이 아니고 숨긴 도구는 403이다",
    async (role) => {
      const actor = createActor(role, ACTOR_ID_BY_ROLE[role]);
      const app = createTestApp({
        actor: null,
        dataService: createExposureDataService(),
      });
      const api = createInternalApiClient({
        dispatch: (request, env) => app.fetch(request, env as never),
        env: undefined,
        actor,
        origin: "http://localhost",
        requestId: "exposure-test",
      });
      const context: McpToolContext = { actor, api } as McpToolContext;

      const mismatches: string[] = [];
      for (const tool of routeTools) {
        const entry = MCP_TOOL_CATALOG.find((item) => item.name === tool.name)!;
        const exposed = isToolExposed(entry.exposure, role);
        const result = await api.call(
          tool.route!.buildRequest(sampleArgs(tool.name, actor), context),
        );
        if (
          result.ok === false &&
          (result.status === 400 || result.status === 422)
        ) {
          mismatches.push(
            `${tool.name}: 샘플 입력이 검증에서 거부됨 (${result.message})`,
          );
          continue;
        }
        const forbidden = !result.ok && result.status === 403;
        if (exposed === forbidden) {
          mismatches.push(
            `${tool.name}: 노출=${exposed}, 라우트 응답=${result.ok ? result.status : result.status}`,
          );
        }
      }

      expect(mismatches).toEqual([]);
    },
  );
});

describe("MCP 경유 권한 위임", () => {
  it("마지막 회장은 MCP로도 본인을 강등할 수 없다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
        dataService: createDataServiceMock({
          getUserById: async () =>
            createUser({ id: IDs.president, role: "president" }),
          countUsersByRole: async () => 1,
        }),
      }),
    );

    const result = await client.callTool({
      name: "member_update",
      arguments: { id: IDs.president, data: { role: "regular_member" } },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain(
      "회장 권한은 최소 1명 이상 유지되어야 합니다.",
    );
  });

  it("부회장은 MCP로 기수를 삭제할 수 없다(도구가 보이지 않는다)", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("vice_president", IDs.vicePresident),
      }),
    );
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain("generation_delete");
  });

  it("부원은 다른 멤버 프로필을 수정할 수 없다(도구가 보이지 않는다)", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("regular_member", IDs.member),
      }),
    );
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain("member_update");
  });
});
```

`getUserById` mock의 타입이 `DataService`와 맞지 않으면 `async (id: string) => ...`의 반환 타입을 `UserEntity`로 명시한다.

- [ ] **Step 2: 테스트를 실행한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-exposure.test.ts`
Expected: PASS

실패 메시지의 `mismatches` 줄을 보고 다음처럼 고친다.

- `노출=true, 라우트 응답=403`: 카탈로그 노출 조건이 너무 넓다. 라우트 가드에 맞게 좁힌다.
- `노출=false, 라우트 응답=500`(또는 200, 204): 카탈로그가 너무 좁다. 넓힌다.
- `샘플 입력이 검증에서 거부됨`: 메시지에 나온 필드로 `sampleArgs`를 고친다.
- 라우트가 데이터를 읽은 뒤 판정하는데 `createExposureDataService`에 그 조회가 없어 500이 나는 경우: 그 조회 메서드를 추가한다.

카탈로그를 고쳤다면 Task 0의 스펙 표도 같이 고친다.

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/tests/mcp-exposure.test.ts packages/contracts/src/api/mcp.ts docs/superpowers/specs/2026-10-08-dashboard-mcp-design.md
git commit -m "test(api): pin MCP tool exposure to the route guards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

## 4단계: 파일 업로드

### Task 9: 파일 형식 판별과 스트림 도우미

**Files:**

- Create: `apps/api/src/features/mcp/files/file-sniff.ts`
- Create: `apps/api/src/features/mcp/files/byte-stream.ts`
- Create: `apps/api/src/tests/mcp-file-fixtures.ts`
- Test: `apps/api/src/tests/mcp-file-sniff.test.ts`

**Interfaces:**

- Produces:
  - `SNIFF_BYTES = 64 * 1024`
  - `matchesDeclaredType(contentType: string, head: Uint8Array): boolean`
  - `readImageDimensions(contentType: string, head: Uint8Array): { width: number; height: number } | null`
  - `peekStream(stream: ReadableStream<Uint8Array>, size: number): Promise<{ head: Uint8Array; stream: ReadableStream<Uint8Array> }>`
  - `class StreamLengthMismatchError extends Error`
  - `enforceExactLength(stream: ReadableStream<Uint8Array>, expected: number): ReadableStream<Uint8Array>`
  - 테스트 픽스처: `pngBytes(w, h)`, `jpegBytes(w, h)`, `gifBytes(w, h)`, `webpBytes(w, h)`, `avifBytes(w, h)`, `pdfBytes()`, `streamOf(bytes, chunkSize?)`

- [ ] **Step 1: 테스트 픽스처를 만든다**

`apps/api/src/tests/mcp-file-fixtures.ts`:

```ts
const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));
const u16be = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u16le = (value: number) => [value & 0xff, (value >> 8) & 0xff];
const u24le = (value: number) => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
];
const u32be = (value: number) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

/** 서명 + IHDR 청크(가로·세로)만 있는 최소 PNG 머리. */
export const pngBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32be(13),
    ...ascii("IHDR"),
    ...u32be(width),
    ...u32be(height),
    8,
    6,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);

/** SOI + APP0(JFIF) + SOF0 + EOI. */
export const jpegBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    ...u16be(16),
    ...ascii("JFIF"),
    0x00,
    0x01,
    0x01,
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    0x00,
    0xff,
    0xc0,
    ...u16be(17),
    0x08,
    ...u16be(height),
    ...u16be(width),
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
    0xff,
    0xd9,
  ]);

export const gifBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    ...ascii("GIF89a"),
    ...u16le(width),
    ...u16le(height),
    0,
    0,
    0,
  ]);

/** RIFF/WEBP + VP8X 청크. 가로·세로는 1을 뺀 24비트 값으로 저장된다. */
export const webpBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    ...ascii("RIFF"),
    0,
    0,
    0,
    0,
    ...ascii("WEBP"),
    ...ascii("VP8X"),
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...u24le(width - 1),
    ...u24le(height - 1),
  ]);

/** ftyp(avif) 박스 + ispe 박스. */
export const avifBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    ...u32be(24),
    ...ascii("ftyp"),
    ...ascii("avif"),
    0,
    0,
    0,
    0,
    ...ascii("mif1"),
    ...ascii("avif"),
    ...u32be(20),
    ...ascii("ispe"),
    0,
    0,
    0,
    0,
    ...u32be(width),
    ...u32be(height),
  ]);

export const pdfBytes = (): Uint8Array =>
  new Uint8Array(ascii("%PDF-1.7\n%âã\n1 0 obj\n"));

export const streamOf = (
  bytes: Uint8Array,
  chunkSize = 7,
): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        controller.enqueue(bytes.slice(offset, offset + chunkSize));
      }
      controller.close();
    },
  });
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-file-sniff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  StreamLengthMismatchError,
  enforceExactLength,
  peekStream,
} from "../features/mcp/files/byte-stream";
import {
  matchesDeclaredType,
  readImageDimensions,
} from "../features/mcp/files/file-sniff";
import {
  avifBytes,
  gifBytes,
  jpegBytes,
  pdfBytes,
  pngBytes,
  streamOf,
  webpBytes,
} from "./mcp-file-fixtures";

describe("형식 판별", () => {
  it.each([
    ["image/png", pngBytes(3, 2)],
    ["image/jpeg", jpegBytes(3, 2)],
    ["image/gif", gifBytes(3, 2)],
    ["image/webp", webpBytes(3, 2)],
    ["image/avif", avifBytes(3, 2)],
    ["application/pdf", pdfBytes()],
  ] as const)("%s 매직 바이트를 인식한다", (contentType, bytes) => {
    expect(matchesDeclaredType(contentType, bytes)).toBe(true);
  });

  it("선언과 내용이 다르면 거부한다", () => {
    expect(matchesDeclaredType("image/jpeg", pngBytes(1, 1))).toBe(false);
    expect(matchesDeclaredType("application/pdf", pngBytes(1, 1))).toBe(false);
  });

  it("zip 기반 문서(xlsx, docx, hwpx)는 PK 서명으로 인식한다", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
    expect(
      matchesDeclaredType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        zip,
      ),
    ).toBe(true);
    expect(matchesDeclaredType("application/vnd.hancom.hwpx", zip)).toBe(true);
  });

  it("OLE 기반 문서(xls, hwp)는 CFB 서명으로 인식한다", () => {
    const cfb = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
    ]);
    expect(matchesDeclaredType("application/vnd.ms-excel", cfb)).toBe(true);
    expect(matchesDeclaredType("application/x-hwp", cfb)).toBe(true);
  });

  it("허용 목록에 없는 형식은 거부한다", () => {
    expect(matchesDeclaredType("text/html", new Uint8Array([0x3c]))).toBe(
      false,
    );
  });
});

describe("이미지 크기", () => {
  it.each([
    ["image/png", pngBytes(640, 480)],
    ["image/jpeg", jpegBytes(640, 480)],
    ["image/gif", gifBytes(640, 480)],
    ["image/webp", webpBytes(640, 480)],
    ["image/avif", avifBytes(640, 480)],
  ] as const)("%s 머리에서 가로·세로를 읽는다", (contentType, bytes) => {
    expect(readImageDimensions(contentType, bytes)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("읽을 수 없으면 null이다", () => {
    expect(
      readImageDimensions("image/jpeg", new Uint8Array([0xff, 0xd8, 0x00])),
    ).toBeNull();
    expect(readImageDimensions("application/pdf", pdfBytes())).toBeNull();
  });
});

describe("스트림 도우미", () => {
  it("앞부분을 엿봐도 전체 바이트를 그대로 다시 읽을 수 있다", async () => {
    const bytes = pngBytes(10, 10);
    const { head, stream } = await peekStream(streamOf(bytes), 16);
    expect([...head.subarray(0, 8)]).toEqual([...bytes.subarray(0, 8)]);
    const replayed = new Uint8Array(await new Response(stream).arrayBuffer());
    expect([...replayed]).toEqual([...bytes]);
  });

  it("선언 길이와 같으면 통과한다", async () => {
    const bytes = pdfBytes();
    const out = await new Response(
      enforceExactLength(streamOf(bytes), bytes.length),
    ).arrayBuffer();
    expect(out.byteLength).toBe(bytes.length);
  });

  it("짧거나 길면 StreamLengthMismatchError로 끝난다", async () => {
    const bytes = pdfBytes();
    await expect(
      new Response(
        enforceExactLength(streamOf(bytes), bytes.length + 1),
      ).arrayBuffer(),
    ).rejects.toBeInstanceOf(StreamLengthMismatchError);
    await expect(
      new Response(
        enforceExactLength(streamOf(bytes), bytes.length - 1),
      ).arrayBuffer(),
    ).rejects.toBeInstanceOf(StreamLengthMismatchError);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-file-sniff.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 4: `file-sniff.ts`를 만든다**

```ts
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
} from "../../../lib/storage/presign";

/** 형식 판별과 이미지 크기 읽기에 쓰는 앞부분 크기. JPEG는 EXIF 뒤에 SOF가 와서 넉넉히 잡는다. */
export const SNIFF_BYTES = 64 * 1024;

const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  bytes.length >= signature.length &&
  signature.every((byte, index) => bytes[index] === byte);

const HEIF_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
];
const AVIF_BRANDS = ["avif", "avis"];

const hasFtypBrand = (bytes: Uint8Array, brands: readonly string[]): boolean =>
  ascii(bytes, 4, 4) === "ftyp" && brands.includes(ascii(bytes, 8, 4));

const isZip = (bytes: Uint8Array) =>
  startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
const isCfb = (bytes: Uint8Array) =>
  startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const SIGNATURE_BY_TYPE: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) =>
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (bytes) => ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6)),
  "image/webp": (bytes) =>
    ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP",
  "image/avif": (bytes) => hasFtypBrand(bytes, AVIF_BRANDS),
  "image/heic": (bytes) => hasFtypBrand(bytes, HEIF_BRANDS),
  "image/heif": (bytes) => hasFtypBrand(bytes, HEIF_BRANDS),
  "application/pdf": (bytes) => ascii(bytes, 0, 5) === "%PDF-",
  "application/zip": isZip,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    isZip,
  "application/vnd.hancom.hwpx": isZip,
  "application/vnd.ms-excel": isCfb,
  "application/x-hwp": isCfb,
  "application/haansofthwp": isCfb,
  "application/vnd.hancom.hwp": isCfb,
};

const ALLOWED_TYPES = new Set<string>([
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  ...ALLOWED_ATTACHMENT_CONTENT_TYPES,
]);

/** 파일 앞부분이 선언한 형식의 서명과 맞는지 본다. 허용 목록 밖의 형식은 항상 false. */
export const matchesDeclaredType = (
  contentType: string,
  head: Uint8Array,
): boolean => {
  if (!ALLOWED_TYPES.has(contentType)) {
    return false;
  }
  return SIGNATURE_BY_TYPE[contentType]?.(head) ?? false;
};

type Dimensions = { width: number; height: number };

const view = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const readPng = (bytes: Uint8Array): Dimensions | null =>
  bytes.length >= 24 && ascii(bytes, 12, 4) === "IHDR"
    ? { width: view(bytes).getUint32(16), height: view(bytes).getUint32(20) }
    : null;

const readGif = (bytes: Uint8Array): Dimensions | null =>
  bytes.length >= 10
    ? {
        width: view(bytes).getUint16(6, true),
        height: view(bytes).getUint16(8, true),
      }
    : null;

const readUint24le = (bytes: Uint8Array, offset: number) =>
  bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);

const readWebp = (bytes: Uint8Array): Dimensions | null => {
  if (bytes.length < 30) {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    return {
      width: readUint24le(bytes, 24) + 1,
      height: readUint24le(bytes, 27) + 1,
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: view(bytes).getUint16(26, true) & 0x3fff,
      height: view(bytes).getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21]!;
    const b1 = bytes[22]!;
    const b2 = bytes[23]!;
    const b3 = bytes[24]!;
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  return null;
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const readJpeg = (bytes: Uint8Array): Dimensions | null => {
  const data = view(bytes);
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (SOF_MARKERS.has(marker)) {
      return {
        height: data.getUint16(offset + 5),
        width: data.getUint16(offset + 7),
      };
    }
    offset += 2 + data.getUint16(offset + 2);
  }
  return null;
};

/** HEIF 계열(AVIF·HEIC)은 ispe 박스에 원본 크기가 있다. */
const readIspe = (bytes: Uint8Array): Dimensions | null => {
  for (let index = 0; index + 16 <= bytes.length; index += 1) {
    if (ascii(bytes, index, 4) === "ispe") {
      return {
        width: view(bytes).getUint32(index + 8),
        height: view(bytes).getUint32(index + 12),
      };
    }
  }
  return null;
};

const READER_BY_TYPE: Record<string, (bytes: Uint8Array) => Dimensions | null> =
  {
    "image/png": readPng,
    "image/gif": readGif,
    "image/webp": readWebp,
    "image/jpeg": readJpeg,
    "image/avif": readIspe,
    "image/heic": readIspe,
    "image/heif": readIspe,
  };

/** EXIF 회전은 반영하지 않는다. 대시보드 업로드도 원본 픽셀 크기를 저장한다. */
export const readImageDimensions = (
  contentType: string,
  head: Uint8Array,
): Dimensions | null => {
  const dimensions = READER_BY_TYPE[contentType]?.(head) ?? null;
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return null;
  }
  return dimensions;
};
```

- [ ] **Step 5: `byte-stream.ts`를 만든다**

```ts
/**
 * 스트림 앞부분을 읽어 돌려주고, 읽은 부분을 포함한 전체를 다시 읽을 수 있는 스트림을 준다.
 * 형식 검사를 R2에 쓰기 전에 끝내려고 쓴다.
 */
export const peekStream = async (
  stream: ReadableStream<Uint8Array>,
  size: number,
): Promise<{ head: Uint8Array; stream: ReadableStream<Uint8Array> }> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let finished = false;

  while (total < size) {
    const { done, value } = await reader.read();
    if (done) {
      finished = true;
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  const head = new Uint8Array(Math.min(total, size));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= head.length) {
      break;
    }
    const part = chunk.subarray(0, head.length - offset);
    head.set(part, offset);
    offset += part.length;
  }

  const replay = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      if (finished) {
        controller.close();
      }
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return { head, stream: replay };
};

export class StreamLengthMismatchError extends Error {
  constructor(expected: number, received: number) {
    super(`받은 바이트(${received})가 선언한 크기(${expected})와 다릅니다.`);
    this.name = "StreamLengthMismatchError";
  }
}

/** 선언한 바이트 수와 정확히 같아야 정상 종료되는 스트림. */
export const enforceExactLength = (
  stream: ReadableStream<Uint8Array>,
  expected: number,
): ReadableStream<Uint8Array> => {
  let received = 0;
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > expected) {
          controller.error(new StreamLengthMismatchError(expected, received));
          return;
        }
        controller.enqueue(chunk);
      },
      flush() {
        if (received !== expected) {
          throw new StreamLengthMismatchError(expected, received);
        }
      },
    }),
  );
};
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-file-sniff.test.ts`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/features/mcp/files apps/api/src/tests/mcp-file-fixtures.ts apps/api/src/tests/mcp-file-sniff.test.ts
git commit -m "feat(api): sniff MCP upload types and read image dimensions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 10: 업로드 저장소, 객체 저장소, 객체 키 발급

**Files:**

- Create: `apps/api/src/features/mcp/files/mcp-upload-store.ts`
- Create: `apps/api/src/features/mcp/files/mcp-object-store.ts`
- Modify: `apps/api/src/lib/services/types.ts` (`PresignService.allocateManagedObject`)
- Modify: `apps/api/src/lib/storage/presign.ts` (구현)
- Modify: `apps/api/vitest.workers.config.ts`, `apps/api/tests/setup/cloudflare-test.d.ts`
- Test: `apps/api/src/tests/mcp-upload-store.test.ts`
- Test: `apps/api/tests/integration/mcp-stores.runtime.test.ts`

**Interfaces:**

- Consumes: `mcp_uploads`, `oauth_*` 테이블 (Task 4), `McpConnectionStore` (Task 5)
- Produces:
  - `type McpUploadRecord = { id; tokenHash; userId; purpose: McpUploadPurpose; fileName; contentType; declaredSize: number; objectKey; publicUrl; width: number | null; height: number | null; reservationId: string | null; status: McpUploadStatus; expiresAt: number; createdAt: number; completedAt: number | null }`
  - `interface McpUploadStore { create; getById; getByTokenHash; beginReceiving(id, now): Promise<boolean>; complete(id, { width, height, completedAt }); fail(id); claim(ids, userId): Promise<string[]>; release(ids): Promise<void> }`
  - `createD1McpUploadStore(database)`, `createMemoryMcpUploadStore()`
  - `interface McpObjectStore { put(objectKey, body, { contentType, size }): Promise<void>; delete(objectKey): Promise<void> }`
  - `createR2McpObjectStore(bucket: R2Bucket)`, `createMemoryMcpObjectStore(): McpObjectStore & { objects: Map<string, { bytes: Uint8Array; contentType: string }> }`
  - `PresignService.allocateManagedObject(input: { actorId; resource; slot; fileName }): Promise<{ objectKey: string; publicUrl: string }>`

- [ ] **Step 1: 실패하는 메모리 저장소 테스트를 쓴다**

`apps/api/src/tests/mcp-upload-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createMemoryMcpUploadStore,
  type McpUploadRecord,
} from "../features/mcp/files/mcp-upload-store";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import { streamOf } from "./mcp-file-fixtures";

const record = (overrides: Partial<McpUploadRecord> = {}): McpUploadRecord => ({
  id: "up-1",
  tokenHash: "hash-1",
  userId: "u1",
  purpose: "activity_image",
  fileName: "a.png",
  contentType: "image/png",
  declaredSize: 10,
  objectKey: "activities/u1/detail/a.png",
  publicUrl: "https://cdn.example.test/a.png",
  width: null,
  height: null,
  reservationId: "res-1",
  status: "pending",
  expiresAt: Date.now() + 60_000,
  createdAt: Date.now(),
  completedAt: null,
  ...overrides,
});

describe("메모리 업로드 저장소", () => {
  it("동시 수신은 한 번만 시작된다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    const results = await Promise.all([
      store.beginReceiving("up-1", Date.now()),
      store.beginReceiving("up-1", Date.now()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("만료된 업로드는 수신을 시작하지 않는다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record({ expiresAt: Date.now() - 1 }));
    expect(await store.beginReceiving("up-1", Date.now())).toBe(false);
  });

  it("완료된 업로드만, 소유자만 claim할 수 있고 두 번째 claim은 비어 있다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    await store.beginReceiving("up-1", Date.now());
    await store.complete("up-1", {
      width: 3,
      height: 2,
      completedAt: Date.now(),
    });

    expect(await store.claim(["up-1"], "other")).toEqual([]);
    expect(await store.claim(["up-1"], "u1")).toEqual(["up-1"]);
    expect(await store.claim(["up-1"], "u1")).toEqual([]);

    await store.release(["up-1"]);
    expect((await store.getById("up-1"))?.status).toBe("completed");
  });

  it("토큰 해시로 찾는다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    expect((await store.getByTokenHash("hash-1"))?.id).toBe("up-1");
    expect(await store.getByTokenHash("nope")).toBeNull();
  });
});

describe("메모리 객체 저장소", () => {
  it("스트림을 모두 읽어 저장한다", async () => {
    const objects = createMemoryMcpObjectStore();
    await objects.put("k", streamOf(new Uint8Array([1, 2, 3])), {
      contentType: "image/png",
      size: 3,
    });
    expect([...objects.objects.get("k")!.bytes]).toEqual([1, 2, 3]);
    await objects.delete("k");
    expect(objects.objects.has("k")).toBe(false);
  });
});
```

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-upload-store.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 2: 업로드 저장소를 만든다**

`apps/api/src/features/mcp/files/mcp-upload-store.ts`:

```ts
import type {
  McpUploadPurpose,
  McpUploadStatus,
} from "@yonyoung/contracts/mcp";

export type McpUploadRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  purpose: McpUploadPurpose;
  fileName: string;
  contentType: string;
  declaredSize: number;
  objectKey: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  reservationId: string | null;
  status: McpUploadStatus;
  expiresAt: number;
  createdAt: number;
  completedAt: number | null;
};

export interface McpUploadStore {
  create(record: McpUploadRecord): Promise<void>;
  getById(id: string): Promise<McpUploadRecord | null>;
  getByTokenHash(tokenHash: string): Promise<McpUploadRecord | null>;
  /** pending이고 만료 전일 때만 receiving으로 바꾼다. 동시 PUT 중 하나만 true를 받는다. */
  beginReceiving(id: string, now: number): Promise<boolean>;
  complete(
    id: string,
    input: { width: number | null; height: number | null; completedAt: number },
  ): Promise<void>;
  fail(id: string): Promise<void>;
  /** completed인 소유자의 업로드를 consumed로 바꾸고 바뀐 ID를 돌려준다. */
  claim(ids: string[], userId: string): Promise<string[]>;
  /** 도구 호출이 실패했을 때 consumed를 completed로 되돌린다. */
  release(ids: string[]): Promise<void>;
}

type UploadRow = {
  id: string;
  token_hash: string;
  user_id: string;
  purpose: string;
  file_name: string;
  content_type: string;
  declared_size: number;
  object_key: string;
  public_url: string;
  width: number | null;
  height: number | null;
  reservation_id: string | null;
  status: string;
  expires_at: number;
  created_at: number;
  completed_at: number | null;
};

const toRecord = (row: UploadRow): McpUploadRecord => ({
  id: row.id,
  tokenHash: row.token_hash,
  userId: row.user_id,
  purpose: row.purpose as McpUploadPurpose,
  fileName: row.file_name,
  contentType: row.content_type,
  declaredSize: Number(row.declared_size),
  objectKey: row.object_key,
  publicUrl: row.public_url,
  width: row.width === null ? null : Number(row.width),
  height: row.height === null ? null : Number(row.height),
  reservationId: row.reservation_id,
  status: row.status as McpUploadStatus,
  expiresAt: Number(row.expires_at),
  createdAt: Number(row.created_at),
  completedAt: row.completed_at === null ? null : Number(row.completed_at),
});

const placeholders = (count: number) =>
  Array.from({ length: count }, () => "?").join(", ");

export const createD1McpUploadStore = (
  database: Pick<D1Database, "prepare">,
): McpUploadStore => ({
  async create(record) {
    await database
      .prepare(
        `
        INSERT INTO mcp_uploads (
          id, token_hash, user_id, purpose, file_name, content_type, declared_size,
          object_key, public_url, width, height, reservation_id, status,
          expires_at, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        record.id,
        record.tokenHash,
        record.userId,
        record.purpose,
        record.fileName,
        record.contentType,
        record.declaredSize,
        record.objectKey,
        record.publicUrl,
        record.width,
        record.height,
        record.reservationId,
        record.status,
        record.expiresAt,
        record.createdAt,
        record.completedAt,
      )
      .run();
  },

  async getById(id) {
    const row = await database
      .prepare("SELECT * FROM mcp_uploads WHERE id = ? LIMIT 1")
      .bind(id)
      .first<UploadRow>();
    return row ? toRecord(row) : null;
  },

  async getByTokenHash(tokenHash) {
    const row = await database
      .prepare("SELECT * FROM mcp_uploads WHERE token_hash = ? LIMIT 1")
      .bind(tokenHash)
      .first<UploadRow>();
    return row ? toRecord(row) : null;
  },

  async beginReceiving(id, now) {
    const result = await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'receiving' WHERE id = ? AND status = 'pending' AND expires_at > ?",
      )
      .bind(id, now)
      .run();
    return Number(result.meta.changes ?? 0) === 1;
  },

  async complete(id, input) {
    await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'completed', width = ?, height = ?, completed_at = ? WHERE id = ? AND status = 'receiving'",
      )
      .bind(input.width, input.height, input.completedAt, id)
      .run();
  },

  async fail(id) {
    await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'failed' WHERE id = ? AND status IN ('pending', 'receiving')",
      )
      .bind(id)
      .run();
  },

  async claim(ids, userId) {
    if (ids.length === 0) {
      return [];
    }
    const result = await database
      .prepare(
        `UPDATE mcp_uploads SET status = 'consumed'
         WHERE user_id = ? AND status = 'completed' AND id IN (${placeholders(ids.length)})
         RETURNING id`,
      )
      .bind(userId, ...ids)
      .all<{ id: string }>();
    return result.results.map((row) => row.id);
  },

  async release(ids) {
    if (ids.length === 0) {
      return;
    }
    await database
      .prepare(
        `UPDATE mcp_uploads SET status = 'completed'
         WHERE status = 'consumed' AND id IN (${placeholders(ids.length)})`,
      )
      .bind(...ids)
      .run();
  },
});

export const createMemoryMcpUploadStore = (): McpUploadStore => {
  const records = new Map<string, McpUploadRecord>();
  const update = (id: string, patch: Partial<McpUploadRecord>) => {
    const current = records.get(id);
    if (current) {
      records.set(id, { ...current, ...patch });
    }
  };

  return {
    async create(record) {
      records.set(record.id, { ...record });
    },
    async getById(id) {
      return records.get(id) ?? null;
    },
    async getByTokenHash(tokenHash) {
      return (
        [...records.values()].find(
          (record) => record.tokenHash === tokenHash,
        ) ?? null
      );
    },
    async beginReceiving(id, now) {
      const current = records.get(id);
      if (
        !current ||
        current.status !== "pending" ||
        current.expiresAt <= now
      ) {
        return false;
      }
      update(id, { status: "receiving" });
      return true;
    },
    async complete(id, input) {
      if (records.get(id)?.status === "receiving") {
        update(id, { status: "completed", ...input });
      }
    },
    async fail(id) {
      const status = records.get(id)?.status;
      if (status === "pending" || status === "receiving") {
        update(id, { status: "failed" });
      }
    },
    async claim(ids, userId) {
      const claimed: string[] = [];
      for (const id of ids) {
        const current = records.get(id);
        if (
          current &&
          current.userId === userId &&
          current.status === "completed"
        ) {
          update(id, { status: "consumed" });
          claimed.push(id);
        }
      }
      return claimed;
    },
    async release(ids) {
      for (const id of ids) {
        if (records.get(id)?.status === "consumed") {
          update(id, { status: "completed" });
        }
      }
    },
  };
};
```

- [ ] **Step 3: 객체 저장소를 만든다**

`apps/api/src/features/mcp/files/mcp-object-store.ts`:

```ts
export interface McpObjectStore {
  put(
    objectKey: string,
    body: ReadableStream<Uint8Array>,
    options: { contentType: string; size: number },
  ): Promise<void>;
  delete(objectKey: string): Promise<void>;
}

/**
 * R2는 길이를 모르는 스트림을 받지 않는다. FixedLengthStream이 길이를 알려 주고,
 * 실제 바이트 수가 다르면 쓰기가 실패한다.
 */
export const createR2McpObjectStore = (bucket: R2Bucket): McpObjectStore => ({
  async put(objectKey, body, { contentType, size }) {
    const fixed = new FixedLengthStream(size);
    await Promise.all([
      body.pipeTo(fixed.writable),
      bucket.put(objectKey, fixed.readable, { httpMetadata: { contentType } }),
    ]);
  },
  async delete(objectKey) {
    await bucket.delete(objectKey);
  },
});

export const createMemoryMcpObjectStore = () => {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  const store: McpObjectStore & { objects: typeof objects } = {
    objects,
    async put(objectKey, body, { contentType }) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      objects.set(objectKey, { bytes, contentType });
    },
    async delete(objectKey) {
      objects.delete(objectKey);
    },
  };
  return store;
};
```

- [ ] **Step 4: 객체 키 발급을 추가한다**

`apps/api/src/lib/services/types.ts`의 `PresignService` 타입 맨 앞에 추가한다.

```ts
/** presign 없이 관리 객체 키와 서명된 공개 URL만 만든다. MCP 업로드가 R2 바인딩으로 직접 쓸 때 쓴다. */
allocateManagedObject: (input: {
  actorId: string;
  resource: "activities" | "exhibitions" | "users" | "notices" | "site";
  slot: "cover" | "detail" | "profile" | "image" | "file";
  fileName: string;
}) => Promise<{ objectKey: string; publicUrl: string }>;
```

`apps/api/src/lib/storage/presign.ts`의 `createR2PresignService` 반환 객체 맨 앞에 추가한다.

```ts
    async allocateManagedObject(input) {
      const objectKey = buildObjectKey(input);
      return {
        objectKey,
        publicUrl: await resolvePublicUrlFromObjectKey(objectKey),
      };
    },
```

- [ ] **Step 5: 메모리 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-upload-store.test.ts`
Expected: PASS

- [ ] **Step 6: Workers 테스트에서 D1 마이그레이션을 쓰게 한다**

`apps/api/vitest.workers.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    fileURLToPath(new URL("./drizzle", import.meta.url)),
  );

  return {
    plugins: [
      cloudflareTest({
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ["tests/integration/**/*.test.ts"],
    },
  };
});
```

`apps/api/tests/setup/cloudflare-test.d.ts`의 `declare module "cloudflare:test"` 안에 추가한다.

```ts
export interface D1Migration {
  name: string;
  queries: string[];
}
export function applyD1Migrations(
  db: D1Database,
  migrations: D1Migration[],
  migrationsTableName?: string,
): Promise<void>;
```

- [ ] **Step 7: D1 저장소 런타임 테스트를 쓴다**

`apps/api/tests/integration/mcp-stores.runtime.test.ts`:

```ts
import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createD1McpUploadStore } from "../../src/features/mcp/files/mcp-upload-store";
import { createD1McpConnectionStore } from "../../src/features/mcp/mcp-connection-store";

const db = env.db as D1Database;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
  await db.batch([
    db.prepare(
      "INSERT INTO user (id, name, email) VALUES ('u1', 'u1', 'u1@example.test')",
    ),
    db.prepare(
      "INSERT INTO oauth_client (id, client_id, redirect_uris, name) VALUES ('oc1', 'c1', '[\"https://claude.ai/api/mcp/auth_callback\"]', 'Claude')",
    ),
    db.prepare(
      "INSERT INTO oauth_consent (id, client_id, user_id, scopes, created_at, updated_at) VALUES ('cs1', 'c1', 'u1', '[\"openid\",\"mcp\"]', 1, 2)",
    ),
    db.prepare(
      "INSERT INTO oauth_refresh_token (id, token, client_id, user_id, scopes) VALUES ('rt1', 'refresh-token', 'c1', 'u1', '[\"mcp\"]')",
    ),
  ]);
});

describe("D1 MCP 업로드 저장소", () => {
  it("수신 시작·완료·claim·release가 상태 전이를 지킨다", async () => {
    const store = createD1McpUploadStore(db);
    await store.create({
      id: "up-1",
      tokenHash: "hash-1",
      userId: "u1",
      purpose: "activity_image",
      fileName: "봄 출사 🌸.png",
      contentType: "image/png",
      declaredSize: 10,
      objectKey: "activities/u1/detail/x.png",
      publicUrl: "https://cdn.example.test/x.png",
      width: null,
      height: null,
      reservationId: null,
      status: "pending",
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
      completedAt: null,
    });

    expect(await store.beginReceiving("up-1", Date.now())).toBe(true);
    expect(await store.beginReceiving("up-1", Date.now())).toBe(false);
    await store.complete("up-1", {
      width: 3,
      height: 2,
      completedAt: Date.now(),
    });
    expect((await store.getByTokenHash("hash-1"))?.fileName).toBe(
      "봄 출사 🌸.png",
    );

    expect(await store.claim(["up-1"], "u1")).toEqual(["up-1"]);
    expect(await store.claim(["up-1"], "u1")).toEqual([]);
    await store.release(["up-1"]);
    expect((await store.getById("up-1"))?.status).toBe("completed");
  });
});

describe("D1 MCP 연결 저장소", () => {
  it("동의를 보여주고, 해제하면 리프레시 토큰을 폐기한다", async () => {
    const store = createD1McpConnectionStore(db);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
    expect(await store.list("u1")).toMatchObject([
      { clientId: "c1", clientName: "Claude", scopes: ["openid", "mcp"] },
    ]);

    expect(await store.revoke("u1", "c1", 123)).toBe(true);
    expect(await store.hasConsent("u1", "c1")).toBe(false);
    const token = await db
      .prepare("SELECT revoked FROM oauth_refresh_token WHERE id = 'rt1'")
      .first<{ revoked: number | null }>();
    expect(token?.revoked).toBe(123);
  });
});
```

Run: `pnpm --filter @yonyoung/api test:workers`
Expected: 기존 런타임 테스트와 새 테스트 모두 PASS

- [ ] **Step 8: 커밋**

```bash
git add apps/api
git commit -m "feat(api): add MCP upload and object stores backed by D1 and R2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 11: 업로드 서비스, `upload_prepare`·`upload_status`, PUT 라우트

**Files:**

- Create: `apps/api/src/features/mcp/files/upload-purpose.ts`
- Create: `apps/api/src/features/mcp/files/mcp-upload-service.ts`
- Create: `apps/api/src/features/mcp/tools/upload.tools.ts`
- Modify: `apps/api/src/features/mcp/tool-definition.ts` (`McpToolContext.uploads`)
- Modify: `apps/api/src/features/mcp/tools/index.ts`
- Modify: `apps/api/src/features/mcp/mcp.routes.ts`
- Modify: `apps/api/src/lib/services/dependencies.ts` (`getMcpUploadStore`, `getMcpObjectStore`)
- Modify: `apps/api/src/tests/mcp-test-harness.ts`
- Modify: `apps/api/src/tests/mcp-exposure.test.ts` (`McpToolContext` 캐스팅 유지 확인)
- Test: `apps/api/src/tests/mcp-upload.routes.test.ts`

**Interfaces:**

- Consumes: `McpUploadStore`, `McpObjectStore`, `allocateManagedObject` (Task 10), `peekStream`, `enforceExactLength`, `matchesDeclaredType`, `readImageDimensions` (Task 9), `reserveStorageCapacityForUpload`, `settleUploadReservation` (기존 `features/uploads/upload-capacity.ts`)
- Produces:
  - `UPLOAD_PURPOSE_RULES: Record<McpUploadPurpose, { resourcePath; slot; allowedContentTypes: readonly string[]; kind: "image" | "file"; isAllowed(role: Role): boolean }>`
  - `class McpUploadError extends Error { readonly status: number }`
  - `type PreparedUpload = { uploadId: string; putUrl: string; browserUrl: string; expiresAt: string }`
  - `type ResolvedUpload = { uploadId: string; publicUrl: string; fileName: string; contentType: string; size: number; width: number | null; height: number | null }`
  - `type McpUploadService = { prepare(actor, { purpose, fileName, contentType, size }): Promise<PreparedUpload>; receive(token, { contentLength, body }): Promise<McpUploadRecord>; ingest(actor, { purpose, fileName, contentType, size, body }): Promise<McpUploadRecord>; status(actor, uploadId): Promise<McpUploadRecord>; lookupByToken(actor, token): Promise<McpUploadRecord>; resolveCompleted(actor, purpose, uploadIds): Promise<ResolvedUpload[]>; claim(actor, uploads: ResolvedUpload[]): Promise<void>; release(uploads: ResolvedUpload[]): Promise<void>; putUrlFor(token): string }`
  - `createMcpUploadService(deps): McpUploadService`
  - `createRequestMcpUploadService(c, dependencies): McpUploadService`
  - `toResolvedUpload(record: McpUploadRecord): ResolvedUpload`
  - `uploadErrorResult(error: unknown, role: Role): CallToolResult` (McpUploadError가 아니면 다시 던진다)
  - `McpToolContext`에 `uploads: McpUploadService` 추가
  - 라우트: `PUT /mcp/uploads/:token`, `OPTIONS /mcp/uploads/:token`, `GET /api/mcp/uploads/lookup?token=`
  - `createMcpTestApp` 입력에 `uploadStore?`, `objectStore?` 추가. presign 기본값에 `allocateManagedObject` 포함

- [ ] **Step 1: 하네스를 확장한다**

`apps/api/src/tests/mcp-test-harness.ts`에 import를 추가한다.

```ts
import {
  createMemoryMcpObjectStore,
  type McpObjectStore,
} from "../features/mcp/files/mcp-object-store";
import {
  createMemoryMcpUploadStore,
  type McpUploadStore,
} from "../features/mcp/files/mcp-upload-store";
import { createPresignServiceMock } from "./test-helpers";
```

`createMcpTestApp` 입력 타입에 추가한다.

```ts
  uploadStore?: McpUploadStore;
  objectStore?: McpObjectStore;
```

`createTestApp({...})` 호출을 바꾼다.

```ts
return createTestApp({
  actor: null,
  dataService: input.dataService,
  presignService:
    input.presignService ??
    createPresignServiceMock({
      allocateManagedObject: async ({ actorId, resource, slot, fileName }) => {
        const objectKey = `${resource}/${actorId}/${slot}/${crypto.randomUUID()}-${fileName}`;
        return {
          objectKey,
          publicUrl: `https://cdn.example.test/${encodeURI(objectKey)}`,
        };
      },
    }),
  overrides: {
    // ...기존 세 항목
    getMcpUploadStore: () => uploadStore,
    getMcpObjectStore: () => objectStore,
    ...input.overrides,
  },
});
```

함수 첫머리에 다음을 둔다.

```ts
const uploadStore = input.uploadStore ?? createMemoryMcpUploadStore();
const objectStore = input.objectStore ?? createMemoryMcpObjectStore();
```

파일 끝에 Claude 경로 업로드를 한 번에 하는 도우미를 추가한다.

```ts
/** upload_prepare → put_url로 PUT까지 한다. 돌려받은 upload_id를 파일 도구에 넘긴다. */
export const uploadViaClaudePath = async (
  app: TestApp,
  client: Client,
  input: {
    purpose: string;
    fileName: string;
    contentType: string;
    bytes: Uint8Array;
  },
): Promise<string> => {
  const prepared = await client.callTool({
    name: "upload_prepare",
    arguments: {
      purpose: input.purpose,
      file_name: input.fileName,
      content_type: input.contentType,
      size: input.bytes.length,
    },
  });
  if (prepared.isError) {
    throw new Error(resultText(prepared));
  }
  const data = (
    prepared.structuredContent as {
      data: { upload_id: string; put_url: string };
    }
  ).data;
  const response = await app.request(new URL(data.put_url).pathname, {
    method: "PUT",
    headers: { "content-length": String(input.bytes.length) },
    body: input.bytes,
  });
  if (response.status !== 200) {
    throw new Error(`PUT 실패: ${response.status} ${await response.text()}`);
  }
  return data.upload_id;
};
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-upload.routes.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
import { jpegBytes, pngBytes } from "./mcp-file-fixtures";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
  uploadViaClaudePath,
} from "./mcp-test-harness";
import { IDs, createActor } from "./test-helpers";

type Prepared = {
  upload_id: string;
  put_url: string;
  browser_url: string;
  expires_at: string;
};

const setup = async (role: Parameters<typeof createActor>[0] = "manager") => {
  const uploadStore = createMemoryMcpUploadStore();
  const objectStore = createMemoryMcpObjectStore();
  const actor = createActor(
    role,
    role === "manager" ? IDs.manager : IDs.member,
  );
  const app = createMcpTestApp({
    getActor: () => actor,
    uploadStore,
    objectStore,
  });
  const client = await connectMcpClient(app);
  return { app, client, uploadStore, objectStore, actor };
};

const prepare = async (
  client: Awaited<ReturnType<typeof setup>>["client"],
  args: Record<string, unknown>,
) => client.callTool({ name: "upload_prepare", arguments: args });

const putBytes = (
  app: Awaited<ReturnType<typeof setup>>["app"],
  putUrl: string,
  bytes: Uint8Array,
  headers: Record<string, string> = {},
) =>
  app.request(new URL(putUrl).pathname, {
    method: "PUT",
    headers: { "content-length": String(bytes.length), ...headers },
    body: bytes,
  });

afterEach(() => {
  vi.useRealTimers();
});

describe("upload_prepare", () => {
  it("일회용 PUT 주소와 브라우저 주소를 준다", async () => {
    const { client } = await setup();
    const result = await prepare(client, {
      purpose: "activity_image",
      file_name: "봄 출사 🌸.png",
      content_type: "image/png",
      size: 33,
    });

    expect(result.isError).toBeFalsy();
    const data = (result.structuredContent as { data: Prepared }).data;
    expect(data.put_url).toMatch(/\/mcp\/uploads\/[A-Za-z0-9_-]{43}$/);
    expect(data.browser_url).toMatch(
      /\/dashboard\/mcp\/upload\/[A-Za-z0-9_-]{43}$/,
    );
    expect(resultText(result)).toContain("curl");
  });

  it("권한이 없는 용도는 거부한다", async () => {
    const { client } = await setup("regular_member");
    const result = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: 33,
    });
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("현재 역할(정회원)");
  });

  it("허용하지 않는 형식과 100MB 초과는 거부한다", async () => {
    const { client } = await setup();
    const wrongType = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.svg",
      content_type: "image/svg+xml",
      size: 10,
    });
    expect(resultText(wrongType)).toContain("허용되지 않는 파일 형식입니다.");

    const tooLarge = await prepare(client, {
      purpose: "activity_file",
      file_name: "a.pdf",
      content_type: "application/pdf",
      size: 100_000_001,
    });
    expect(tooLarge.isError).toBe(true);
  });
});

describe("PUT /mcp/uploads/:token", () => {
  it("파일을 저장하고 이미지 크기를 기록한다", async () => {
    const { app, client, uploadStore, objectStore } = await setup();
    const bytes = pngBytes(640, 480);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes,
    });

    const record = await uploadStore.getById(uploadId);
    expect(record).toMatchObject({
      status: "completed",
      width: 640,
      height: 480,
    });
    expect(objectStore.objects.get(record!.objectKey)?.bytes.length).toBe(
      bytes.length,
    );

    const status = await client.callTool({
      name: "upload_status",
      arguments: { upload_id: uploadId },
    });
    expect(resultText(status)).toContain("completed");
  });

  it("같은 주소로 두 번 올리면 두 번째는 409다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;

    expect((await putBytes(app, put_url, bytes)).status).toBe(200);
    expect((await putBytes(app, put_url, bytes)).status).toBe(409);
  });

  it("동시에 두 번 올려도 하나만 성공한다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;

    const statuses = (
      await Promise.all([
        putBytes(app, put_url, bytes),
        putBytes(app, put_url, bytes),
      ])
    )
      .map((response) => response.status)
      .sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("Content-Length가 없으면 411이다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const response = await app.request(new URL(put_url).pathname, {
      method: "PUT",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    expect(response.status).toBe(411);
  });

  it("선언 크기와 다르면 400이고 객체를 남기지 않는다", async () => {
    const { app, client, objectStore } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length + 5,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const response = await putBytes(app, put_url, bytes);
    expect(response.status).toBe(400);
    expect(objectStore.objects.size).toBe(0);
  });

  it("내용이 선언 형식과 다르면 415다", async () => {
    const { app, client } = await setup();
    const bytes = jpegBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    expect((await putBytes(app, put_url, bytes)).status).toBe(415);
  });

  it("10분이 지나면 410이다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    expect((await putBytes(app, put_url, bytes)).status).toBe(410);
  });

  it("웹 오리진의 CORS 사전 요청을 허용한다", async () => {
    const { app } = await setup();
    const response = await app.request("/mcp/uploads/anything", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });
});

describe("GET /api/mcp/uploads/lookup", () => {
  it("소유자에게만 업로드 정보를 보여준다", async () => {
    const uploadStore = createMemoryMcpUploadStore();
    const manager = createActor("manager", IDs.manager);
    let sessionActor = manager;
    const app = createMcpTestApp({
      getActor: () => manager,
      uploadStore,
      overrides: { resolveActor: async () => sessionActor },
    });
    const client = await connectMcpClient(app);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: 33,
    });
    const token = new URL(
      (prepared.structuredContent as { data: Prepared }).data.put_url,
    ).pathname
      .split("/")
      .pop()!;

    const owner = await app.request(`/api/mcp/uploads/lookup?token=${token}`);
    expect(owner.status).toBe(200);
    expect(
      ((await owner.json()) as { data: { fileName: string } }).data.fileName,
    ).toBe("a.png");

    sessionActor = createActor("regular_member", IDs.member);
    const stranger = await app.request(
      `/api/mcp/uploads/lookup?token=${token}`,
    );
    expect(stranger.status).toBe(404);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-upload.routes.test.ts`
Expected: FAIL — `upload_prepare` 도구 없음

- [ ] **Step 4: purpose 규칙을 만든다**

`apps/api/src/features/mcp/files/upload-purpose.ts`:

```ts
import type { McpUploadPurpose } from "@yonyoung/contracts/mcp";
import type { Role } from "../../../lib/authorization/types";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
  type ManagedUploadResourcePath,
  type ManagedUploadSlot,
} from "../../../lib/storage/presign";
import {
  canCreateOrUpdate,
  isUserProfileUploadAllowed,
} from "../../uploads/upload.policy";

export type UploadPurposeRule = {
  resourcePath: ManagedUploadResourcePath;
  slot: ManagedUploadSlot;
  allowedContentTypes: readonly string[];
  kind: "image" | "file";
  isAllowed: (role: Role) => boolean;
};

/** 기존 presign 라우트(upload.routes.ts)와 같은 경로·슬롯·형식·권한을 쓴다. */
export const UPLOAD_PURPOSE_RULES: Record<McpUploadPurpose, UploadPurposeRule> =
  {
    activity_cover: {
      resourcePath: "activities",
      slot: "cover",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    activity_image: {
      resourcePath: "activities",
      slot: "detail",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    activity_file: {
      resourcePath: "activities",
      slot: "file",
      allowedContentTypes: ALLOWED_ATTACHMENT_CONTENT_TYPES,
      kind: "file",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    exhibition_cover: {
      resourcePath: "exhibitions",
      slot: "cover",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "exhibition"),
    },
    exhibition_image: {
      resourcePath: "exhibitions",
      slot: "detail",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "exhibition"),
    },
    profile_image: {
      resourcePath: "users",
      slot: "profile",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: isUserProfileUploadAllowed,
    },
    recruiting_image: {
      resourcePath: "notices",
      slot: "image",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "site_setting"),
    },
    site_file: {
      resourcePath: "site",
      slot: "file",
      allowedContentTypes: ALLOWED_ATTACHMENT_CONTENT_TYPES,
      kind: "file",
      isAllowed: (role) => canCreateOrUpdate(role, "site_setting"),
    },
  };
```

- [ ] **Step 5: 업로드 서비스를 만든다**

`apps/api/src/features/mcp/files/mcp-upload-service.ts`:

```ts
import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  MCP_UPLOAD_MAX_BYTES,
  MCP_UPLOAD_TTL_MS,
  type McpUploadPurpose,
} from "@yonyoung/contracts/mcp";
import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";
import type { Context } from "hono";
import type { Actor, Role } from "../../../lib/authorization/types";
import { resolveMcpRuntimeEnv } from "../../../lib/config/runtime-env";
import type { AppDependencies } from "../../../lib/services/dependencies";
import type { PresignService } from "../../../lib/services/types";
import { isAppError } from "../../../shared/errors/AppError";
import type HonoAppType from "../../../types/honoAppType";
import {
  SINGLE_UPLOAD_CAPACITY_RESERVATION_TTL_MS,
  reserveStorageCapacityForUpload,
  settleUploadReservation,
} from "../../uploads/upload-capacity";
import { describeApiFailure, toolFailure } from "../tool-result";
import {
  StreamLengthMismatchError,
  enforceExactLength,
  peekStream,
} from "./byte-stream";
import {
  SNIFF_BYTES,
  matchesDeclaredType,
  readImageDimensions,
} from "./file-sniff";
import type { McpObjectStore } from "./mcp-object-store";
import type { McpUploadRecord, McpUploadStore } from "./mcp-upload-store";
import { UPLOAD_PURPOSE_RULES } from "./upload-purpose";

export class McpUploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "McpUploadError";
  }
}

export type PreparedUpload = {
  uploadId: string;
  putUrl: string;
  browserUrl: string;
  expiresAt: string;
};

export type ResolvedUpload = {
  uploadId: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
};

type FileDeclaration = {
  purpose: McpUploadPurpose;
  fileName: string;
  contentType: string;
  size: number;
};

export type McpUploadServiceDeps = {
  store: McpUploadStore;
  objects: McpObjectStore;
  presign: Pick<PresignService, "allocateManagedObject">;
  reserveCapacity: (
    actorId: string,
    fileSize: number,
  ) => Promise<{ id: string }>;
  settleReservation: (reservationId: string) => Promise<void>;
  releaseReservation: (reservationId: string) => Promise<void>;
  apiOrigin: string;
  webOrigin: string;
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const createUploadToken = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const toResolvedUpload = (record: McpUploadRecord): ResolvedUpload => ({
  uploadId: record.id,
  publicUrl: record.publicUrl,
  fileName: record.fileName,
  contentType: record.contentType,
  size: record.declaredSize,
  width: record.width,
  height: record.height,
});

export const createMcpUploadService = (deps: McpUploadServiceDeps) => {
  const assertPurposeAllowed = (actor: Actor, purpose: McpUploadPurpose) => {
    if (!UPLOAD_PURPOSE_RULES[purpose].isAllowed(actor.role)) {
      throw new McpUploadError(403, "이 용도로 파일을 올릴 권한이 없습니다.");
    }
  };

  const validateDeclaration = (input: FileDeclaration): string => {
    const rule = UPLOAD_PURPOSE_RULES[input.purpose];
    const contentType = normalizeUploadContentType(input.contentType);
    if (!rule.allowedContentTypes.includes(contentType)) {
      throw new McpUploadError(
        415,
        `${contentType} 형식은 올릴 수 없습니다. 허용 형식: ${rule.allowedContentTypes.join(", ")}`,
      );
    }
    if (!Number.isSafeInteger(input.size) || input.size <= 0) {
      throw new McpUploadError(422, "파일 크기가 올바르지 않습니다.");
    }
    if (input.size > MCP_UPLOAD_MAX_BYTES) {
      throw new McpUploadError(
        413,
        "MCP로는 파일당 100MB까지 올릴 수 있습니다. 더 큰 파일은 대시보드에서 올려 주세요.",
      );
    }
    if (input.fileName.trim().length === 0) {
      throw new McpUploadError(422, "파일 이름이 비어 있습니다.");
    }
    return contentType;
  };

  const createRecord = async (actor: Actor, input: FileDeclaration) => {
    const contentType = validateDeclaration(input);
    const rule = UPLOAD_PURPOSE_RULES[input.purpose];
    const reservation = await deps.reserveCapacity(actor.id, input.size);
    try {
      const { objectKey, publicUrl } = await deps.presign.allocateManagedObject(
        {
          actorId: actor.id,
          resource: rule.resourcePath,
          slot: rule.slot,
          fileName: input.fileName,
        },
      );
      const token = createUploadToken();
      const now = Date.now();
      const record: McpUploadRecord = {
        id: crypto.randomUUID(),
        tokenHash: await sha256Hex(token),
        userId: actor.id,
        purpose: input.purpose,
        fileName: input.fileName,
        contentType,
        declaredSize: input.size,
        objectKey,
        publicUrl,
        width: null,
        height: null,
        reservationId: reservation.id,
        status: "pending",
        expiresAt: now + MCP_UPLOAD_TTL_MS,
        createdAt: now,
        completedAt: null,
      };
      await deps.store.create(record);
      return { record, token };
    } catch (error) {
      await deps.releaseReservation(reservation.id);
      throw error;
    }
  };

  /** 형식 검사를 R2 쓰기 전에 끝내고, 길이가 선언과 정확히 같을 때만 저장을 마친다. */
  const finish = async (
    record: McpUploadRecord,
    body: ReadableStream<Uint8Array>,
  ): Promise<McpUploadRecord> => {
    try {
      const { head, stream } = await peekStream(body, SNIFF_BYTES);
      if (!matchesDeclaredType(record.contentType, head)) {
        await stream.cancel();
        throw new McpUploadError(415, "파일 내용이 선언한 형식과 다릅니다.");
      }
      const dimensions =
        UPLOAD_PURPOSE_RULES[record.purpose].kind === "image"
          ? readImageDimensions(record.contentType, head)
          : null;
      await deps.objects.put(
        record.objectKey,
        enforceExactLength(stream, record.declaredSize),
        {
          contentType: record.contentType,
          size: record.declaredSize,
        },
      );

      const completed = {
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        completedAt: Date.now(),
      };
      await deps.store.complete(record.id, completed);
      if (record.reservationId) {
        await deps.settleReservation(record.reservationId);
      }
      return { ...record, ...completed, status: "completed" };
    } catch (error) {
      await deps.store.fail(record.id);
      await deps.objects.delete(record.objectKey).catch(() => undefined);
      if (record.reservationId) {
        await deps.releaseReservation(record.reservationId);
      }
      if (error instanceof StreamLengthMismatchError) {
        throw new McpUploadError(
          400,
          "받은 파일 크기가 선언한 크기와 다릅니다.",
        );
      }
      throw error;
    }
  };

  const findOwned = async (
    actor: Actor,
    uploadId: string,
  ): Promise<McpUploadRecord> => {
    const record = await deps.store.getById(uploadId);
    if (!record || record.userId !== actor.id) {
      throw new McpUploadError(404, `업로드를 찾을 수 없습니다: ${uploadId}`);
    }
    return record;
  };

  return {
    putUrlFor: (token: string) => `${deps.apiOrigin}/mcp/uploads/${token}`,

    async prepare(
      actor: Actor,
      input: FileDeclaration,
    ): Promise<PreparedUpload> {
      assertPurposeAllowed(actor, input.purpose);
      const { record, token } = await createRecord(actor, input);
      return {
        uploadId: record.id,
        putUrl: `${deps.apiOrigin}/mcp/uploads/${token}`,
        browserUrl: `${deps.webOrigin}/dashboard/mcp/upload/${token}`,
        expiresAt: new Date(record.expiresAt).toISOString(),
      };
    },

    async receive(
      token: string,
      input: {
        contentLength: number | null;
        body: ReadableStream<Uint8Array> | null;
      },
    ): Promise<McpUploadRecord> {
      const record = await deps.store.getByTokenHash(await sha256Hex(token));
      if (!record) {
        throw new McpUploadError(404, "업로드 주소를 찾을 수 없습니다.");
      }
      if (record.status !== "pending") {
        throw new McpUploadError(409, "이미 사용한 업로드 주소입니다.");
      }
      if (record.expiresAt <= Date.now()) {
        throw new McpUploadError(
          410,
          "업로드 주소가 만료되었습니다. upload_prepare를 다시 호출해 주세요.",
        );
      }
      if (input.contentLength === null) {
        throw new McpUploadError(
          411,
          "Content-Length 헤더가 필요합니다. curl -T로 파일을 보내 주세요.",
        );
      }
      if (input.contentLength !== record.declaredSize) {
        throw new McpUploadError(
          400,
          `보낸 크기(${input.contentLength} bytes)가 준비할 때 알려준 크기(${record.declaredSize} bytes)와 다릅니다.`,
        );
      }
      if (!input.body) {
        throw new McpUploadError(400, "파일 본문이 비어 있습니다.");
      }
      if (!(await deps.store.beginReceiving(record.id, Date.now()))) {
        throw new McpUploadError(409, "이미 사용한 업로드 주소입니다.");
      }
      return finish(record, input.body);
    },

    async ingest(
      actor: Actor,
      input: FileDeclaration & { body: ReadableStream<Uint8Array> },
    ): Promise<McpUploadRecord> {
      assertPurposeAllowed(actor, input.purpose);
      const { record } = await createRecord(actor, input);
      await deps.store.beginReceiving(record.id, Date.now());
      return finish(record, input.body);
    },

    status: findOwned,

    async lookupByToken(actor: Actor, token: string): Promise<McpUploadRecord> {
      const record = await deps.store.getByTokenHash(await sha256Hex(token));
      if (!record || record.userId !== actor.id) {
        throw new McpUploadError(404, "업로드 주소를 찾을 수 없습니다.");
      }
      return record;
    },

    async resolveCompleted(
      actor: Actor,
      purpose: McpUploadPurpose,
      uploadIds: string[],
    ): Promise<ResolvedUpload[]> {
      const resolved: ResolvedUpload[] = [];
      for (const uploadId of uploadIds) {
        const record = await findOwned(actor, uploadId);
        if (record.purpose !== purpose) {
          throw new McpUploadError(
            422,
            `${uploadId}는 ${record.purpose} 용도로 준비한 업로드입니다. ${purpose} 용도로 다시 준비해 주세요.`,
          );
        }
        if (record.status === "consumed") {
          throw new McpUploadError(
            409,
            `이미 사용한 업로드입니다: ${uploadId}`,
          );
        }
        if (record.status !== "completed") {
          throw new McpUploadError(
            409,
            `아직 업로드가 끝나지 않았습니다: ${uploadId} (${record.status}). upload_status로 확인해 주세요.`,
          );
        }
        resolved.push(toResolvedUpload(record));
      }
      return resolved;
    },

    async claim(actor: Actor, uploads: ResolvedUpload[]): Promise<void> {
      const ids = uploads.map((upload) => upload.uploadId);
      const claimed = await deps.store.claim(ids, actor.id);
      if (claimed.length !== ids.length) {
        await deps.store.release(claimed);
        throw new McpUploadError(
          409,
          "이미 사용한 업로드가 섞여 있습니다. 새로 올려 주세요.",
        );
      }
    },

    async release(uploads: ResolvedUpload[]): Promise<void> {
      await deps.store.release(uploads.map((upload) => upload.uploadId));
    },
  };
};

export type McpUploadService = ReturnType<typeof createMcpUploadService>;

export const createRequestMcpUploadService = (
  c: Context<HonoAppType>,
  dependencies: AppDependencies,
): McpUploadService => {
  const mcpEnv = resolveMcpRuntimeEnv(c.env);
  const reservationStore = dependencies.getUploadReservationStore(c);

  return createMcpUploadService({
    store: dependencies.getMcpUploadStore(c),
    objects: dependencies.getMcpObjectStore(c),
    presign: dependencies.getPresignService(c),
    reserveCapacity: async (actorId, fileSize) => {
      try {
        return await reserveStorageCapacityForUpload({
          c,
          dependencies,
          actorId,
          fileSize,
          grantTtlMs: MCP_UPLOAD_TTL_MS,
          capacityTtlMs: SINGLE_UPLOAD_CAPACITY_RESERVATION_TTL_MS,
        });
      } catch (error) {
        if (isAppError(error)) {
          throw new McpUploadError(error.httpStatus, error.message);
        }
        throw error;
      }
    },
    settleReservation: (reservationId) =>
      settleUploadReservation(reservationStore, reservationId, c),
    releaseReservation: (reservationId) =>
      reservationStore.remove(reservationId).catch(() => undefined),
    apiOrigin: new URL(mcpEnv.resourceUrl).origin,
    webOrigin: new URL(mcpEnv.issuer).origin,
  });
};

/** 업로드 오류를 도구 결과로 바꾼다. 업로드 오류가 아니면 다시 던져 SDK가 처리하게 한다. */
export const uploadErrorResult = (
  error: unknown,
  role: Role,
): CallToolResult => {
  if (!(error instanceof McpUploadError)) {
    throw error;
  }
  return toolFailure(
    describeApiFailure(
      {
        ok: false,
        status: error.status,
        code: "UPLOAD_ERROR",
        message: error.message,
        requestId: null,
      },
      role,
    ),
  );
};
```

`isAppError`가 `shared/errors/AppError`에 없으면 `upload.routes.ts`가 쓰는 import 경로를 그대로 쓴다(`grep -rn "export const isAppError" apps/api/src`).

- [ ] **Step 6: 도구 컨텍스트와 업로드 도구를 추가한다**

`tool-definition.ts`의 `McpToolContext`를 바꾼다.

```ts
import type { McpUploadService } from "./files/mcp-upload-service";

export type McpToolContext = {
  actor: Actor;
  api: InternalApiClient;
  uploads: McpUploadService;
};
```

`apps/api/src/features/mcp/tools/upload.tools.ts`:

```ts
import {
  MCP_UPLOAD_MAX_BYTES,
  MCP_UPLOAD_PURPOSES,
} from "@yonyoung/contracts/mcp";
import { z } from "zod";
import { uploadErrorResult } from "../files/mcp-upload-service";
import { defineTool } from "../tool-definition";
import { toolSuccess } from "../tool-result";

export const uploadTools = [
  defineTool({
    name: "upload_prepare",
    inputSchema: z.object({
      purpose: z
        .enum(MCP_UPLOAD_PURPOSES)
        .describe(
          "파일을 쓸 곳. 파일을 받는 도구 설명에 적힌 purpose를 씁니다.",
        ),
      file_name: z.string().min(1).max(255).describe("원래 파일 이름"),
      content_type: z
        .string()
        .min(1)
        .describe("MIME 형식. 예: image/jpeg, application/pdf"),
      size: z
        .number()
        .int()
        .positive()
        .max(MCP_UPLOAD_MAX_BYTES)
        .describe("파일 크기(bytes)"),
    }),
    handler: async (args, context) => {
      try {
        const prepared = await context.uploads.prepare(context.actor, {
          purpose: args.purpose,
          fileName: args.file_name,
          contentType: args.content_type,
          size: args.size,
        });
        const curl = `curl -sS -T "<파일 경로>" "${prepared.putUrl}"`;
        return toolSuccess(
          [
            "업로드를 준비했습니다. 10분 안에 한 번만 쓸 수 있습니다.",
            `1. 코드 실행 환경에서 실행하세요: ${curl}`,
            `2. 실행할 수 없거나 실패하면 사용자에게 이 주소를 열어 같은 파일을 올리도록 안내하세요: ${prepared.browserUrl}`,
            "3. upload_status로 completed를 확인한 뒤 upload_id를 파일 도구에 넘기세요.",
          ].join("\n"),
          {
            upload_id: prepared.uploadId,
            put_url: prepared.putUrl,
            browser_url: prepared.browserUrl,
            expires_at: prepared.expiresAt,
            curl,
          },
        );
      } catch (error) {
        return uploadErrorResult(error, context.actor.role);
      }
    },
  }),
  defineTool({
    name: "upload_status",
    inputSchema: z.object({
      upload_id: z.string().min(1).describe("upload_prepare가 준 upload_id"),
    }),
    handler: async (args, context) => {
      try {
        const record = await context.uploads.status(
          context.actor,
          args.upload_id,
        );
        return toolSuccess(`업로드 상태: ${record.status}`, {
          upload_id: record.id,
          status: record.status,
          file_name: record.fileName,
          size: record.declaredSize,
          expires_at: new Date(record.expiresAt).toISOString(),
        });
      } catch (error) {
        return uploadErrorResult(error, context.actor.role);
      }
    },
  }),
];
```

`tools/index.ts`의 `ALL_TOOLS`에 `...uploadTools,`를 추가하고 import한다.

- [ ] **Step 7: 의존성과 라우트를 추가한다**

`dependencies.ts`의 `AppDependencies`에 추가한다.

```ts
getMcpUploadStore: (c: Context<HonoAppType>) => McpUploadStore;
getMcpObjectStore: (c: Context<HonoAppType>) => McpObjectStore;
```

`createDefaultDependencies`에 추가한다.

```ts
  getMcpUploadStore: (c) => createD1McpUploadStore(createRequestDatabase(c)),
  getMcpObjectStore: (c) => createR2McpObjectStore(resolveR2Bucket(c.env)),
```

import 경로는 `../../features/mcp/files/mcp-upload-store`와 `../../features/mcp/files/mcp-object-store`다.

`mcp.routes.ts`:

1. import를 추가한다.

```ts
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { getAuthCorsOrigins } from "../../lib/auth";
import { requireAuthenticatedActor } from "../../shared/http/route-guards";
import {
  McpUploadError,
  createRequestMcpUploadService,
} from "./files/mcp-upload-service";
```

2. `createMcpToolContext`가 `dependencies`를 받아 `uploads`를 채우게 한다.

```ts
const createMcpToolContext = (
  c: Context<HonoAppType>,
  input: {
    actor: Actor;
    dispatch: InternalDispatch;
    dependencies: AppDependencies;
  },
): McpToolContext => ({
  actor: input.actor,
  api: createInternalApiClient({
    dispatch: input.dispatch,
    env: c.env,
    executionCtx: readExecutionContext(c),
    actor: input.actor,
    origin: new URL(c.req.url).origin,
    requestId: c.get("requestId") ?? crypto.randomUUID(),
  }),
  uploads: createRequestMcpUploadService(c, input.dependencies),
});
```

`/mcp` 핸들러의 호출을 `createMcpToolContext(c, { actor, dispatch, dependencies })`로 바꾼다.

3. `registerMcpRoutes` 끝에 추가한다.

```ts
const uploadErrorResponse = (c: Context<HonoAppType>, error: McpUploadError) =>
  c.json(
    {
      error: {
        code: "UPLOAD_ERROR",
        message: error.message,
        requestId: c.get("requestId"),
      },
    },
    error.status as ContentfulStatusCode,
  );

// 브라우저 업로드 페이지(웹 오리진)가 이 주소로 직접 PUT한다. 자격 증명은 URL의 일회용 토큰이다.
app.use(
  "/mcp/uploads/*",
  cors({
    origin: (origin, c) =>
      getAuthCorsOrigins(c.env).includes(origin) ? origin : null,
    allowMethods: ["PUT", "OPTIONS"],
    allowHeaders: ["content-type"],
    maxAge: 600,
  }),
);

app.put("/mcp/uploads/:token", async (c) => {
  const lengthHeader = c.req.header("content-length");
  const contentLength =
    lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
  try {
    const record = await createRequestMcpUploadService(c, dependencies).receive(
      c.req.param("token"),
      { contentLength, body: c.req.raw.body },
    );
    return c.json({
      data: {
        uploadId: record.id,
        status: record.status,
        fileName: record.fileName,
        size: record.declaredSize,
      },
    });
  } catch (error) {
    if (error instanceof McpUploadError) {
      return uploadErrorResponse(c, error);
    }
    throw error;
  }
});

app.get("/api/mcp/uploads/lookup", async (c) => {
  const actor = await requireAuthenticatedActor(c, dependencies);
  const token = c.req.query("token") ?? "";
  const service = createRequestMcpUploadService(c, dependencies);
  try {
    const record = await service.lookupByToken(actor, token);
    return c.json({
      data: {
        uploadId: record.id,
        fileName: record.fileName,
        contentType: record.contentType,
        declaredSize: record.declaredSize,
        purpose: record.purpose,
        status: record.status,
        expiresAt: new Date(record.expiresAt).toISOString(),
        putUrl: service.putUrlFor(token),
      },
    });
  } catch (error) {
    if (error instanceof McpUploadError) {
      return uploadErrorResponse(c, error);
    }
    throw error;
  }
});
```

`getAuthCorsOrigins(undefined)`는 개발 기본값 `http://localhost:3000`을 쓰므로 CORS 테스트가 통과한다.

- [ ] **Step 8: 노출 테스트의 컨텍스트 캐스팅을 확인한다**

`mcp-exposure.test.ts`의 `const context: McpToolContext = { actor, api } as McpToolContext;`는 `uploads`가 없어도 캐스팅으로 통과한다. 라우트 도구는 `uploads`를 쓰지 않으므로 그대로 둔다.

- [ ] **Step 9: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-upload.routes.test.ts src/tests/mcp-server.test.ts src/tests/mcp-exposure.test.ts`
Expected: PASS

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 오류 없음

- [ ] **Step 10: 커밋**

```bash
git add apps/api/src
git commit -m "feat(api): add one-time MCP upload URLs for Claude sandboxes and browsers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 12: ChatGPT 파일 다운로드와 파일 참조 해석

**Files:**

- Create: `apps/api/src/features/mcp/files/chatgpt-file.ts`
- Create: `apps/api/src/features/mcp/files/file-ref.ts`
- Modify: `apps/api/src/bindings/types.ts` (`MCP_CHATGPT_FILE_HOST_SUFFIXES?`)
- Modify: `apps/api/src/lib/services/dependencies.ts` (`fetchChatGptFile`)
- Modify: `apps/api/src/features/mcp/tool-definition.ts` (`McpToolContext.files`)
- Modify: `apps/api/src/features/mcp/mcp.routes.ts`
- Test: `apps/api/src/tests/mcp-chatgpt-file.test.ts`

**Interfaces:**

- Consumes: `McpUploadService.ingest/resolveCompleted/claim/release`, `ResolvedUpload`, `McpUploadError` (Task 11)
- Produces:
  - `chatGptFileSchema` (zod), `type ChatGptFileRef = { download_url: string; file_id: string; mime_type?: string; file_name?: string }`
  - `uploadIdSchema` (zod)
  - `DEFAULT_CHATGPT_FILE_HOST_SUFFIXES = [".oaiusercontent.com"]`
  - `resolveChatGptFileHostSuffixes(env): string[]`
  - `isAllowedChatGptFileUrl(value: string, hostSuffixes: readonly string[]): boolean`
  - `downloadChatGptFile(file: ChatGptFileRef, deps: { fetch: (request: Request) => Promise<Response>; hostSuffixes: readonly string[] }): Promise<{ fileName: string; contentType: string; size: number; body: ReadableStream<Uint8Array> }>`
  - `type McpFileResolver = { resolve(input: { purpose; chatGptFiles?: ChatGptFileRef[]; uploadIds?: string[] }): Promise<ResolvedUpload[]>; claim(files: ResolvedUpload[]): Promise<void>; release(files: ResolvedUpload[]): Promise<void> }`
  - `createMcpFileResolver(input: { actor; uploads; fetch; hostSuffixes }): McpFileResolver`
  - `McpToolContext`에 `files: McpFileResolver` 추가
  - `AppDependencies.fetchChatGptFile: (request: Request) => Promise<Response>`

`download_url`의 실제 호스트는 공개 문서에 나와 있지 않다. 기본값 `.oaiusercontent.com`으로 시작하고 Task 19의 실제 연결 확인에서 검증한다. 다르면 `MCP_CHATGPT_FILE_HOST_SUFFIXES` 변수만 바꾼다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-chatgpt-file.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CHATGPT_FILE_HOST_SUFFIXES,
  downloadChatGptFile,
  isAllowedChatGptFileUrl,
} from "../features/mcp/files/chatgpt-file";
import { McpUploadError } from "../features/mcp/files/mcp-upload-service";
import { pngBytes } from "./mcp-file-fixtures";

const hosts = DEFAULT_CHATGPT_FILE_HOST_SUFFIXES;
const file = {
  download_url: "https://files.oaiusercontent.com/file-abc?sig=1",
  file_id: "file-abc",
  mime_type: "image/png",
  file_name: "사진.png",
};

describe("ChatGPT 파일 주소 검사", () => {
  it.each([
    ["https://files.oaiusercontent.com/file-1", true],
    ["https://sdmntpr.oaiusercontent.com/x", true],
    ["http://files.oaiusercontent.com/file-1", false],
    ["https://evil-oaiusercontent.com/x", false],
    ["https://oaiusercontent.com.evil.test/x", false],
    ["https://127.0.0.1/x", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isAllowedChatGptFileUrl(url, hosts)).toBe(expected);
  });
});

describe("ChatGPT 파일 다운로드", () => {
  it("허용 호스트가 아니면 요청하지 않는다", async () => {
    const fetchMock = vi.fn();
    await expect(
      downloadChatGptFile(
        { ...file, download_url: "https://example.test/a.png" },
        {
          fetch: fetchMock,
          hostSuffixes: hosts,
        },
      ),
    ).rejects.toBeInstanceOf(McpUploadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("리다이렉트를 따라가지 않는다", async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.redirect).toBe("manual");
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/" },
      });
    });
    await expect(
      downloadChatGptFile(file, { fetch: fetchMock, hostSuffixes: hosts }),
    ).rejects.toThrow("다른 곳으로 이동");
  });

  it("크기를 알 수 없으면 411, 100MB를 넘으면 413이다", async () => {
    const noLength = vi.fn(async () => new Response(pngBytes(1, 1)));
    await expect(
      downloadChatGptFile(file, { fetch: noLength, hostSuffixes: hosts }),
    ).rejects.toMatchObject({
      status: 411,
    });

    const tooLarge = vi.fn(
      async () =>
        new Response(pngBytes(1, 1), {
          headers: { "content-length": "100000001" },
        }),
    );
    await expect(
      downloadChatGptFile(file, { fetch: tooLarge, hostSuffixes: hosts }),
    ).rejects.toMatchObject({
      status: 413,
    });
  });

  it("이름·형식·크기·본문을 돌려준다", async () => {
    const bytes = pngBytes(2, 2);
    const fetchMock = vi.fn(
      async () =>
        new Response(bytes, {
          headers: {
            "content-length": String(bytes.length),
            "content-type": "application/octet-stream",
          },
        }),
    );
    const downloaded = await downloadChatGptFile(file, {
      fetch: fetchMock,
      hostSuffixes: hosts,
    });
    expect(downloaded).toMatchObject({
      fileName: "사진.png",
      contentType: "image/png",
      size: bytes.length,
    });
  });
});
```

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-chatgpt-file.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 2: `chatgpt-file.ts`를 만든다**

```ts
import { MCP_UPLOAD_MAX_BYTES } from "@yonyoung/contracts/mcp";
import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";
import { z } from "zod";
import type { AppBindings } from "../../../types/honoAppType";
import { McpUploadError } from "./mcp-upload-service";

/** Apps SDK 규칙: 네 속성을 모두 선언하고 download_url, file_id만 required로 둔다. */
export const chatGptFileSchema = z
  .object({
    download_url: z.url().describe("ChatGPT가 채우는 임시 다운로드 URL"),
    file_id: z.string().describe("ChatGPT 파일 ID"),
    mime_type: z.string().optional(),
    file_name: z.string().optional(),
  })
  .describe("ChatGPT에서 채팅에 올린 파일. ChatGPT가 자동으로 채웁니다.");

export type ChatGptFileRef = z.infer<typeof chatGptFileSchema>;

export const uploadIdSchema = z
  .string()
  .min(1)
  .describe("Claude: upload_prepare로 준비하고 올린 업로드의 upload_id");

export const DEFAULT_CHATGPT_FILE_HOST_SUFFIXES = [".oaiusercontent.com"];

export const resolveChatGptFileHostSuffixes = (
  env: Partial<AppBindings> | undefined,
): string[] => {
  const raw = env?.MCP_CHATGPT_FILE_HOST_SUFFIXES?.trim();
  if (!raw) {
    return DEFAULT_CHATGPT_FILE_HOST_SUFFIXES;
  }
  return raw
    .split(",")
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean)
    .map((suffix) => (suffix.startsWith(".") ? suffix : `.${suffix}`));
};

export const isAllowedChatGptFileUrl = (
  value: string,
  hostSuffixes: readonly string[],
): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  const hostname = url.hostname.toLowerCase();
  return hostSuffixes.some(
    (suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length,
  );
};

const fileNameFromUrl = (value: string): string | null => {
  const last = new URL(value).pathname.split("/").filter(Boolean).pop();
  return last ? decodeURIComponent(last) : null;
};

/**
 * ChatGPT가 넘긴 download_url에서 파일을 받는다. 허용 호스트만 요청하고 리다이렉트는 따르지 않는다.
 * R2는 길이를 모르는 스트림을 받지 않으므로 Content-Length가 없으면 거부한다.
 */
export const downloadChatGptFile = async (
  file: ChatGptFileRef,
  deps: {
    fetch: (request: Request) => Promise<Response>;
    hostSuffixes: readonly string[];
  },
): Promise<{
  fileName: string;
  contentType: string;
  size: number;
  body: ReadableStream<Uint8Array>;
}> => {
  if (!isAllowedChatGptFileUrl(file.download_url, deps.hostSuffixes)) {
    throw new McpUploadError(400, "ChatGPT가 준 파일 주소가 아닙니다.");
  }

  const response = await deps.fetch(
    new Request(file.download_url, { redirect: "manual" }),
  );
  if (response.status >= 300 && response.status < 400) {
    throw new McpUploadError(
      502,
      "ChatGPT 파일 주소가 다른 곳으로 이동했습니다. 파일을 다시 올려 주세요.",
    );
  }
  if (!response.ok || !response.body) {
    throw new McpUploadError(
      502,
      `ChatGPT 파일을 내려받지 못했습니다(HTTP ${response.status}).`,
    );
  }

  const lengthHeader = response.headers.get("content-length");
  if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
    await response.body.cancel();
    throw new McpUploadError(
      411,
      "ChatGPT 파일 크기를 알 수 없어 받을 수 없습니다.",
    );
  }
  const size = Number(lengthHeader);
  if (size > MCP_UPLOAD_MAX_BYTES) {
    await response.body.cancel();
    throw new McpUploadError(
      413,
      "MCP로는 파일당 100MB까지 올릴 수 있습니다. 더 큰 파일은 대시보드에서 올려 주세요.",
    );
  }

  return {
    fileName:
      file.file_name?.trim() ||
      fileNameFromUrl(file.download_url) ||
      file.file_id,
    contentType: normalizeUploadContentType(
      file.mime_type ??
        response.headers.get("content-type") ??
        "application/octet-stream",
    ),
    size,
    body: response.body,
  };
};
```

`bindings/types.ts`의 `RuntimeBindingOverrides`에 추가한다.

```ts
  /** ChatGPT 파일 download_url 허용 호스트 접미사(쉼표 구분). 기본 .oaiusercontent.com */
  MCP_CHATGPT_FILE_HOST_SUFFIXES?: string;
```

- [ ] **Step 3: 파일 참조 해석기를 만든다**

`apps/api/src/features/mcp/files/file-ref.ts`:

```ts
import type { McpUploadPurpose } from "@yonyoung/contracts/mcp";
import type { Actor } from "../../../lib/authorization/types";
import { downloadChatGptFile, type ChatGptFileRef } from "./chatgpt-file";
import {
  toResolvedUpload,
  type McpUploadService,
  type ResolvedUpload,
} from "./mcp-upload-service";

export type McpFileResolver = {
  /** ChatGPT 파일은 내려받아 저장하고, upload_id는 완료 여부를 확인한다. ChatGPT 파일이 먼저 온다. */
  resolve: (input: {
    purpose: McpUploadPurpose;
    chatGptFiles?: ChatGptFileRef[];
    uploadIds?: string[];
  }) => Promise<ResolvedUpload[]>;
  /** 도구가 라우트를 부르기 직전에 업로드를 소비 상태로 잡는다. */
  claim: (files: ResolvedUpload[]) => Promise<void>;
  /** 라우트 호출이 실패하면 되돌려 다시 쓸 수 있게 한다. */
  release: (files: ResolvedUpload[]) => Promise<void>;
};

export const createMcpFileResolver = (input: {
  actor: Actor;
  uploads: McpUploadService;
  fetch: (request: Request) => Promise<Response>;
  hostSuffixes: readonly string[];
}): McpFileResolver => ({
  async resolve({ purpose, chatGptFiles = [], uploadIds = [] }) {
    const resolved: ResolvedUpload[] = [];
    for (const file of chatGptFiles) {
      const downloaded = await downloadChatGptFile(file, {
        fetch: input.fetch,
        hostSuffixes: input.hostSuffixes,
      });
      const record = await input.uploads.ingest(input.actor, {
        purpose,
        ...downloaded,
      });
      resolved.push(toResolvedUpload(record));
    }
    resolved.push(
      ...(await input.uploads.resolveCompleted(
        input.actor,
        purpose,
        uploadIds,
      )),
    );
    return resolved;
  },
  claim: (files) => input.uploads.claim(input.actor, files),
  release: (files) => input.uploads.release(files),
});
```

- [ ] **Step 4: 컨텍스트와 의존성을 연결한다**

`tool-definition.ts`:

```ts
import type { McpFileResolver } from "./files/file-ref";

export type McpToolContext = {
  actor: Actor;
  api: InternalApiClient;
  uploads: McpUploadService;
  files: McpFileResolver;
};
```

`dependencies.ts`의 `AppDependencies`에 `fetchChatGptFile: (request: Request) => Promise<Response>;`, 기본값에 `fetchChatGptFile: (request) => fetch(request),`를 추가한다.

`mcp.routes.ts`의 `createMcpToolContext`를 바꾼다.

```ts
const createMcpToolContext = (
  c: Context<HonoAppType>,
  input: {
    actor: Actor;
    dispatch: InternalDispatch;
    dependencies: AppDependencies;
  },
): McpToolContext => {
  const uploads = createRequestMcpUploadService(c, input.dependencies);
  return {
    actor: input.actor,
    api: createInternalApiClient({
      dispatch: input.dispatch,
      env: c.env,
      executionCtx: readExecutionContext(c),
      actor: input.actor,
      origin: new URL(c.req.url).origin,
      requestId: c.get("requestId") ?? crypto.randomUUID(),
    }),
    uploads,
    files: createMcpFileResolver({
      actor: input.actor,
      uploads,
      fetch: input.dependencies.fetchChatGptFile,
      hostSuffixes: resolveChatGptFileHostSuffixes(c.env),
    }),
  };
};
```

import: `createMcpFileResolver`(`./files/file-ref`), `resolveChatGptFileHostSuffixes`(`./files/chatgpt-file`).

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-chatgpt-file.test.ts src/tests/mcp-upload.routes.test.ts`
Expected: PASS

Run: `pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src
git commit -m "feat(api): fetch ChatGPT file params into managed storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 13: 파일을 받는 도구 9개

**Files:**

- Modify: `apps/api/src/features/exhibitions/exhibition.contract.ts` (`ExhibitionInputObjectSchema` export)
- Create: `apps/api/src/features/mcp/files/file-tool.ts`
- Modify: `apps/api/src/features/mcp/tools/{account,activity,exhibition,attachment,settings}.tools.ts`
- Test: `apps/api/src/tests/mcp-file-tools.test.ts`

**Interfaces:**

- Consumes: `McpFileResolver`, `chatGptFileSchema`, `uploadIdSchema` (Task 12), `uploadErrorResult` (Task 11)
- Produces:
  - `runWithFiles(context, files: ResolvedUpload[], request: InternalApiRequest, summary: string): Promise<CallToolResult>`
  - `withUploadErrors(context, run: () => Promise<CallToolResult>): Promise<CallToolResult>`
  - 도구: `my_profile_photo_set`, `activity_create`, `activity_update`, `activity_images_add`, `exhibition_create`, `exhibition_update`, `exhibition_images_add`, `attachment_create`, `recruiting_plan_upsert`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-file-tools.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import { pdfBytes, pngBytes } from "./mcp-file-fixtures";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
  uploadViaClaudePath,
} from "./mcp-test-harness";
import {
  IDs,
  MANAGED_FILE_TEST_ENV,
  buildManagedFileUrl,
  createActivity,
  createActor,
  createAttachment,
  createDataServiceMock,
  createExhibition,
  createPresignServiceMock,
  createUser,
} from "./test-helpers";

describe("카탈로그 ↔ 정의", () => {
  it("모든 카탈로그 도구가 정의되어 있고 그 반대도 같다", () => {
    expect([...MCP_TOOL_DEFINITIONS.keys()].sort()).toEqual(
      MCP_TOOL_CATALOG.map((tool) => tool.name).sort(),
    );
  });

  it("파일 도구에는 openai/fileParams가 붙는다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
      }),
    );
    const { tools } = await client.listTools();
    const imagesAdd = tools.find((tool) => tool.name === "activity_images_add");
    expect(imagesAdd?._meta?.["openai/fileParams"]).toEqual(["files"]);
  });
});

describe("activity_images_add", () => {
  it("Claude 업로드를 세부 이미지로 추가하고 다시 쓰지 못하게 한다", async () => {
    const addActivityImages = vi.fn(async () => []);
    const uploadStore = createMemoryMcpUploadStore();
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      uploadStore,
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages,
      }),
    });
    const client = await connectMcpClient(app);
    const first = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(640, 480),
    });

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [first] },
    });

    expect(result.isError).toBeFalsy();
    expect(addActivityImages).toHaveBeenCalledWith(
      IDs.activity,
      [expect.objectContaining({ sortOrder: 0, width: 640, height: 480 })],
      expect.anything(),
    );
    expect((await uploadStore.getById(first))?.status).toBe("consumed");

    const again = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [first] },
    });
    expect(again.isError).toBe(true);
    expect(resultText(again)).toContain("이미 사용한 업로드");
  });

  it("라우트가 실패하면 업로드를 되돌려 다시 쓸 수 있다", async () => {
    const uploadStore = createMemoryMcpUploadStore();
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      uploadStore,
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages: async () => {
          throw new Error("D1 down");
        },
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(1, 1),
    });

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [uploadId] },
    });
    expect(result.isError).toBe(true);
    expect((await uploadStore.getById(uploadId))?.status).toBe("completed");
  });

  it("다른 용도로 준비한 업로드는 받지 않는다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getExhibitionById: async () => createExhibition({ detailImages: [] }),
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(1, 1),
    });

    const result = await client.callTool({
      name: "exhibition_images_add",
      arguments: { id: IDs.exhibition, upload_ids: [uploadId] },
    });
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("activity_image 용도로 준비한 업로드");
  });

  it("ChatGPT 파일을 내려받아 추가한다", async () => {
    const bytes = pngBytes(3, 2);
    const addActivityImages = vi.fn(async () => []);
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages,
      }),
      overrides: {
        fetchChatGptFile: async () =>
          new Response(bytes, {
            headers: { "content-length": String(bytes.length) },
          }),
      },
    });
    const client = await connectMcpClient(app);

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: {
        id: IDs.activity,
        files: [
          {
            download_url: "https://files.oaiusercontent.com/file-1",
            file_id: "file-1",
            mime_type: "image/png",
            file_name: "a.png",
          },
        ],
      },
    });

    expect(result.isError).toBeFalsy();
    expect(addActivityImages).toHaveBeenCalledWith(
      IDs.activity,
      [expect.objectContaining({ width: 3, height: 2 })],
      expect.anything(),
    );
  });
});

describe("my_profile_photo_set", () => {
  it("올린 이미지를 프로필 사진으로 바꾼다", async () => {
    const updateUser = vi.fn(async () => createUser({ id: IDs.member }));
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById: async () => createUser({ id: IDs.member }),
        updateUser,
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "profile_image",
      fileName: "me.png",
      contentType: "image/png",
      bytes: pngBytes(10, 10),
    });

    const result = await client.callTool({
      name: "my_profile_photo_set",
      arguments: { upload_id: uploadId },
    });
    expect(result.isError).toBeFalsy();
    expect(updateUser).toHaveBeenCalledWith(
      IDs.member,
      expect.objectContaining({ image: expect.stringContaining("users/") }),
      expect.anything(),
    );
  });
});

describe("attachment_create", () => {
  it("문서를 활동 자료로 등록한다", async () => {
    const addAttachment = vi.fn(async () =>
      createAttachment({ scope: "activity", resourceId: IDs.activity }),
    );
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        allocateManagedObject: async () => {
          const publicUrl = buildManagedFileUrl("activities", IDs.manager);
          return {
            objectKey: decodeURIComponent(
              new URL(publicUrl).pathname.replace("/api/public/media/", ""),
            ),
            publicUrl,
          };
        },
      }),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity(),
        addAttachment,
      }),
    });
    const client = await connectMcpClient(app, { env: MANAGED_FILE_TEST_ENV });
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_file",
      fileName: "정산.pdf",
      contentType: "application/pdf",
      bytes: pdfBytes(),
    });

    const result = await client.callTool({
      name: "attachment_create",
      arguments: {
        data: {
          scope: "activity",
          resourceId: IDs.activity,
          title: "봄 출사 정산",
        },
        upload_id: uploadId,
      },
    });

    expect(result.isError, resultText(result)).toBeFalsy();
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "정산.pdf",
        mimeType: "application/pdf",
      }),
      expect.anything(),
    );
  });
});
```

`addActivityImages`, `updateUser`, `addAttachment`의 실제 시그니처는 `lib/services/types.ts`를 따른다. 인자 수가 다르면 `toHaveBeenCalledWith`의 인자를 맞춘다. 검증할 핵심은 활동 ID, 이미지 URL·크기, 사용자 ID, 파일 메타데이터다. `uploadViaClaudePath`가 `connectMcpClient`의 env를 쓰지 않는 점에 주의한다. PUT 경로는 env 없이도 동작한다.

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-file-tools.test.ts`
Expected: FAIL — 카탈로그·정의 불일치, 도구 없음

- [ ] **Step 2: 공용 도우미를 만든다**

`apps/api/src/features/mcp/files/file-tool.ts`:

```ts
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { InternalApiRequest } from "../internal-api";
import type { McpToolContext } from "../tool-definition";
import { toToolResult } from "../tool-result";
import { uploadErrorResult, type ResolvedUpload } from "./mcp-upload-service";

/** 업로드를 소비 상태로 잡고 라우트를 부른다. 라우트가 실패하면 업로드를 되돌린다. */
export const runWithFiles = async (
  context: McpToolContext,
  files: ResolvedUpload[],
  request: InternalApiRequest,
  summary: string,
): Promise<CallToolResult> => {
  await context.files.claim(files);
  const result = await context.api.call(request);
  if (!result.ok) {
    await context.files.release(files);
  }
  return toToolResult(result, { summary, role: context.actor.role });
};

export const withUploadErrors = async (
  context: McpToolContext,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> => {
  try {
    return await run();
  } catch (error) {
    return uploadErrorResult(error, context.actor.role);
  }
};

export const imageBatchItem = (file: ResolvedUpload, sortOrder: number) => ({
  imageUrl: file.publicUrl,
  sortOrder,
  ...(file.width && file.height
    ? { width: file.width, height: file.height }
    : {}),
});

/** 기존 세부 이미지 뒤에 붙일 첫 순서. */
export const nextSortOrder = (images: Array<{ sortOrder: number }>): number =>
  images.length === 0
    ? 0
    : Math.max(...images.map((image) => image.sortOrder)) + 1;
```

- [ ] **Step 3: 전시 입력 스키마를 export한다**

`apps/api/src/features/exhibitions/exhibition.contract.ts`에서 `const ExhibitionInputObjectSchema`를 `export const ExhibitionInputObjectSchema`로 바꾼다. 다른 줄은 건드리지 않는다.

- [ ] **Step 4: 파일 도구를 추가한다**

`account.tools.ts` 배열에 추가한다.

```ts
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { runWithFiles, withUploadErrors } from "../files/file-tool";

  defineTool({
    name: "my_profile_photo_set",
    inputSchema: z.object({
      file: chatGptFileSchema.optional(),
      upload_id: uploadIdSchema.optional(),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const files = await context.files.resolve({
          purpose: "profile_image",
          chatGptFiles: args.file ? [args.file] : [],
          uploadIds: args.upload_id ? [args.upload_id] : [],
        });
        if (files.length !== 1) {
          return toolFailure("프로필 사진으로 쓸 이미지 하나를 file 또는 upload_id로 넣어 주세요.");
        }
        return runWithFiles(
          context,
          files,
          { method: "PATCH", path: `/api/users/${encodeURIComponent(context.actor.id)}`, body: { image: files[0]!.publicUrl } },
          "프로필 사진을 바꿨습니다.",
        );
      }),
  }),
```

`activity.tools.ts`:

```ts
import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts/common";
import {
  ApiCreateActivitySchema,
  ApiListActivitiesQuerySchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
  ApiUpdateActivitySchema,
} from "../../activities/activity.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { imageBatchItem, nextSortOrder, runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { describeApiFailure, toolFailure } from "../tool-result";

const coverArgs = {
  cover_file: chatGptFileSchema.optional(),
  cover_upload_id: uploadIdSchema.optional(),
};

  defineTool({
    name: "activity_create",
    inputSchema: z.object({
      data: ApiCreateActivitySchema.extend({
        coverImageUrl: ApiCreateActivitySchema.shape.coverImageUrl
          .optional()
          .describe("이미 있는 이미지 URL. 채팅 파일을 쓰면 비웁니다."),
      }).describe("날짜는 밀리초 단위 Unix 시간입니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const covers = await context.files.resolve({
          purpose: "activity_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        if (covers.length > 1) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const coverImageUrl = covers[0]?.publicUrl ?? args.data.coverImageUrl;
        if (!coverImageUrl) {
          return toolFailure(
            "커버 이미지가 필요합니다. data.coverImageUrl, cover_file, cover_upload_id 중 하나를 넣어 주세요.",
          );
        }
        return runWithFiles(
          context,
          covers,
          { method: "POST", path: "/api/activities", body: { ...args.data, coverImageUrl } },
          "활동을 만들었습니다.",
        );
      }),
  }),
  defineTool({
    name: "activity_update",
    inputSchema: z.object({
      id: activityId,
      data: ApiUpdateActivitySchema.describe("바꿀 필드만 넣습니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const covers = await context.files.resolve({
          purpose: "activity_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        if (covers.length > 1) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const body = covers[0] ? { ...args.data, coverImageUrl: covers[0].publicUrl } : args.data;
        return runWithFiles(
          context,
          covers,
          { method: "PATCH", path: `/api/activities/${args.id}`, body },
          "활동을 수정했습니다.",
        );
      }),
  }),
  defineTool({
    name: "activity_images_add",
    inputSchema: z.object({
      id: activityId,
      files: z.array(chatGptFileSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      upload_ids: z.array(uploadIdSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      start_sort_order: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("첫 사진의 표시 순서. 비우면 기존 사진 뒤에 붙습니다."),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        // 활동이 없으면 파일을 받기 전에 끝낸다.
        const activity = await context.api.call({ method: "GET", path: `/api/activities/${args.id}` });
        if (!activity.ok) {
          return toolFailure(describeApiFailure(activity, context.actor.role));
        }
        const files = await context.files.resolve({
          purpose: "activity_image",
          chatGptFiles: args.files,
          uploadIds: args.upload_ids,
        });
        if (files.length === 0) {
          return toolFailure("추가할 사진을 files 또는 upload_ids로 넣어 주세요.");
        }
        const existing = (activity.data as { detailImages?: Array<{ sortOrder: number }> }).detailImages ?? [];
        const start = args.start_sort_order ?? nextSortOrder(existing);
        return runWithFiles(
          context,
          files,
          {
            method: "POST",
            path: `/api/activities/${args.id}/images/batch`,
            body: files.map((file, index) => imageBatchItem(file, start + index)),
          },
          `사진 ${files.length}장을 추가했습니다.`,
        );
      }),
  }),
```

`exhibition.tools.ts`: 같은 구조로 세 도구를 추가한다. 차이점은 다음과 같다.

- `exhibition_create`의 data: `ExhibitionInputObjectSchema.extend({ coverImageUrl: ExhibitionInputObjectSchema.shape.coverImageUrl.optional().describe("이미 있는 이미지 URL. 채팅 파일을 쓰면 비웁니다.") })`. `ExhibitionInputObjectSchema`는 `../../exhibitions/exhibition.contract`에서 import한다.
- `exhibition_update`의 data: `ApiUpdateExhibitionSchema`
- purpose: 커버는 `exhibition_cover`, 사진은 `exhibition_image`
- 경로: `/api/exhibitions`, `/api/exhibitions/${args.id}`, `/api/exhibitions/${args.id}/images/batch`
- 요약 문구: "전시를 만들었습니다.", "전시를 수정했습니다.", `사진 ${files.length}장을 추가했습니다.`

전체 코드는 다음과 같다.

```ts
import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts/common";
import {
  ApiListExhibitionsQuerySchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
  ApiUpdateExhibitionSchema,
  ExhibitionInputObjectSchema,
} from "../../exhibitions/exhibition.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { imageBatchItem, nextSortOrder, runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { describeApiFailure, toolFailure } from "../tool-result";

const coverArgs = {
  cover_file: chatGptFileSchema.optional(),
  cover_upload_id: uploadIdSchema.optional(),
};

  defineTool({
    name: "exhibition_create",
    inputSchema: z.object({
      data: ExhibitionInputObjectSchema.extend({
        coverImageUrl: ExhibitionInputObjectSchema.shape.coverImageUrl
          .optional()
          .describe("이미 있는 이미지 URL. 채팅 파일을 쓰면 비웁니다."),
      }).describe("날짜는 밀리초 단위 Unix 시간입니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const covers = await context.files.resolve({
          purpose: "exhibition_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        if (covers.length > 1) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const coverImageUrl = covers[0]?.publicUrl ?? args.data.coverImageUrl;
        if (!coverImageUrl) {
          return toolFailure(
            "커버 이미지가 필요합니다. data.coverImageUrl, cover_file, cover_upload_id 중 하나를 넣어 주세요.",
          );
        }
        return runWithFiles(
          context,
          covers,
          { method: "POST", path: "/api/exhibitions", body: { ...args.data, coverImageUrl } },
          "전시를 만들었습니다.",
        );
      }),
  }),
  defineTool({
    name: "exhibition_update",
    inputSchema: z.object({
      id: exhibitionId,
      data: ApiUpdateExhibitionSchema.describe("바꿀 필드만 넣습니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const covers = await context.files.resolve({
          purpose: "exhibition_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        if (covers.length > 1) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const body = covers[0] ? { ...args.data, coverImageUrl: covers[0].publicUrl } : args.data;
        return runWithFiles(
          context,
          covers,
          { method: "PATCH", path: `/api/exhibitions/${args.id}`, body },
          "전시를 수정했습니다.",
        );
      }),
  }),
  defineTool({
    name: "exhibition_images_add",
    inputSchema: z.object({
      id: exhibitionId,
      files: z.array(chatGptFileSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      upload_ids: z.array(uploadIdSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      start_sort_order: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("첫 사진의 표시 순서. 비우면 기존 사진 뒤에 붙습니다."),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const exhibition = await context.api.call({ method: "GET", path: `/api/exhibitions/${args.id}` });
        if (!exhibition.ok) {
          return toolFailure(describeApiFailure(exhibition, context.actor.role));
        }
        const files = await context.files.resolve({
          purpose: "exhibition_image",
          chatGptFiles: args.files,
          uploadIds: args.upload_ids,
        });
        if (files.length === 0) {
          return toolFailure("추가할 사진을 files 또는 upload_ids로 넣어 주세요.");
        }
        const existing = (exhibition.data as { detailImages?: Array<{ sortOrder: number }> }).detailImages ?? [];
        const start = args.start_sort_order ?? nextSortOrder(existing);
        return runWithFiles(
          context,
          files,
          {
            method: "POST",
            path: `/api/exhibitions/${args.id}/images/batch`,
            body: files.map((file, index) => imageBatchItem(file, start + index)),
          },
          `사진 ${files.length}장을 추가했습니다.`,
        );
      }),
  }),
```

`attachment.tools.ts`:

```ts
import {
  ApiAttachmentListQuerySchema,
  ApiCreateAttachmentSchema,
  ApiUpdateAttachmentSchema,
} from "../../attachments/attachment.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { toolFailure } from "../tool-result";

const attachmentFields = ApiCreateAttachmentSchema.shape;

  defineTool({
    name: "attachment_create",
    inputSchema: z.object({
      data: z.object({
        scope: attachmentFields.scope,
        resourceId: attachmentFields.resourceId,
        title: attachmentFields.title,
        sortOrder: attachmentFields.sortOrder,
        linkUrl: attachmentFields.linkUrl,
      }),
      file: chatGptFileSchema.optional(),
      upload_id: uploadIdSchema.optional(),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const files = await context.files.resolve({
          purpose: args.data.scope === "site_donate" ? "site_file" : "activity_file",
          chatGptFiles: args.file ? [args.file] : [],
          uploadIds: args.upload_id ? [args.upload_id] : [],
        });
        if (files.length > 1) {
          return toolFailure("자료 파일은 하나만 넣을 수 있습니다.");
        }
        const file = files[0];
        if (file && args.data.linkUrl) {
          return toolFailure("파일과 linkUrl 중 하나만 넣어 주세요.");
        }
        const body = file
          ? {
              ...args.data,
              fileUrl: file.publicUrl,
              fileName: file.fileName,
              fileSize: file.size,
              mimeType: file.contentType,
            }
          : args.data;
        return runWithFiles(
          context,
          files,
          { method: "POST", path: "/api/attachments", body },
          "첨부 자료를 등록했습니다.",
        );
      }),
  }),
```

`settings.tools.ts`:

```ts
import { ApiUpsertCurrentRecruitingPlanSchema } from "../../recruiting-plan/recruiting-plan.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool } from "../tool-definition";
import { toolFailure } from "../tool-result";

const MAX_PROMOTION_IMAGES = 10;

  defineTool({
    name: "recruiting_plan_upsert",
    inputSchema: z.object({
      data: ApiUpsertCurrentRecruitingPlanSchema.describe(
        "promotionImageUrls에는 유지할 기존 이미지 URL을 넣습니다. 날짜는 밀리초 단위 Unix 시간입니다.",
      ),
      promotion_files: z.array(chatGptFileSchema).max(MAX_PROMOTION_IMAGES).optional(),
      promotion_upload_ids: z.array(uploadIdSchema).max(MAX_PROMOTION_IMAGES).optional(),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const files = await context.files.resolve({
          purpose: "recruiting_image",
          chatGptFiles: args.promotion_files,
          uploadIds: args.promotion_upload_ids,
        });
        const promotionImageUrls = [
          ...args.data.promotionImageUrls,
          ...files.map((file) => file.publicUrl),
        ];
        if (promotionImageUrls.length > MAX_PROMOTION_IMAGES) {
          return toolFailure(`홍보 이미지는 최대 ${MAX_PROMOTION_IMAGES}장입니다.`);
        }
        return runWithFiles(
          context,
          files,
          {
            method: "PATCH",
            path: "/api/recruiting-plan/current",
            body: { ...args.data, promotionImageUrls },
          },
          "모집 계획을 저장했습니다.",
        );
      }),
  }),
```

`ApiUpsertCurrentRecruitingPlanSchema`가 `promotionImageUrls`의 최대 개수를 다르게 두고 있으면 `MAX_PROMOTION_IMAGES`를 그 값으로 맞춘다. 2026-10-08 기준은 10이다.

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-file-tools.test.ts`
Expected: PASS

Run: `pnpm --filter @yonyoung/api test:node && pnpm --filter @yonyoung/api typecheck && pnpm --filter @yonyoung/api lint`
Expected: 전부 PASS. OpenAPI 스냅샷 변화 없음. `ExhibitionInputObjectSchema` export는 OpenAPI 등록에 영향을 주지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src
git commit -m "feat(api): add MCP tools that attach chat files to dashboard content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

## 5단계: 웹

### Task 14: 웹이 쓰는 MCP API — 도구 목록, 연결 관리, 동의 화면 정보

**Files:**

- Modify: `apps/api/src/features/mcp/exposure.ts` (`buildMcpOverview`)
- Modify: `apps/api/src/features/mcp/mcp-connection-store.ts` (`getClient`)
- Modify: `apps/api/src/lib/services/dependencies.ts` (`verifyOAuthConsentQuery`)
- Modify: `apps/api/src/features/mcp/mcp.routes.ts`
- Test: `apps/api/src/tests/mcp-web.routes.test.ts`

**Interfaces:**

- Consumes: `listExposedTools` (Task 6), `McpConnectionStore` (Task 5), `ApiMcpOverview`·`ApiMcpConnection`·`ApiMcpConsentContext` (Task 1)
- Produces:
  - `buildMcpOverview(role: Role, serverUrl: string): ApiMcpOverview`
  - `McpConnectionStore.getClient(clientId: string): Promise<{ clientId: string; name: string | null; uri: string | null } | null>`
  - `AppDependencies.verifyOAuthConsentQuery: (c, query: string) => Promise<boolean>`
  - 라우트(세션 인증):
    - `GET /api/mcp/tools` → `{ data: ApiMcpOverview }`
    - `GET /api/mcp/connections` → `{ data: ApiMcpConnection[] }`
    - `DELETE /api/mcp/connections/:clientId` → 204 / 404
    - `GET /api/mcp/consent-context?<서명된 쿼리>` → `{ data: ApiMcpConsentContext }` / 400

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/api/src/tests/mcp-web.routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryMcpConnectionStore } from "../features/mcp/mcp-connection-store";
import { IDs, createActor, createTestApp } from "./test-helpers";

const createWebApp = (input: {
  actor: ReturnType<typeof createActor> | null;
  verified?: boolean;
}) => {
  const connections = createMemoryMcpConnectionStore([
    { userId: IDs.manager, clientId: "claude-client", clientName: "Claude" },
  ]);
  return {
    connections,
    app: createTestApp({
      actor: input.actor,
      overrides: {
        getMcpConnectionStore: () => connections,
        verifyOAuthConsentQuery: async () => input.verified ?? true,
      },
    }),
  };
};

describe("GET /api/mcp/tools", () => {
  it("로그인하지 않으면 401이다", async () => {
    const { app } = createWebApp({ actor: null });
    expect((await app.request("/api/mcp/tools")).status).toBe(401);
  });

  it("역할에 맞는 도구와 커넥터 URL을 준다", async () => {
    const { app } = createWebApp({ actor: createActor("regular_member") });
    const body = (await (await app.request("/api/mcp/tools")).json()) as {
      data: { serverUrl: string; role: string; tools: Array<{ name: string }> };
    };
    expect(body.data.serverUrl).toBe("http://localhost:8787/mcp");
    expect(body.data.role).toBe("regular_member");
    const names = body.data.tools.map((tool) => tool.name);
    expect(names).toContain("whoami");
    expect(names).not.toContain("dashboard_overview");
  });

  it("승인 대기 사용자는 빈 목록을 받는다", async () => {
    const { app } = createWebApp({ actor: createActor("unverified") });
    const body = (await (await app.request("/api/mcp/tools")).json()) as {
      data: { tools: unknown[] };
    };
    expect(body.data.tools).toEqual([]);
  });
});

describe("/api/mcp/connections", () => {
  it("내 연결만 보여주고 해제한다", async () => {
    const { app, connections } = createWebApp({
      actor: createActor("manager", IDs.manager),
    });
    const list = (await (await app.request("/api/mcp/connections")).json()) as {
      data: Array<{ clientId: string; clientName: string }>;
    };
    expect(list.data).toMatchObject([
      { clientId: "claude-client", clientName: "Claude" },
    ]);

    const removed = await app.request("/api/mcp/connections/claude-client", {
      method: "DELETE",
    });
    expect(removed.status).toBe(204);
    expect(await connections.hasConsent(IDs.manager, "claude-client")).toBe(
      false,
    );
  });

  it("다른 사람의 연결은 404다", async () => {
    const { app } = createWebApp({
      actor: createActor("regular_member", IDs.member),
    });
    const removed = await app.request("/api/mcp/connections/claude-client", {
      method: "DELETE",
    });
    expect(removed.status).toBe(404);
  });
});

describe("GET /api/mcp/consent-context", () => {
  const query = "client_id=claude-client&scope=openid+mcp&exp=1&sig=abc";

  it("서명이 맞으면 앱 이름과 내 도구를 준다", async () => {
    const { app } = createWebApp({
      actor: createActor("manager", IDs.manager),
    });
    const response = await app.request(`/api/mcp/consent-context?${query}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        client: { name: string };
        scopes: string[];
        overview: { tools: unknown[] };
      };
    };
    expect(body.data.client.name).toBe("Claude");
    expect(body.data.scopes).toEqual(["openid", "mcp"]);
    expect(body.data.overview.tools.length).toBeGreaterThan(0);
  });

  it("서명이 틀리면 400이다", async () => {
    const { app } = createWebApp({
      actor: createActor("manager", IDs.manager),
      verified: false,
    });
    expect(
      (await app.request(`/api/mcp/consent-context?${query}`)).status,
    ).toBe(400);
  });
});
```

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-web.routes.test.ts`
Expected: FAIL — 라우트 없음(404)

- [ ] **Step 2: 개요 생성 함수와 클라이언트 조회를 추가한다**

`exposure.ts` 끝에 추가한다.

```ts
import type { ApiMcpOverview } from "@yonyoung/contracts/mcp";

export const buildMcpOverview = (
  role: Role,
  serverUrl: string,
): ApiMcpOverview => ({
  serverUrl,
  role,
  tools: listExposedTools(role).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    category: tool.category,
    readOnly: tool.readOnly,
    destructive: tool.destructive,
    examplePrompt: tool.examplePrompt,
  })),
});
```

`mcp-connection-store.ts`의 인터페이스에 추가한다.

```ts
  getClient(clientId: string): Promise<{ clientId: string; name: string | null; uri: string | null } | null>;
```

D1 구현에 추가한다.

```ts
  async getClient(clientId) {
    const row = await database
      .prepare(
        "SELECT client_id, name, uri FROM oauth_client WHERE client_id = ? AND (disabled IS NULL OR disabled = 0) LIMIT 1",
      )
      .bind(clientId)
      .first<{ client_id: string; name: string | null; uri: string | null }>();
    return row ? { clientId: row.client_id, name: row.name, uri: row.uri } : null;
  },
```

메모리 구현에 추가한다.

```ts
    async getClient(clientId) {
      const consent = [...consents.values()].find((entry) => entry.clientId === clientId);
      return consent ? { clientId, name: consent.clientName, uri: consent.clientUri } : null;
    },
```

- [ ] **Step 3: 서명 검증 의존성을 추가한다**

`dependencies.ts`:

```ts
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
```

`AppDependencies`에 `verifyOAuthConsentQuery: (c: Context<HonoAppType>, query: string) => Promise<boolean>;`를 추가하고, 기본값을 추가한다.

```ts
  // 동의 화면에 띄울 정보도 Better Auth가 서명한 쿼리일 때만 준다(문서 권장).
  verifyOAuthConsentQuery: async (c, query) => {
    const auth = createAuth(resolveD1Database(c.env), c.env);
    const { secret } = await auth.$context;
    return verifyOAuthQueryParams(query, secret);
  },
```

- [ ] **Step 4: 라우트를 추가한다**

`mcp.routes.ts`의 `registerMcpRoutes` 끝에 추가한다. import: `AppError`(`../../shared/errors/AppError`), `buildMcpOverview`(`./exposure`).

```ts
app.get("/api/mcp/tools", async (c) => {
  const actor = await requireAuthenticatedActor(c, dependencies);
  return c.json({
    data: buildMcpOverview(actor.role, resolveMcpRuntimeEnv(c.env).resourceUrl),
  });
});

app.get("/api/mcp/connections", async (c) => {
  const actor = await requireAuthenticatedActor(c, dependencies);
  const connections = await dependencies
    .getMcpConnectionStore(c)
    .list(actor.id);
  return c.json({
    data: connections.map((connection) => ({
      ...connection,
      connectedAt: new Date(connection.connectedAt).toISOString(),
      updatedAt: new Date(connection.updatedAt).toISOString(),
    })),
  });
});

app.delete("/api/mcp/connections/:clientId", async (c) => {
  const actor = await requireAuthenticatedActor(c, dependencies);
  const revoked = await dependencies
    .getMcpConnectionStore(c)
    .revoke(actor.id, c.req.param("clientId"), Date.now());
  if (!revoked) {
    throw AppError.notFound("연결을 찾을 수 없습니다.");
  }
  return c.body(null, 204);
});

app.get("/api/mcp/consent-context", async (c) => {
  const actor = await requireAuthenticatedActor(c, dependencies);
  const query = new URL(c.req.url).search.slice(1);
  if (!(await dependencies.verifyOAuthConsentQuery(c, query))) {
    throw AppError.badRequest(
      "연결 요청이 만료되었거나 올바르지 않습니다. 처음부터 다시 연결해 주세요.",
    );
  }
  const params = new URLSearchParams(query);
  const client = await dependencies
    .getMcpConnectionStore(c)
    .getClient(params.get("client_id") ?? "");
  if (!client) {
    throw AppError.notFound("연결하려는 앱을 찾을 수 없습니다.");
  }
  return c.json({
    data: {
      client,
      scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
      overview: buildMcpOverview(
        actor.role,
        resolveMcpRuntimeEnv(c.env).resourceUrl,
      ),
    },
  });
});
```

메모리 저장소의 `getClient`는 동의 행을 기준으로 찾는다. 처음 연결하는 앱은 아직 동의가 없으므로 테스트에서는 `claude-client` 시드를 쓴다. D1 구현은 `oauth_client`를 직접 조회하므로 처음 연결도 된다.

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/api exec vitest run src/tests/mcp-web.routes.test.ts && pnpm --filter @yonyoung/api test:node`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src
git commit -m "feat(api): expose MCP tool overview, connections and consent context to the web

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 15: 웹 OAuth 연결 — auth 클라이언트, 로그인 페이지, 프록시, 메타데이터

**Files:**

- Modify: `apps/web/package.json` (`@better-auth/oauth-provider@1.7.7`)
- Modify: `apps/web/features/auth/client/auth-client.ts`
- Create: `apps/web/features/auth/model/oauth-flow.ts`
- Modify: `apps/web/app/(dashboard)/auth/sign-in/page.tsx`
- Create: `apps/web/server/security/oauth-proxy-paths.ts`
- Modify: `apps/web/app/api/auth/[...path]/route.ts`
- Modify: `apps/web/server/security/api-proxy-prefixes.ts` (`"mcp"`)
- Create: `apps/web/server/http/auth-metadata-proxy.ts`
- Create: `apps/web/app/.well-known/oauth-authorization-server/api/auth/route.ts`
- Create: `apps/web/app/.well-known/openid-configuration/api/auth/route.ts`
- Test: `apps/web/tests/unit/features/auth/oauth-flow.test.ts`
- Test: `apps/web/tests/unit/app/api/auth-proxy-route.test.ts` (케이스 추가)
- Test: `apps/web/tests/unit/app/well-known-auth-metadata.test.ts`

**Interfaces:**

- Produces:
  - `isOAuthAuthorizationRequest(searchParams: Record<string, string | string[] | undefined>): boolean`
  - `isServerToServerOAuthPath(path: string): boolean`
  - `proxyAuthMetadata(request: NextRequest, document: "oauth-authorization-server" | "openid-configuration"): Promise<NextResponse>`

- [ ] **Step 1: 패키지를 설치한다**

```bash
pnpm --filter @yonyoung/web add @better-auth/oauth-provider@1.7.7
```

캐럿이 붙었으면 지운다.

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`apps/web/tests/unit/features/auth/oauth-flow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isOAuthAuthorizationRequest } from "@/features/auth/model/oauth-flow";
import { isServerToServerOAuthPath } from "@/server/security/oauth-proxy-paths";

describe("isOAuthAuthorizationRequest", () => {
  it("Better Auth가 서명한 인가 요청 쿼리를 알아본다", () => {
    expect(
      isOAuthAuthorizationRequest({ client_id: "c1", sig: "s", exp: "1" }),
    ).toBe(true);
  });

  it("일반 로그인 쿼리는 아니다", () => {
    expect(isOAuthAuthorizationRequest({})).toBe(false);
    expect(isOAuthAuthorizationRequest({ client_id: "c1" })).toBe(false);
    expect(
      isOAuthAuthorizationRequest({ sig: ["a", "b"], client_id: "c1" }),
    ).toBe(false);
  });
});

describe("isServerToServerOAuthPath", () => {
  it.each([
    ["oauth2/token", true],
    ["oauth2/register", true],
    ["oauth2/revoke", true],
    ["oauth2/consent", false],
    ["sign-in/social", false],
  ])("%s → %s", (path, expected) => {
    expect(isServerToServerOAuthPath(path)).toBe(expected);
  });
});
```

`apps/web/tests/unit/app/api/auth-proxy-route.test.ts`의 `describe` 안에 추가한다.

```ts
it("Origin 없는 OAuth 토큰 요청을 API로 넘긴다", async () => {
  const fetchSpy = vi.fn(
    async () =>
      new Response(JSON.stringify({ access_token: "t" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchSpy);

  const { POST } = await import("@/app/api/auth/[...path]/route");
  const request = new NextRequest(
    "https://localhost:3000/api/auth/oauth2/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=authorization_code&code=abc",
    },
  );

  const response = await POST(request, {
    params: Promise.resolve({ path: ["oauth2", "token"] }),
  });

  expect(response.status).toBe(200);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it("Origin 없는 일반 인증 요청은 여전히 막는다", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);

  const { POST } = await import("@/app/api/auth/[...path]/route");
  const request = new NextRequest(
    "https://localhost:3000/api/auth/sign-in/social",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    },
  );

  const response = await POST(request, {
    params: Promise.resolve({ path: ["sign-in", "social"] }),
  });

  expect(response.status).toBe(403);
  expect(fetchSpy).not.toHaveBeenCalled();
});
```

`apps/web/tests/unit/app/well-known-auth-metadata.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("/.well-known/oauth-authorization-server/api/auth", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("API의 인증 서버 메타데이터를 웹 오리진 기준으로 가져온다", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ issuer: "https://yonyoung.yonsei.ac.kr/api/auth" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } =
      await import("@/app/.well-known/oauth-authorization-server/api/auth/route");
    const response = await GET(
      new NextRequest(
        "https://localhost:3000/.well-known/oauth-authorization-server/api/auth",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      issuer: "https://yonyoung.yonsei.ac.kr/api/auth",
    });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.example.com/api/auth/.well-known/oauth-authorization-server",
    );
    expect((init?.headers as Headers).get("x-forwarded-host")).toBe(
      "yonyoung.yonsei.ac.kr",
    );
  });
});
```

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/auth/oauth-flow.test.ts tests/unit/app/api/auth-proxy-route.test.ts tests/unit/app/well-known-auth-metadata.test.ts`
Expected: FAIL — 모듈 없음, 토큰 요청 403

- [ ] **Step 3: 도우미를 만든다**

`apps/web/features/auth/model/oauth-flow.ts`:

```ts
type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Better Auth OAuth 제공자가 로그인 페이지로 보낼 때 붙이는 서명된 쿼리인지 본다.
 * 이 쿼리가 있으면 로그인 뒤 인가 흐름을 이어가야 하므로 대시보드로 보내지 않는다.
 */
export const isOAuthAuthorizationRequest = (
  searchParams: SearchParams,
): boolean =>
  typeof searchParams.client_id === "string" &&
  typeof searchParams.sig === "string";
```

`apps/web/server/security/oauth-proxy-paths.ts`:

```ts
/**
 * Claude·ChatGPT 서버가 Origin 없이 호출하는 OAuth 엔드포인트.
 * 쿠키 세션을 쓰지 않고 클라이언트 자격 증명과 코드로 인증하므로 동일 출처 검사 대상이 아니다.
 */
const SERVER_TO_SERVER_OAUTH_PATHS = new Set([
  "oauth2/token",
  "oauth2/register",
  "oauth2/revoke",
  "oauth2/introspect",
]);

export const isServerToServerOAuthPath = (path: string): boolean =>
  SERVER_TO_SERVER_OAUTH_PATHS.has(path);
```

`apps/web/server/http/auth-metadata-proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/server/env";
import {
  fetchWithTimeout,
  FetchTimeoutError,
} from "@/server/http/fetch-with-timeout";
import {
  buildUpstreamProxyHeaders,
  resolvePublicRequestOrigin,
} from "@/server/security/request-guards";

const METADATA_TIMEOUT_MS = 10_000;

/**
 * RFC 8414: issuer가 https://host/api/auth이면 메타데이터는
 * https://host/.well-known/oauth-authorization-server/api/auth에 있어야 한다.
 * Better Auth는 /api/auth/.well-known/* 에서 만들므로 그 문서를 웹 오리진 기준으로 가져온다.
 */
export const proxyAuthMetadata = async (
  request: NextRequest,
  document: "oauth-authorization-server" | "openid-configuration",
): Promise<NextResponse> => {
  const publicOrigin = new URL(
    resolvePublicRequestOrigin(request) ?? request.nextUrl.origin,
  );
  try {
    const upstream = await fetchWithTimeout(
      `${getApiBaseUrl()}/api/auth/.well-known/${document}`,
      {
        method: "GET",
        headers: buildUpstreamProxyHeaders(request, {
          extraHeaders: {
            "x-forwarded-host": publicOrigin.host,
            "x-forwarded-proto": publicOrigin.protocol.replace(":", ""),
          },
        }),
        cache: "no-store",
        redirect: "manual",
      },
      METADATA_TIMEOUT_MS,
    );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "temporarily_unavailable" },
      { status: error instanceof FetchTimeoutError ? 504 : 502 },
    );
  }
};
```

`buildUpstreamProxyHeaders`가 `Headers`가 아닌 객체를 돌려주면 테스트의 `(init?.headers as Headers).get(...)`을 그 형태에 맞게 바꾼다. 기존 auth 프록시 테스트가 `Headers`로 다루므로 `Headers`일 것이다.

`apps/web/app/.well-known/oauth-authorization-server/api/auth/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { proxyAuthMetadata } from "@/server/http/auth-metadata-proxy";

export const GET = (request: NextRequest) =>
  proxyAuthMetadata(request, "oauth-authorization-server");
```

`apps/web/app/.well-known/openid-configuration/api/auth/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { proxyAuthMetadata } from "@/server/http/auth-metadata-proxy";

export const GET = (request: NextRequest) =>
  proxyAuthMetadata(request, "openid-configuration");
```

- [ ] **Step 4: auth 프록시, BFF 접두사, auth 클라이언트, 로그인 페이지를 고친다**

`app/api/auth/[...path]/route.ts`의 동일 출처 검사를 바꾼다.

```ts
import { isServerToServerOAuthPath } from "@/server/security/oauth-proxy-paths";

const csrfProtectionResponse = isServerToServerOAuthPath(joinedPath)
  ? null
  : enforceSameOriginProtection(request, {
      requireCsrfHeader: true,
    });
```

`server/security/api-proxy-prefixes.ts`의 `API_PROXY_ALLOWED_PREFIXES`에 `"mcp",`를 `"linktree",` 다음에 추가한다.

`features/auth/client/auth-client.ts`:

```ts
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

export const authClient = createAuthClient({
  baseURL: resolveApiBaseUrl({ clientSide: true }),
  basePath: "/api/auth",
  // OAuth 인가 중 로그인·동의 요청에 서명된 oauth_query를 자동으로 붙인다.
  plugins: [oauthProviderClient()],
  fetchOptions: {
    // ...기존 그대로
  },
});
```

`app/(dashboard)/auth/sign-in/page.tsx`:

```tsx
import { isOAuthAuthorizationRequest } from "@/features/auth/model/oauth-flow";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await readSessionOrNull();
  // AI 앱 연결 중이면 대시보드로 보내지 않는다. 다시 로그인하면 Better Auth가 인가를 이어간다.
  if (session && !isOAuthAuthorizationRequest(query)) {
    const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/auth/oauth-flow.test.ts tests/unit/app/api/auth-proxy-route.test.ts tests/unit/app/well-known-auth-metadata.test.ts tests/unit/server/security/api-proxy-prefixes.test.ts`
Expected: PASS

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): carry OAuth authorization through sign-in and the auth proxy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 16: 동의 화면 `/auth/mcp-consent`

**Files:**

- Create: `apps/web/features/mcp/mcp-tool-groups.ts`
- Create: `apps/web/app/(dashboard)/auth/mcp-consent/page.tsx`
- Create: `apps/web/app/(dashboard)/auth/mcp-consent/consent-client.tsx`
- Test: `apps/web/tests/unit/features/mcp/mcp-tool-groups.test.ts`

**Interfaces:**

- Consumes: `GET /api/mcp/consent-context` (Task 14, BFF 경유), `authClient.oauth2.consent` (Task 15)
- Produces:
  - `groupToolsByCategory(tools: ApiMcpToolSummary[]): Array<{ category: McpToolCategory; label: string; tools: ApiMcpToolSummary[] }>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/web/tests/unit/features/mcp/mcp-tool-groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";

const tool = (name: string, category: "account" | "activities" | "stats") => ({
  name,
  title: name,
  description: "설명입니다. 열 글자 넘게.",
  category,
  readOnly: true,
  destructive: false,
  examplePrompt: "예시",
});

describe("groupToolsByCategory", () => {
  it("카탈로그 분류 순서대로 묶고 빈 분류는 뺀다", () => {
    const groups = groupToolsByCategory([
      tool("dashboard_overview", "stats"),
      tool("whoami", "account"),
      tool("activity_list", "activities"),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "내 계정",
      "활동",
      "통계·기록",
    ]);
    expect(groups[0]?.tools.map((item) => item.name)).toEqual(["whoami"]);
  });
});
```

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/mcp/mcp-tool-groups.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 2: 묶기 함수를 만든다**

`apps/web/features/mcp/mcp-tool-groups.ts`:

```ts
import {
  MCP_TOOL_CATEGORIES,
  MCP_TOOL_CATEGORY_LABELS,
  type ApiMcpToolSummary,
  type McpToolCategory,
} from "@yonyoung/contracts/mcp";

export type McpToolGroup = {
  category: McpToolCategory;
  label: string;
  tools: ApiMcpToolSummary[];
};

export const groupToolsByCategory = (
  tools: ApiMcpToolSummary[],
): McpToolGroup[] =>
  MCP_TOOL_CATEGORIES.map((category) => ({
    category,
    label: MCP_TOOL_CATEGORY_LABELS[category],
    tools: tools.filter((tool) => tool.category === category),
  })).filter((group) => group.tools.length > 0);
```

Run: 위 테스트
Expected: PASS

- [ ] **Step 3: 동의 화면을 만든다**

`apps/web/app/(dashboard)/auth/mcp-consent/page.tsx`:

```tsx
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import McpConsentClient from "@/app/(dashboard)/auth/mcp-consent/consent-client";

export const metadata = {
  title: "AI 앱 연결 허용 | 연영회",
};

export default async function McpConsentPage() {
  // Better Auth는 로그인된 사용자만 이 화면으로 보낸다. 세션이 없으면 로그인부터 한다.
  await serverAuthGuard.requireSession();
  return <McpConsentClient />;
}
```

`apps/web/app/(dashboard)/auth/mcp-consent/consent-client.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  CORE_ROLE_LABELS,
  normalizeLegacyRole,
} from "@yonyoung/contracts/auth-roles";
import {
  apiMcpConsentContextSchema,
  type ApiMcpConsentContext,
} from "@yonyoung/contracts/mcp";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "@/app/(dashboard)/_components/ui";
import { authClient } from "@/features/auth/client/auth-client";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; context: ApiMcpConsentContext };

const readConsentContext = async (): Promise<LoadState> => {
  const response = await fetch(
    `/api/mcp/consent-context${window.location.search}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      "연결 요청을 확인하지 못했습니다.";
    return { status: "error", message };
  }
  const parsed = apiMcpConsentContextSchema.safeParse(
    (body as { data?: unknown } | null)?.data,
  );
  return parsed.success
    ? { status: "ready", context: parsed.data }
    : { status: "error", message: "연결 요청 정보를 읽지 못했습니다." };
};

export default function McpConsentClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [submitting, setSubmitting] = useState<"accept" | "deny" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void readConsentContext().then(setState);
  }, []);

  const submit = async (accept: boolean) => {
    setSubmitting(accept ? "accept" : "deny");
    setSubmitError(null);
    const result = await authClient.oauth2.consent({ accept });
    const url = (result.data as { url?: string } | null)?.url;
    if (url) {
      window.location.assign(url);
      return;
    }
    setSubmitting(null);
    setSubmitError(
      result.error?.message ?? "처리하지 못했습니다. 다시 시도해 주세요.",
    );
  };

  if (state.status === "loading") {
    return (
      <p className="p-6 text-body-sm text-ink-muted">
        연결 요청을 확인하고 있습니다…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert tone="danger" title="연결할 수 없습니다">
          {state.message}
        </Alert>
      </div>
    );
  }

  const { client, overview } = state.context;
  const role = normalizeLegacyRole(overview.role);
  const clientName = client.name ?? client.clientId;
  const isPending = role === "unverified";

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-title font-semibold text-ink">{clientName} 연결</h1>
      <p className="text-body-sm text-ink-muted">
        {clientName}이(가) {CORE_ROLE_LABELS[role]} 권한으로 연영 대시보드에
        접근하려고 합니다. 허용하면 대화 중에 아래 작업을 할 수 있습니다. 연결은
        대시보드의 &lsquo;AI 연결&rsquo;에서 언제든 해제할 수 있습니다.
      </p>

      {isPending ? (
        <Alert tone="warning" title="관리자 승인 대기 중">
          가입 승인이 끝나면 연결할 수 있습니다. 운영진에게 승인을 요청해
          주세요.
        </Alert>
      ) : (
        <Card>
          <CardHeader
            title={`쓸 수 있는 작업 ${overview.tools.length}개`}
            headingLevel={2}
          />
          <CardBody>
            <ul className="flex flex-col gap-3">
              {groupToolsByCategory(overview.tools).map((group) => (
                <li key={group.category}>
                  <p className="text-caption font-semibold text-ink">
                    {group.label}
                  </p>
                  <p className="text-caption text-ink-muted">
                    {group.tools.map((tool) => tool.title).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={isPending || submitting !== null}
          onClick={() => void submit(true)}
        >
          {submitting === "accept" ? "연결하는 중…" : "허용"}
        </Button>
        <Button
          variant="secondary"
          disabled={submitting !== null}
          onClick={() => void submit(false)}
        >
          거절
        </Button>
      </div>
    </main>
  );
}
```

`text-title`, `text-body-sm`, `text-caption`, `text-ink`, `text-ink-muted`는 기존 대시보드가 쓰는 토큰이다. 렌더링에서 클래스가 적용되지 않으면 `app/(dashboard)/dashboard/settings/page.tsx`가 쓰는 클래스와 맞춘다.

- [ ] **Step 4: 확인한다**

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint && pnpm --filter @yonyoung/web exec vitest run tests/unit/features/mcp`
Expected: 오류 없음, PASS

화면 확인은 Task 17의 E2E에서 한다.

- [ ] **Step 5: 커밋**

```bash
git add apps/web
git commit -m "feat(web): add consent screen for AI app connections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 17: 설치 안내 페이지 `/dashboard/mcp`와 연결 해제

**Files:**

- Modify: `apps/web/features/dashboard/services/admin-read-service.ts` (`getMcpOverview`, `getMcpConnections`, `getMcpUploadLookup`)
- Create: `apps/web/features/dashboard/actions/mcp.ts` (`revokeMcpConnectionAction`)
- Create: `apps/web/app/(dashboard)/dashboard/mcp/page.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/mcp/mcp-guide-sections.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/mcp/copy-url-button.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/mcp/connections-client.tsx`
- Modify: `apps/web/app/(dashboard)/_components/shell/dashboard-navigation.ts`
- Modify: `apps/web/tests/unit/app-shared/dashboard-navigation.test.ts`
- Create: `apps/web/tests/e2e/mock-api/mcp-handlers.ts`
- Modify: `apps/web/tests/e2e/mock-api/server.ts`
- Create: `apps/web/tests/e2e/mcp.spec.ts`

**Interfaces:**

- Consumes: `GET /api/mcp/tools`, `GET /api/mcp/connections`, `DELETE /api/mcp/connections/:clientId`, `GET /api/mcp/uploads/lookup` (Task 11, 14), `groupToolsByCategory` (Task 16)
- Produces:
  - `getMcpOverview(cookieHeader): Promise<AdminReadResult<ApiMcpOverview>>`
  - `getMcpConnections(cookieHeader): Promise<AdminReadResult<ApiMcpConnection[]>>`
  - `getMcpUploadLookup(cookieHeader, token): Promise<AdminReadResult<ApiMcpUploadLookup>>`
  - `revokeMcpConnectionAction(clientId: string): Promise<AdminWriteActionResult<undefined>>`
  - 내비게이션 항목 `{ key: "mcp", href: "/dashboard/mcp", label: "AI 연결" }`

- [ ] **Step 1: 내비게이션 테스트를 먼저 고친다**

`tests/unit/app-shared/dashboard-navigation.test.ts`의 "기수가 아닌 경로에서는 null 을 돌려준다" 목록에 `"/dashboard/mcp"`와 `"/dashboard/mcp/upload/abc"`를 추가한다. 그리고 다음 테스트를 추가한다.

```ts
describe("AI 연결 메뉴", () => {
  it("기수 밖과 기수 안 모두에 AI 연결 메뉴가 있다", () => {
    const outside = buildNavigationItems({
      pathname: "/dashboard/mcp",
      generationOptions: GENERATIONS,
      selectedGeneration: null,
      selectedGenerationScopedPath: null,
    });
    expect(outside.find((item) => item.key === "mcp")).toMatchObject({
      href: "/dashboard/mcp",
      label: "AI 연결",
      active: true,
    });

    const inside = buildNavigationItems({
      pathname: "/dashboard/25기",
      generationOptions: GENERATIONS,
      selectedGeneration: GENERATIONS[0]!,
      selectedGenerationScopedPath: "/",
    });
    expect(inside.some((item) => item.key === "mcp")).toBe(true);
  });

  it("모바일 상단 이름은 AI 연결이다", () => {
    expect(
      resolveActivePageName({
        pathname: "/dashboard/mcp",
        selectedGeneration: null,
        selectedGenerationScopedPath: null,
      }),
    ).toBe("AI 연결");
  });
});
```

기존 테스트 중 메뉴 항목 배열 전체를 비교하는 것이 있으면, 기대값의 `stats` 항목 바로 앞에 `mcp` 항목을 넣는다.

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/app-shared/dashboard-navigation.test.ts`
Expected: FAIL

- [ ] **Step 2: 내비게이션을 고친다**

`dashboard-navigation.ts`:

1. lucide import에 `Bot`을 추가한다.
2. 기수 경로가 아닌 이름 목록을 상수로 뽑아 두 함수가 함께 쓴다.

```ts
/** `/dashboard/<이름>` 중 기수가 아닌 고정 경로. */
const NON_GENERATION_ROUTE_NAMES = new Set(["settings", "profile", "mcp"]);
```

`resolveActiveGenerationFromPath`의 `if (!routeName || routeName === "settings" || routeName === "profile")`와 `resolveSelectedGenerationScopedPath`의 같은 조건을 `if (!routeName || NON_GENERATION_ROUTE_NAMES.has(routeName))`로 바꾼다.

3. `buildNavigationItems`에 항목을 추가한다. `statsItem` 선언 바로 위에 둔다.

```ts
const mcpItem: NavigationItem = {
  key: "mcp",
  href: "/dashboard/mcp",
  label: "AI 연결",
  Icon: Bot,
  active:
    pathname === "/dashboard/mcp" || pathname.startsWith("/dashboard/mcp/"),
};
```

두 반환 배열 모두에서 `statsItem,` 앞에 `mcpItem,`을 넣는다.

4. `resolveActivePageName`에서 `/dashboard/settings` 분기 다음에 추가한다.

```ts
if (pathname.startsWith("/dashboard/mcp")) {
  return "AI 연결";
}
```

Run: 같은 테스트
Expected: PASS

- [ ] **Step 3: 조회 함수와 서버 액션을 만든다**

`admin-read-service.ts`의 `getAdminPageViewStats` 다음에 추가한다.

```ts
import {
  apiMcpConnectionSchema,
  apiMcpOverviewSchema,
  apiMcpUploadLookupSchema,
  type ApiMcpConnection,
  type ApiMcpOverview,
  type ApiMcpUploadLookup,
} from "@yonyoung/contracts/mcp";

export const getMcpOverview = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiMcpOverview>> =>
  readAdminResource("/mcp/tools", cookieHeader, apiMcpOverviewSchema);

export const getMcpConnections = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiMcpConnection[]>> =>
  readAdminResource(
    "/mcp/connections",
    cookieHeader,
    z.array(apiMcpConnectionSchema),
  );

export const getMcpUploadLookup = (
  cookieHeader: string | null,
  token: string,
): Promise<AdminReadResult<ApiMcpUploadLookup>> =>
  readAdminResource(
    `/mcp/uploads/lookup?token=${encodeURIComponent(token)}`,
    cookieHeader,
    apiMcpUploadLookupSchema,
  );
```

(`z`가 import되어 있지 않으면 `import { z } from "zod";`를 추가한다.)

`apps/web/features/dashboard/actions/mcp.ts`:

```ts
"use server";

import type { AdminWriteActionResult } from "@/features/dashboard/api/admin-api/action-results";
import {
  readNoContentSchema,
  writeRequest,
} from "@/features/dashboard/actions/admin-write-core";

export const revokeMcpConnectionAction = async (
  clientId: string,
): Promise<AdminWriteActionResult<undefined>> =>
  writeRequest({
    path: `/mcp/connections/${encodeURIComponent(clientId)}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    tags: [],
    accessScope: "verified_member",
  });
```

`AdminWriteActionResult`의 실제 export 위치는 `linktree.ts`의 import를 따른다.

- [ ] **Step 4: 페이지와 구성 요소를 만든다**

`apps/web/app/(dashboard)/dashboard/mcp/copy-url-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/(dashboard)/_components/ui";

export default function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-md border border-hairline bg-surface-sunken px-3 py-2 text-body-sm text-ink">
        {url}
      </code>
      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "복사했습니다" : "주소 복사"}
      </Button>
    </div>
  );
}
```

`apps/web/app/(dashboard)/dashboard/mcp/connections-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ApiMcpConnection } from "@yonyoung/contracts/mcp";
import {
  Button,
  EmptyState,
  useConfirm,
  useToast,
} from "@/app/(dashboard)/_components/ui";
import { revokeMcpConnectionAction } from "@/features/dashboard/actions/mcp";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );

export default function McpConnectionsClient({
  initialConnections,
}: {
  initialConnections: ApiMcpConnection[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const confirm = useConfirm();
  const toast = useToast();

  if (connections.length === 0) {
    return (
      <EmptyState
        title="연결된 앱이 없습니다"
        description="Claude나 ChatGPT에서 연결하면 여기에 표시됩니다."
      />
    );
  }

  const revoke = async (connection: ApiMcpConnection) => {
    const name = connection.clientName ?? connection.clientId;
    const confirmed = await confirm({
      title: `${name} 연결을 해제할까요?`,
      description:
        "해제하면 그 앱에서 연영 도구를 바로 쓸 수 없습니다. 다시 쓰려면 다시 연결해야 합니다.",
      confirmLabel: "연결 해제",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }
    const result = await revokeMcpConnectionAction(connection.clientId);
    if (!result.ok) {
      toast({
        tone: "danger",
        title: "연결을 해제하지 못했습니다",
        description: result.errorMessage,
      });
      return;
    }
    setConnections((current) =>
      current.filter((item) => item.clientId !== connection.clientId),
    );
    toast({ tone: "success", title: `${name} 연결을 해제했습니다` });
  };

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {connections.map((connection) => (
        <li
          key={connection.clientId}
          className="flex items-center justify-between gap-3 py-3"
        >
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink">
              {connection.clientName ?? connection.clientId}
            </span>
            <span className="block text-caption text-ink-muted">
              연결 {formatDate(connection.connectedAt)} · 최근 갱신{" "}
              {formatDate(connection.updatedAt)}
            </span>
          </span>
          <Button
            variant="danger-ghost"
            onClick={() => void revoke(connection)}
          >
            연결 해제
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

`EmptyState`의 props가 `title`/`description`과 다르면 `empty-state.tsx`의 시그니처에 맞춘다.

`apps/web/app/(dashboard)/dashboard/mcp/mcp-guide-sections.tsx`:

```tsx
import type { ApiMcpOverview } from "@yonyoung/contracts/mcp";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
} from "@/app/(dashboard)/_components/ui";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";
import CopyUrlButton from "@/app/(dashboard)/dashboard/mcp/copy-url-button";

/** 외부 제품 화면 이름은 바뀔 수 있다. 바꿀 때 공식 도움말을 다시 확인하고 날짜를 고친다. */
export const GUIDE_VERIFIED_ON = "2026-10-08";

const API_HOST_FOR_SANDBOX = "api.yonyoung.moveto.kr";

const Steps = ({ steps }: { steps: string[] }) => (
  <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-sm text-ink">
    {steps.map((step) => (
      <li key={step}>{step}</li>
    ))}
  </ol>
);

export const ConnectorUrlSection = ({ serverUrl }: { serverUrl: string }) => (
  <Card>
    <CardHeader
      title="커넥터 주소"
      description="Claude나 ChatGPT에 이 주소를 붙여 넣으면 연결됩니다. 로그인은 연영 계정(Google)으로 합니다."
    />
    <CardBody>
      <CopyUrlButton url={serverUrl} />
    </CardBody>
  </Card>
);

export const ClaudeSection = ({ serverUrl }: { serverUrl: string }) => (
  <Card>
    <CardHeader
      title="Claude에 연결하기"
      description="claude.ai, Claude 데스크톱 앱, 모바일 앱에서 같은 연결을 씁니다."
    />
    <CardBody>
      <Steps
        steps={[
          "claude.ai(또는 데스크톱 앱)에서 설정 → 커넥터로 갑니다.",
          "'사용자 지정 커넥터 추가'를 누르고 이름에 '연영', 주소에 위 커넥터 주소를 넣습니다.",
          "추가된 '연영'의 '연결'을 누르면 연영 로그인 화면이 열립니다. Google로 로그인합니다.",
          "연결 허용 화면에서 내 역할과 쓸 수 있는 작업을 확인하고 '허용'을 누릅니다.",
          "대화 입력창의 도구 메뉴에서 '연영'이 켜져 있는지 확인합니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        Team·Enterprise 요금제는 조직 관리자가 먼저 커넥터를 추가해야 할 수
        있습니다. 요금제에 따라 사용자 지정 커넥터를 추가할 수 없으면 Claude
        도움말의 &lsquo;커넥터&rsquo; 항목을 확인해 주세요. 주소: {serverUrl}
      </p>
    </CardBody>
  </Card>
);

export const ClaudeFileSection = () => (
  <Card>
    <CardHeader
      title="Claude에서 파일 올리기 설정"
      description="채팅에 첨부한 사진·문서를 그대로 연영에 올리려면 Claude가 파일을 보낼 수 있어야 합니다."
    />
    <CardBody>
      <Steps
        steps={[
          "설정 → 기능(Capabilities)에서 '코드 실행 및 파일 생성'을 켭니다.",
          `같은 화면의 네트워크 접근 설정에서 허용 도메인에 ${API_HOST_FOR_SANDBOX}를 추가합니다.`,
          "이제 '이 사진들을 25기 봄 출사에 올려줘'처럼 요청하면 Claude가 직접 올립니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        이 설정을 못 하는 경우(조직 정책 등) Claude가 10분짜리 업로드 링크를
        줍니다. 링크를 열어 같은 파일을 끌어다 놓으면 됩니다. MCP로는 파일당
        100MB까지 올릴 수 있습니다.
      </p>
    </CardBody>
  </Card>
);

export const ChatGptSection = () => (
  <Card>
    <CardHeader
      title="ChatGPT에 연결하기"
      description="ChatGPT 웹에서 앱(커넥터)으로 추가합니다."
    />
    <CardBody>
      <Steps
        steps={[
          "ChatGPT 설정 → 앱(Apps & Connectors) → 고급 설정에서 개발자 모드를 켭니다.",
          "'만들기'를 누르고 이름에 '연영', MCP 서버 URL에 위 커넥터 주소, 인증에 OAuth를 고릅니다.",
          "연영 로그인 화면에서 Google로 로그인하고 '허용'을 누릅니다.",
          "새 대화에서 + 메뉴의 개발자 모드 도구 중 '연영'을 고릅니다.",
        ]}
      />
      <p className="mt-3 text-caption text-ink-muted">
        ChatGPT에서는 채팅에 올린 파일이 자동으로 연영 도구에 전달되므로 따로
        설정할 것이 없습니다. 개발자 모드를 쓸 수 있는 요금제는 OpenAI
        도움말에서 확인해 주세요.
      </p>
    </CardBody>
  </Card>
);

export const ToolListSection = ({ overview }: { overview: ApiMcpOverview }) => (
  <Card>
    <CardHeader
      title={`내 역할로 쓸 수 있는 작업 ${overview.tools.length}개`}
      description="역할이 바뀌면 다음 대화부터 목록이 바뀝니다. 오른쪽 문장처럼 말하면 됩니다."
    />
    <CardBody>
      <div className="flex flex-col gap-5">
        {groupToolsByCategory(overview.tools).map((group) => (
          <section
            key={group.category}
            aria-labelledby={`mcp-group-${group.category}`}
          >
            <h3
              id={`mcp-group-${group.category}`}
              className="text-body-sm font-semibold text-ink"
            >
              {group.label}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {group.tools.map((tool) => (
                <li
                  key={tool.name}
                  className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3"
                >
                  <span className="flex items-center gap-2 text-body-sm text-ink md:w-56">
                    {tool.title}
                    {tool.destructive ? (
                      <Badge tone="danger">확인 후 실행</Badge>
                    ) : null}
                  </span>
                  <span className="text-caption text-ink-muted">
                    &ldquo;{tool.examplePrompt}&rdquo;
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </CardBody>
  </Card>
);

export const TroubleshootingSection = () => (
  <Card>
    <CardHeader title="문제 해결" />
    <CardBody>
      <dl className="flex flex-col gap-3 text-body-sm">
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;관리자 승인 후 사용할 수 있습니다&rsquo;가 나와요
          </dt>
          <dd className="text-ink-muted">
            가입 승인이 끝나야 연결할 수 있습니다. 운영진에게 승인을 요청해
            주세요.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;현재 역할로는 할 수 없는 작업&rsquo;이라고 해요
          </dt>
          <dd className="text-ink-muted">
            대시보드에서도 할 수 없는 작업입니다. 위 목록에서 내 역할로 가능한
            작업을 확인해 주세요.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">파일 올리기가 실패해요</dt>
          <dd className="text-ink-muted">
            Claude는 위 &lsquo;파일 올리기 설정&rsquo;을 확인하고, 안 되면
            Claude가 준 업로드 링크로 올려 주세요. 100MB가 넘는 파일은
            대시보드에서 올려야 합니다.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">
            &lsquo;연결이 만료되었습니다&rsquo;가 나와요
          </dt>
          <dd className="text-ink-muted">
            30일 동안 쓰지 않았거나 연결을 해제한 경우입니다. Claude·ChatGPT의
            커넥터 설정에서 다시 연결해 주세요.
          </dd>
        </div>
      </dl>
    </CardBody>
  </Card>
);
```

`apps/web/app/(dashboard)/dashboard/mcp/page.tsx`:

```tsx
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  PageContainer,
  PageHeader,
} from "@/app/(dashboard)/_components/ui";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  getMcpConnections,
  getMcpOverview,
} from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import McpConnectionsClient from "@/app/(dashboard)/dashboard/mcp/connections-client";
import {
  ChatGptSection,
  ClaudeFileSection,
  ClaudeSection,
  ConnectorUrlSection,
  GUIDE_VERIFIED_ON,
  ToolListSection,
  TroubleshootingSection,
} from "@/app/(dashboard)/dashboard/mcp/mcp-guide-sections";

export const metadata = {
  title: "AI 연결 | 연영회 관리자",
};

export default async function McpGuidePage() {
  await serverAuthGuard.requireSession();
  const cookieHeader = await readCookieHeader();
  const [overview, connections] = await Promise.all([
    getMcpOverview(cookieHeader),
    getMcpConnections(cookieHeader),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="AI 연결"
        title="Claude·ChatGPT에서 대시보드 쓰기"
        description="연영 MCP를 연결하면 대화로 활동을 만들고, 채팅에 올린 사진을 올리고, 멤버를 관리할 수 있습니다. 할 수 있는 일은 내 역할을 따릅니다."
      />

      {overview.ok ? (
        <>
          <ConnectorUrlSection serverUrl={overview.data.serverUrl} />
          <ClaudeSection serverUrl={overview.data.serverUrl} />
          <ClaudeFileSection />
          <ChatGptSection />
          <ToolListSection overview={overview.data} />
        </>
      ) : (
        <Alert tone="danger" title="연결 정보를 불러오지 못했습니다">
          {overview.error.message}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="연결된 앱"
          description="휴대폰을 잃어버렸거나 더 쓰지 않는 연결은 여기서 바로 끊을 수 있습니다."
        />
        <CardBody>
          {connections.ok ? (
            <McpConnectionsClient initialConnections={connections.data} />
          ) : (
            <Alert tone="danger">{connections.error.message}</Alert>
          )}
        </CardBody>
      </Card>

      <TroubleshootingSection />
      <p className="text-caption text-ink-muted">
        안내 내용 확인일: {GUIDE_VERIFIED_ON}
      </p>
    </PageContainer>
  );
}
```

`PageContainer`가 자식 간격을 주지 않으면 섹션들을 `<div className="flex flex-col gap-4">`로 감싼다(`settings/page.tsx` 참고).

- [ ] **Step 5: E2E 모의 API와 시나리오를 추가한다**

`apps/web/tests/e2e/mock-api/mcp-handlers.ts`:

```ts
import type { ServerResponse } from "node:http";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import type { MockRole } from "./contracts";

type McpHandlerContext = {
  pathname: string;
  method: string;
  response: ServerResponse;
  role: MockRole;
  namespace: string;
  sendData: <T>(response: ServerResponse, data: T, status?: number) => void;
  sendError: (
    response: ServerResponse,
    status: number,
    code: "NOT_FOUND",
    message: string,
  ) => void;
};

const MOCK_ROLE_TO_CORE: Record<Exclude<MockRole, "guest">, string> = {
  unverified: "unverified",
  member: "regular_member",
  manager: "manager",
  vice_president: "vice_president",
  president: "president",
};

// 모의 서버는 권한 매트릭스를 다시 구현하지 않는다. 부원은 읽기 도구, 그 위는 전체로 근사한다.
const toolsFor = (role: MockRole) =>
  MCP_TOOL_CATALOG.filter((tool) =>
    role === "unverified" ? false : role === "member" ? tool.readOnly : true,
  ).map(
    ({
      name,
      title,
      description,
      category,
      readOnly,
      destructive,
      examplePrompt,
    }) => ({
      name,
      title,
      description,
      category,
      readOnly,
      destructive,
      examplePrompt,
    }),
  );

const connectionsByNamespace = new Map<string, Set<string>>();

const connectionsOf = (namespace: string) => {
  let set = connectionsByNamespace.get(namespace);
  if (!set) {
    set = new Set(["claude-client"]);
    connectionsByNamespace.set(namespace, set);
  }
  return set;
};

export const handleMcpRoutes = (ctx: McpHandlerContext): boolean => {
  const { pathname, method, response, role, namespace, sendData, sendError } =
    ctx;
  if (!pathname.startsWith("/api/mcp/") || role === "guest") {
    return false;
  }
  const overview = {
    serverUrl: "https://api.yonyoung.example/mcp",
    role: MOCK_ROLE_TO_CORE[role],
    tools: toolsFor(role),
  };

  if (pathname === "/api/mcp/tools" && method === "GET") {
    sendData(response, overview);
    return true;
  }
  if (pathname === "/api/mcp/connections" && method === "GET") {
    sendData(
      response,
      [...connectionsOf(namespace)].map((clientId) => ({
        clientId,
        clientName: "Claude",
        clientUri: "https://claude.ai",
        scopes: ["openid", "mcp"],
        connectedAt: "2030-01-01T00:00:00.000Z",
        updatedAt: "2030-01-02T00:00:00.000Z",
      })),
    );
    return true;
  }
  if (pathname.startsWith("/api/mcp/connections/") && method === "DELETE") {
    const clientId = decodeURIComponent(pathname.split("/").pop() ?? "");
    if (!connectionsOf(namespace).delete(clientId)) {
      sendError(response, 404, "NOT_FOUND", "연결을 찾을 수 없습니다.");
      return true;
    }
    response.statusCode = 204;
    response.end();
    return true;
  }
  if (pathname === "/api/mcp/consent-context" && method === "GET") {
    sendData(response, {
      client: {
        clientId: "claude-client",
        name: "Claude",
        uri: "https://claude.ai",
      },
      scopes: ["openid", "mcp"],
      overview,
    });
    return true;
  }
  return false;
};
```

`server.ts`의 `requireAuthenticatedUser` 호출 다음(사용자 라우트 앞)에 연결한다. `namespace`는 기존 코드가 `mock_worker` 쿠키에서 읽는 값을 쓴다(`readRole` 근처 함수와 같은 방식).

```ts
if (
  handleMcpRoutes({
    pathname,
    method,
    response,
    role,
    namespace,
    sendData,
    sendError,
  })
) {
  return;
}
```

`apps/web/tests/e2e/mcp.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { setMockSession } from "./support/session";

test.describe("AI 연결", () => {
  test("부원은 안내 페이지에서 읽기 작업과 연결을 본다", async ({
    context,
    page,
  }) => {
    await setMockSession(context, { role: "member", namespace: "mcp-member" });
    await page.goto("/dashboard/mcp");

    await expect(
      page.getByRole("heading", { name: "Claude·ChatGPT에서 대시보드 쓰기" }),
    ).toBeVisible();
    await expect(
      page.getByText("https://api.yonyoung.example/mcp"),
    ).toBeVisible();
    await expect(page.getByText("활동 목록")).toBeVisible();
    await expect(page.getByText("활동 삭제")).toHaveCount(0);
    await expect(page.getByText("Claude", { exact: true })).toBeVisible();
  });

  test("연결 해제를 확인하면 목록에서 사라진다", async ({ context, page }) => {
    await setMockSession(context, { role: "manager", namespace: "mcp-revoke" });
    await page.goto("/dashboard/mcp");

    await page.getByRole("button", { name: "연결 해제" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "연결 해제" })
      .click();
    await expect(page.getByText("연결된 앱이 없습니다")).toBeVisible();
  });

  test("동의 화면은 앱 이름과 역할을 보여준다", async ({ context, page }) => {
    await setMockSession(context, {
      role: "manager",
      namespace: "mcp-consent",
    });
    await page.goto(
      "/auth/mcp-consent?client_id=claude-client&scope=openid+mcp&exp=1&sig=abc",
    );

    await expect(
      page.getByRole("heading", { name: "Claude 연결" }),
    ).toBeVisible();
    await expect(page.getByText("부장 권한으로")).toBeVisible();
    await expect(page.getByRole("button", { name: "허용" })).toBeEnabled();
  });

  test("승인 대기 사용자는 허용할 수 없다", async ({ context, page }) => {
    await setMockSession(context, {
      role: "unverified",
      namespace: "mcp-pending",
    });
    await page.goto(
      "/auth/mcp-consent?client_id=claude-client&scope=openid+mcp&exp=1&sig=abc",
    );

    await expect(page.getByText("관리자 승인 대기 중")).toBeVisible();
    await expect(page.getByRole("button", { name: "허용" })).toBeDisabled();
  });

  test("휴대폰 너비에서 가로 스크롤이 없다", async ({ context, page }) => {
    await setMockSession(context, { role: "member", namespace: "mcp-mobile" });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/dashboard/mcp");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

`unverified` 사용자는 `/auth/mcp-consent`에서 `requireSession`만 거치므로 화면에 들어온다. 대시보드 승인 대기 리다이렉트는 `/dashboard/*`에만 걸린다. 들어오지 못하면 `proxy.ts`·auth guard의 경로 규칙을 확인한다.

Run: `pnpm --filter @yonyoung/web exec ./scripts/run-playwright.sh test tests/e2e/mcp.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: 확인하고 커밋한다**

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint && pnpm --filter @yonyoung/web test:unit`
Expected: 오류 없음, PASS

```bash
git add apps/web
git commit -m "feat(web): add AI connection guide with role-based tool list and revoke

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

### Task 18: 브라우저 업로드 페이지 `/dashboard/mcp/upload/[token]`

**Files:**

- Create: `apps/web/app/(dashboard)/dashboard/mcp/upload/[token]/page.tsx`
- Create: `apps/web/app/(dashboard)/dashboard/mcp/upload/[token]/upload-client.tsx`
- Create: `apps/web/features/mcp/upload-check.ts`
- Test: `apps/web/tests/unit/features/mcp/upload-check.test.ts`
- Modify: `apps/web/tests/e2e/mock-api/mcp-handlers.ts`, `apps/web/tests/e2e/mcp.spec.ts`

**Interfaces:**

- Consumes: `getMcpUploadLookup` (Task 17), `PUT /mcp/uploads/:token` (Task 11, API 도메인 직접 호출, CORS)
- Produces: `checkSelectedFile(file: { size: number; type: string }, expected: { declaredSize: number; contentType: string }): string | null` (문제가 있으면 안내 문구)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/web/tests/unit/features/mcp/upload-check.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkSelectedFile } from "@/features/mcp/upload-check";

const expected = { declaredSize: 1000, contentType: "image/jpeg" };

describe("checkSelectedFile", () => {
  it("크기와 형식이 맞으면 null이다", () => {
    expect(
      checkSelectedFile({ size: 1000, type: "image/jpeg" }, expected),
    ).toBeNull();
    expect(
      checkSelectedFile({ size: 1000, type: "image/jpg" }, expected),
    ).toBeNull();
  });

  it("크기가 다르면 같은 파일을 고르라고 안내한다", () => {
    expect(
      checkSelectedFile({ size: 999, type: "image/jpeg" }, expected),
    ).toContain("같은 파일");
  });

  it("형식이 다르면 안내한다", () => {
    expect(
      checkSelectedFile({ size: 1000, type: "image/png" }, expected),
    ).toContain("형식");
  });
});
```

Run: `pnpm --filter @yonyoung/web exec vitest run tests/unit/features/mcp/upload-check.test.ts`
Expected: FAIL

- [ ] **Step 2: 검사 함수를 만든다**

`apps/web/features/mcp/upload-check.ts`:

```ts
import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";

/**
 * 서버는 준비할 때 알려준 크기·형식과 정확히 같은 파일만 받는다.
 * 올리기 전에 같은 조건을 확인해 실패하는 업로드를 줄인다.
 */
export const checkSelectedFile = (
  file: { size: number; type: string },
  expected: { declaredSize: number; contentType: string },
): string | null => {
  if (file.size !== expected.declaredSize) {
    return `AI에게 보낸 파일과 크기가 다릅니다(${expected.declaredSize.toLocaleString("ko-KR")} bytes). 대화에 첨부한 것과 같은 파일을 골라 주세요.`;
  }
  if (normalizeUploadContentType(file.type) !== expected.contentType) {
    return `파일 형식이 다릅니다. ${expected.contentType} 파일을 골라 주세요.`;
  }
  return null;
};
```

Run: 위 테스트
Expected: PASS

- [ ] **Step 3: 페이지를 만든다**

`apps/web/app/(dashboard)/dashboard/mcp/upload/[token]/page.tsx`:

```tsx
import {
  Alert,
  PageContainer,
  PageHeader,
} from "@/app/(dashboard)/_components/ui";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getMcpUploadLookup } from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import McpUploadClient from "@/app/(dashboard)/dashboard/mcp/upload/[token]/upload-client";

export const metadata = {
  title: "파일 올리기 | 연영회 관리자",
};

const STATUS_MESSAGE: Record<string, string> = {
  receiving: "이미 올리는 중입니다. 잠시 뒤 대화로 돌아가 확인해 주세요.",
  completed: "이미 올라간 파일입니다. 대화로 돌아가 '올렸어'라고 알려 주세요.",
  consumed: "이미 사용한 업로드입니다.",
  failed: "이 업로드는 실패했습니다. AI에게 다시 준비해 달라고 요청해 주세요.",
};

export default async function McpUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await serverAuthGuard.requireSession();
  const { token } = await params;
  const lookup = await getMcpUploadLookup(await readCookieHeader(), token);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="AI 연결"
        title="파일 올리기"
        description="AI가 직접 올리지 못한 파일을 여기서 올립니다. 대화에 첨부한 것과 같은 파일을 골라 주세요."
      />
      {!lookup.ok ? (
        <Alert tone="danger" title="업로드 주소를 쓸 수 없습니다">
          주소가 잘못되었거나, 다른 계정이 만든 주소입니다. 이 주소를 만든
          계정으로 로그인했는지 확인해 주세요.
        </Alert>
      ) : lookup.data.status !== "pending" ? (
        <Alert tone="info">{STATUS_MESSAGE[lookup.data.status]}</Alert>
      ) : new Date(lookup.data.expiresAt).getTime() <= Date.now() ? (
        <Alert tone="warning" title="업로드 주소가 만료되었습니다">
          10분이 지났습니다. AI에게 업로드를 다시 준비해 달라고 요청해 주세요.
        </Alert>
      ) : (
        <McpUploadClient lookup={lookup.data} />
      )}
    </PageContainer>
  );
}
```

`apps/web/app/(dashboard)/dashboard/mcp/upload/[token]/upload-client.tsx`:

```tsx
"use client";

import { useRef, useState, type DragEvent } from "react";
import type { ApiMcpUploadLookup } from "@yonyoung/contracts/mcp";
import {
  Alert,
  Button,
  Card,
  CardBody,
} from "@/app/(dashboard)/_components/ui";
import { checkSelectedFile } from "@/features/mcp/upload-check";

type UploadState =
  | { status: "idle"; error: string | null }
  | { status: "uploading"; percent: number }
  | { status: "done" };

/** API 도메인으로 직접 PUT한다. 진행률을 보이려고 XMLHttpRequest를 쓴다. */
const putFile = (
  url: string,
  file: File,
  onProgress: (percent: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader(
      "content-type",
      file.type || "application/octet-stream",
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status === 200) {
        resolve();
        return;
      }
      const message = (() => {
        try {
          return (
            JSON.parse(request.responseText) as { error?: { message?: string } }
          ).error?.message;
        } catch {
          return undefined;
        }
      })();
      reject(
        new Error(message ?? `업로드하지 못했습니다(HTTP ${request.status}).`),
      );
    };
    request.onerror = () =>
      reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    request.send(file);
  });

export default function McpUploadClient({
  lookup,
}: {
  lookup: ApiMcpUploadLookup;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    status: "idle",
    error: null,
  });
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File) => {
    const problem = checkSelectedFile(file, lookup);
    if (problem) {
      setState({ status: "idle", error: problem });
      return;
    }
    setState({ status: "uploading", percent: 0 });
    try {
      await putFile(lookup.putUrl, file, (percent) =>
        setState({ status: "uploading", percent }),
      );
      setState({ status: "done" });
    } catch (error) {
      setState({
        status: "idle",
        error:
          error instanceof Error ? error.message : "업로드하지 못했습니다.",
      });
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void upload(file);
    }
  };

  if (state.status === "done") {
    return (
      <Alert tone="success" title="올렸습니다">
        대화로 돌아가 &lsquo;올렸어&rsquo;라고 알려 주세요. AI가 확인한 뒤
        이어서 작업합니다.
      </Alert>
    );
  }

  return (
    <Card>
      <CardBody>
        <p className="text-body-sm text-ink">
          올릴 파일: <strong>{lookup.fileName}</strong> (
          {lookup.declaredSize.toLocaleString("ko-KR")} bytes)
        </p>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-4 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center ${
            dragging
              ? "border-(--focus-ring) bg-surface-sunken"
              : "border-hairline"
          }`}
        >
          <p className="text-body-sm text-ink-muted">
            파일을 여기로 끌어다 놓거나
          </p>
          <Button
            variant="primary"
            disabled={state.status === "uploading"}
            onClick={() => inputRef.current?.click()}
          >
            {state.status === "uploading"
              ? `올리는 중… ${state.percent}%`
              : "파일 고르기"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={lookup.contentType}
            className="sr-only"
            aria-label="올릴 파일"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
            }}
          />
        </div>
        {state.status === "idle" && state.error ? (
          <Alert tone="danger" className="mt-4">
            {state.error}
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: E2E를 추가한다**

`mcp-handlers.ts`의 `handleMcpRoutes`에 lookup을 추가한다.

```ts
if (pathname === "/api/mcp/uploads/lookup" && method === "GET") {
  if (ctx.token !== "valid-token") {
    sendError(response, 404, "NOT_FOUND", "업로드 주소를 찾을 수 없습니다.");
    return true;
  }
  sendData(response, {
    uploadId: "upload-1",
    fileName: "봄출사.jpg",
    contentType: "image/jpeg",
    declaredSize: 4,
    purpose: "activity_image",
    status: "pending",
    expiresAt: "2099-01-01T00:00:00.000Z",
    putUrl: "https://api.yonyoung.example/mcp/uploads/valid-token",
  });
  return true;
}
```

`McpHandlerContext`에 `token: string | null`을 추가하고, `server.ts`에서 `token: requestUrl.searchParams.get("token")`을 넘긴다.

`mcp.spec.ts`에 추가한다.

```ts
test("업로드 페이지에서 같은 파일을 올리면 완료된다", async ({
  context,
  page,
}) => {
  await setMockSession(context, { role: "manager", namespace: "mcp-upload" });
  await page.route(
    "https://api.yonyoung.example/mcp/uploads/valid-token",
    async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          data: { uploadId: "upload-1", status: "completed" },
        }),
      });
    },
  );
  await page.goto("/dashboard/mcp/upload/valid-token");

  await page.getByLabel("올릴 파일").setInputFiles({
    name: "봄출사.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByText("올렸습니다")).toBeVisible();
});

test("다른 크기의 파일은 올리기 전에 막는다", async ({ context, page }) => {
  await setMockSession(context, {
    role: "manager",
    namespace: "mcp-upload-mismatch",
  });
  await page.goto("/dashboard/mcp/upload/valid-token");
  await page.getByLabel("올릴 파일").setInputFiles({
    name: "다른사진.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xd9]),
  });
  await expect(page.getByText("같은 파일을 골라 주세요")).toBeVisible();
});

test("다른 계정의 업로드 주소는 쓸 수 없다고 알려준다", async ({
  context,
  page,
}) => {
  await setMockSession(context, {
    role: "manager",
    namespace: "mcp-upload-stranger",
  });
  await page.goto("/dashboard/mcp/upload/unknown-token");
  await expect(page.getByText("업로드 주소를 쓸 수 없습니다")).toBeVisible();
});
```

Run: `pnpm --filter @yonyoung/web exec ./scripts/run-playwright.sh test tests/e2e/mcp.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: 확인하고 커밋한다**

Run: `pnpm --filter @yonyoung/web typecheck && pnpm --filter @yonyoung/web lint && pnpm --filter @yonyoung/web test:unit`
Expected: 오류 없음, PASS

```bash
git add apps/web
git commit -m "feat(web): add browser fallback page for MCP uploads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```

---

## 6단계: 마무리

### Task 19: 문서, 전체 품질 검사, 실제 연결 확인

**Files:**

- Modify: `apps/api/docs/permissions.md`
- Modify: `docs/deployment-and-cutover.md`

- [ ] **Step 1: 권한 문서를 실제 라우트에 맞춘다**

`apps/api/docs/permissions.md`에서 다음을 고친다.

- "감사 로그" 절: "사실상 unverified를 제외한 전원이 조회 가능"을 "부장 이상(`isManagerLikeRole`)만 조회 가능"으로 바꾼다.
- "대시보드 통계" 절: "`user.read` 기준 — unverified를 제외한 전원 조회 가능"을 "부장 이상(`isManagerLikeRole`)만 조회 가능"으로 바꾼다.
- "멤버" 절: 목록 조회에 "부장은 같은 기수 멤버만"을 추가하고, `GET /users/{id}/resource-history`는 회장단 전용이라고 적는다.

문서 끝에 절을 추가한다.

```markdown
## MCP — `/mcp`

- 인증: OAuth 2.1 액세스 토큰(JWT, `aud`=`MCP_RESOURCE_URL`, scope `mcp`) + `(사용자, 클라이언트)` 동의가 살아 있어야 한다.
- `unverified`는 403. 역할은 매 요청 D1에서 다시 읽는다.
- 도구 노출은 `@yonyoung/contracts/mcp` 카탈로그의 노출 조건을 따르며, 실행은 위 라우트를 그대로 호출하므로 이 문서의 모든 규칙이 그대로 적용된다.
- `src/tests/mcp-exposure.test.ts`가 노출 조건과 라우트 가드의 일치를 역할별로 검증한다. 라우트 가드를 바꾸면 이 테스트가 카탈로그 수정이 필요한지 알려 준다.
- 업로드: `upload_prepare`는 위 presign 표와 같은 권한을 쓴다. 파일당 100MB, 토큰 10분·1회.
```

- [ ] **Step 2: 배포 문서에 MCP 항목을 추가한다**

`docs/deployment-and-cutover.md`에 절을 추가한다.

```markdown
## MCP 배포 체크리스트

1. API 원격 마이그레이션: `pnpm db:migrate:remote` (`0012_dashboard_mcp.sql`). API 배포보다 먼저 한다.
2. `apps/api/wrangler.jsonc` vars 확인: `MCP_RESOURCE_URL=https://api.yonyoung.moveto.kr/mcp`, `MCP_AUTH_ISSUER=https://yonyoung.yonsei.ac.kr/api/auth`. 선택: `MCP_CHATGPT_FILE_HOST_SUFFIXES`.
3. API 배포: `pnpm deploy:api`. 배포 전 `pnpm deploy:dry-run`으로 번들 크기를 확인한다(Workers 한도 이내).
4. 웹 배포: `/.well-known/oauth-authorization-server/api/auth`가 200과 `issuer: https://yonyoung.yonsei.ac.kr/api/auth`를 돌려주는지 확인한다.
5. 스모크:
   - `curl -i https://api.yonyoung.moveto.kr/.well-known/oauth-protected-resource/mcp` → 200, `authorization_servers`가 issuer와 같다.
   - `curl -i -X POST https://api.yonyoung.moveto.kr/mcp` → 401, `WWW-Authenticate`에 `resource_metadata` 포함.
6. 되돌리기: API를 이전 버전으로 롤백해도 새 테이블은 남아도 무해하다. 웹 롤백 시 `/dashboard/mcp` 메뉴만 사라진다.
```

- [ ] **Step 3: 전체 품질 검사를 돌린다**

Run: `pnpm quality`
Expected: format, lint, typecheck, unit, workers, coverage, build 전부 통과

커버리지 임계값에 걸리면 부족한 파일의 테스트를 보강한다. `src/features/mcp/**`는 제외 목록에 넣지 않는다.

Run: `pnpm --filter @yonyoung/web test:e2e:full`
Expected: 기존 E2E와 `mcp.spec.ts` 모두 통과

Run: `pnpm deploy:dry-run`
Expected: API 번들 생성 성공. 출력의 번들 크기를 기록한다.

- [ ] **Step 4: 실제 클라이언트로 확인한다(배포 후, 사람이 함께)**

dev 또는 프로덕션 배포 뒤 부원 계정과 회장 계정으로 각각 확인한다. 결과를 PR 설명에 표로 남긴다.

| 확인                                                     | Claude | ChatGPT   |
| -------------------------------------------------------- | ------ | --------- |
| 커넥터 추가 → Google 로그인 → 동의 → 연결                |        |           |
| `whoami`가 역할과 도구 수를 맞게 알려줌                  |        |           |
| 부원: 삭제 도구가 보이지 않음                            |        |           |
| 회장: 채팅에 첨부한 사진 2장을 활동에 추가               |        |           |
| 회장: 삭제 전에 클라이언트가 확인을 요청함               |        |           |
| `/dashboard/mcp`에서 연결 해제 → 다음 호출이 401         |        |           |
| Claude: 샌드박스 네트워크 미허용 시 browser_url로 업로드 |        | 해당 없음 |

ChatGPT 확인 중 `download_url`의 호스트를 기록한다. 기본값 `.oaiusercontent.com`과 다르면 `MCP_CHATGPT_FILE_HOST_SUFFIXES`를 wrangler vars에 넣고 다시 배포한다. 안내 페이지의 메뉴 이름이 실제 화면과 다르면 `mcp-guide-sections.tsx` 문구와 `GUIDE_VERIFIED_ON`을 고친다.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/docs/permissions.md docs/deployment-and-cutover.md
git commit -m "docs: document MCP permissions and deployment steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gib4gkkdNF976x7dxghyKE"
```
