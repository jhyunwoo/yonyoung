import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

const baseURL =
  typeof window === "undefined"
    ? `${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth`
    : "/api/auth";

export const authClient = createAuthClient({
  baseURL,
  plugins: [passkeyClient()]
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
