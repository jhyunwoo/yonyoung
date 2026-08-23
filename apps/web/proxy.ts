import { type NextRequest, NextResponse } from "next/server";

/**
 * 대시보드 요청의 추적 헤더 전파 담당.
 *
 * ## 예전 구조와 왜 바꿨는가
 *
 * 예전에는 여기서 `GET /api/auth/get-session` 을 직접 호출해 세션과 역할을
 * 확인했다. 그런데 `apps/api` 는 Cloudflare Worker 로 **별도 오리진**에 떠 있고
 * (`docs/monorepo-architecture.md`), 렌더가 시작되면 대시보드 레이아웃이
 * `serverAuthGuard.requireSession()` 으로 같은 엔드포인트를 다시 부른다.
 * React `cache()` 는 렌더 안에서만 dedupe 하므로 프록시에서 이미 나간 네트워크
 * 요청은 없애지 못한다. 즉 대시보드로 이동할 때마다 **직렬로 두 번**의
 * 대륙 간 왕복이 있었고, 두 번째는 첫 번째가 끝나야 시작됐다.
 *
 * 그래서 인증/인가 판단을 전부 렌더 경계로 모으고, 프록시는 왕복이 없는 일만 한다.
 *
 * ## 보안 경계는 어디인가
 *
 * 프록시는 **인가 경계가 아니다**. 권한 판정은 예전과 동일하게 세 곳이 한다.
 *   1. `app/(dashboard)/dashboard/layout.tsx` — `requireSession()` 후 역할/프로필에
 *      따라 sign-in · 프로필 작성 · 승인 대기로 보낸다.
 *   2. 각 페이지의 `serverAuthGuard.requireAdminPageAccess()` /
 *      `requirePresidentAccess()` / `requireGlobalUserManagementAccess()`.
 *   3. 서버 액션(`features/dashboard/actions/*`)의 `requireAdminAccess()` 와,
 *      최종 판정자인 `apps/api` 의 라우트 정책.
 *
 * 이 중 어느 것도 프록시에 의존하지 않았고 지금도 그렇다. 프록시가 하던 검사는
 * 세 번째 방어선이 아니라 **네 번째 사본**이었다. 클라이언트가 보낸 헤더를 신뢰해
 * 검사를 건너뛰는 경로는 만들지 않는다 — 확인된 세션을 렌더 쪽으로 넘기지도 않는다.
 *
 * ## 세션 쿠키 유무만 보는 이유
 *
 * 프록시에서 네트워크 검사를 그냥 없애 보니 한 가지가 같이 사라졌다. PPR 에서는
 * 대시보드 셸(200)이 먼저 흘러나간 뒤에야 레이아웃의 `redirect()` 가 돌기 때문에,
 * 로그인하지 않은 방문자가 **HTTP 리다이렉트 대신 200 + 스켈레톤 깜빡임**을 보고
 * 클라이언트에서 이동하게 된다. 옛 프록시 검사는 중복이기만 한 게 아니라 이
 * HTTP 시맨틱을 제공하고 있었다.
 *
 * 그래서 왕복은 없애되 게이트는 남긴다. 세션 쿠키가 **아예 없으면** 인증된 요청일
 * 수 없으므로 그 자리에서 sign-in 으로 보낸다(네트워크 0회). 쿠키가 있으면 통과시키고
 * 유효성 판정은 아래 경계들이 한다.
 *
 * 이 게이트는 **인가가 아니다.** 값은 검사하지 않으므로 아무 문자열이나 넣으면
 * 통과한다 — 통과 후 권한 판정이 실제 판정이다. 게이트를 통과했다는 사실을 렌더
 * 쪽으로 넘기지도 않는다(위조 표면을 만들지 않기 위해).
 */
/*
  Better Auth 세션 쿠키 이름은 `better-auth.session_token` 이고, HTTPS 에서는
  `__Secure-` 접두사가 붙는다(apps/api/src/lib/auth.ts 의 `useSecureCookies`).
  접두사·prefix 설정이 바뀌어도 따라가도록 접미사로 판별한다.
*/
const SESSION_COOKIE_SUFFIX = "session_token";

const hasSessionCookie = (request: NextRequest): boolean =>
  request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.endsWith(SESSION_COOKIE_SUFFIX) && cookie.value.trim().length > 0,
    );

const redirectToSignIn = (
  request: NextRequest,
  requestId: string,
  traceId: string,
): NextResponse => {
  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.redirect(signInUrl);
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-trace-id", traceId);
  return response;
};

const ensureCorrelationId = (
  request: NextRequest,
  headerName: "x-request-id" | "x-trace-id",
): string => {
  const incoming = request.headers.get(headerName)?.trim();
  if (incoming) {
    return incoming;
  }

  return crypto.randomUUID();
};

export function proxy(request: NextRequest): NextResponse {
  const requestId = ensureCorrelationId(request, "x-request-id");
  const traceId = ensureCorrelationId(request, "x-trace-id");

  if (!hasSessionCookie(request)) {
    return redirectToSignIn(request, requestId, traceId);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-trace-id", traceId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-trace-id", traceId);

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
