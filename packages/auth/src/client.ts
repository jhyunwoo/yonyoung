import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

function toAuthBaseUrl(base: string) {
  return `${base.replace(/\/$/, "")}/api/auth`;
}

function resolveBaseURL() {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string") {
    return toAuthBaseUrl(window.location.origin);
  }

  return toAuthBaseUrl(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
  plugins: [passkeyClient()]
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
