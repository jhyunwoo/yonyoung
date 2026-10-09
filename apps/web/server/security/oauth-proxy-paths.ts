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
