import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const DEFAULT_PRODUCTION_AUTH_API_URL = "https://api.moveto.workers.dev";

/**
 * normalizeBaseUrl의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const resolveAuthBaseUrl = (): string => {
  const configuredAuthApiUrl = process.env.NEXT_PUBLIC_AUTH_API_URL?.trim();
  if (configuredAuthApiUrl) {
    return normalizeBaseUrl(configuredAuthApiUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_AUTH_API_URL;
  }

  return DEFAULT_PRODUCTION_AUTH_API_URL;
};

const authBaseUrl = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  basePath: "/api/auth",
  plugins: [passkeyClient()],
});
