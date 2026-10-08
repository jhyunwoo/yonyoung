import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";
import { resolveApiBaseUrl } from "@/shared/http/http";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  isStateChangingMethod,
} from "@/shared/security/csrf";

export const authClient = createAuthClient({
  baseURL: resolveApiBaseUrl({ clientSide: true }),
  basePath: "/api/auth",
  // OAuth 인가 중 로그인·동의 요청에 서명된 oauth_query를 자동으로 붙인다.
  plugins: [oauthProviderClient()],
  fetchOptions: {
    onRequest(context) {
      if (!isStateChangingMethod(context.method)) {
        return context;
      }

      context.headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);
      return context;
    },
  },
});
