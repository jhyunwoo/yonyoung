import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const authBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_AUTH_API_URL ?? DEFAULT_AUTH_API_URL,
);

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  basePath: "/api/auth",
  plugins: [passkeyClient()],
});
