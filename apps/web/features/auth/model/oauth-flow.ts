type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Better Auth OAuth 제공자가 로그인 페이지로 보낼 때 붙이는 서명된 쿼리인지 본다.
 * 이 쿼리가 있으면 로그인 뒤 인가 흐름을 이어가야 하므로 대시보드로 보내지 않는다.
 */
export const isOAuthAuthorizationRequest = (searchParams: SearchParams): boolean =>
  typeof searchParams.client_id === "string" && typeof searchParams.sig === "string";
