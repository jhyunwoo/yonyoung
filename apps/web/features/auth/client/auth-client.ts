import { createAuthClient } from "better-auth/react";
import { resolveApiBaseUrl } from "@/shared/http/http";

export const authClient = createAuthClient({
  baseURL: resolveApiBaseUrl({ clientSide: true }),
  basePath: "/api/auth",
});
