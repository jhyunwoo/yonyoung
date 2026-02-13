import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TRUSTED_ORIGINS?: string;
}

function parseTrustedOrigins(raw?: string) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function createAuth(env: AuthEnv): ReturnType<typeof betterAuth> {
  return betterAuth({
    appName: "연영회",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://")
    },
    trustedOrigins: parseTrustedOrigins(env.TRUSTED_ORIGINS),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? ""
      }
    },
    plugins: [passkey()]
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
