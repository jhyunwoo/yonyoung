import { createAuthClient } from "better-auth/react";
import { resolveBaseUrl } from "@/shared/http/http";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const DEFAULT_PRODUCTION_AUTH_API_URL = "https://api.yonyoung.moveto.kr";

const resolveAuthBaseUrl = (): string => {
  if (process.env.NODE_ENV !== "production") {
    return resolveBaseUrl(
      [process.env.NEXT_PUBLIC_AUTH_API_URL],
      DEFAULT_AUTH_API_URL,
    );
  }

  return resolveBaseUrl(
    [process.env.NEXT_PUBLIC_AUTH_API_URL],
    DEFAULT_PRODUCTION_AUTH_API_URL,
  );
};

const authBaseUrl = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  basePath: "/api/auth",
});
