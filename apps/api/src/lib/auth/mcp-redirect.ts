/**
 * MCP 클라이언트 등록(DCR)은 로그인 없이 누구나 할 수 있고 앱 이름도 등록한 쪽이 정한다.
 * 돌아갈 주소까지 자유로우면 "Claude"라는 이름으로 공격자 주소를 등록한 뒤, 임원이 공식
 * 도메인의 동의 화면에서 한 번 허용하는 것만으로 그 임원 권한의 토큰을 가져갈 수 있다.
 * 같은 주소가 인가 오류의 리다이렉트 대상이기도 해서 오픈 리다이렉트로도 쓰인다.
 *
 * 그래서 인가 요청의 redirect_uri를 실제로 지원하는 클라이언트의 콜백 호스트로 제한한다.
 * 루프백은 코드가 사용자 자신의 기기로만 돌아가므로 허용한다(데스크톱·CLI 클라이언트).
 * 새 클라이언트를 지원하려면 여기에 호스트를 추가한다.
 */
const ALLOWED_REDIRECT_HOSTS = new Set([
  "claude.ai",
  "claude.com",
  "chatgpt.com",
  "chat.openai.com",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const isAllowedMcpRedirectUri = (uri: string): boolean => {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }

  if (url.protocol === "https:") {
    return ALLOWED_REDIRECT_HOSTS.has(url.hostname);
  }

  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
};
