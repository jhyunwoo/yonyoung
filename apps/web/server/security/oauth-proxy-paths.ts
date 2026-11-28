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

/**
 * 클라이언트 자격 증명을 `Authorization` 헤더로 받는 OAuth 엔드포인트.
 * 메타데이터가 `client_secret_basic`을 광고하므로 이 경로들은 헤더를 API까지 전달해야 한다.
 * 기본 프록시 허용 목록에는 넣지 않는다 — 일반 API 경로는 쿠키 세션만 쓴다.
 * 등록(`oauth2/register`)은 제외한다: 헤더가 초기 액세스 토큰 경로를 켠다.
 */
const CLIENT_CREDENTIAL_OAUTH_PATHS = new Set([
  "oauth2/token",
  "oauth2/revoke",
  "oauth2/introspect",
]);

export const acceptsOAuthClientCredentials = (path: string): boolean =>
  CLIENT_CREDENTIAL_OAUTH_PATHS.has(path);
