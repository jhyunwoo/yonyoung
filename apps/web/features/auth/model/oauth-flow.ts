import { DASHBOARD_PATH } from "@/features/auth/model/auth-shared";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Better Auth OAuth 제공자가 로그인 페이지로 보낼 때 붙이는 서명된 쿼리인지 본다.
 * 이 쿼리가 있으면 로그인 뒤 인가 흐름을 이어가야 하므로 대시보드로 보내지 않는다.
 */
export const isOAuthAuthorizationRequest = (searchParams: SearchParams): boolean =>
  typeof searchParams.client_id === "string" && typeof searchParams.sig === "string";

const RETURN_PATH_PARSE_BASE = "https://return-path.invalid";

/**
 * proxy.ts가 로그인 페이지에 붙인 `next`에서 로그인 뒤 돌아갈 대시보드 경로를 고른다.
 * 외부 주소나 대시보드 밖 경로는 열린 리디렉트가 되므로 버린다.
 */
export const resolveSignInReturnPath = (value: unknown): string | null => {
  if (typeof value !== "string" || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value, RETURN_PATH_PARSE_BASE);
  } catch {
    return null;
  }

  const isDashboardPath =
    url.pathname === DASHBOARD_PATH || url.pathname.startsWith(`${DASHBOARD_PATH}/`);
  if (
    !value.startsWith("/") ||
    url.origin !== RETURN_PATH_PARSE_BASE ||
    !isDashboardPath
  ) {
    return null;
  }

  return url.pathname + url.search;
};
