import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

type AuthEnv = {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  googleClientId: string;
  googleClientSecret: string;
  passkeyRpId: string;
  passkeyRpName: string;
  passkeyOrigin: string;
};

const AUTH_DEV_DEFAULTS = {
  baseURL: "http://localhost:8787",
  secret: "replace-with-a-long-development-secret-at-least-32-characters",
  trustedOrigins: "http://localhost:3000",
  passkeyRpId: "localhost",
  passkeyRpName: "Yonyoung",
  passkeyOrigin: "http://localhost:8787",
  googleClientId: "replace-with-google-client-id",
  googleClientSecret: "replace-with-google-client-secret",
} as const;

const parseCsv = (value: string): string[] => {
  return [
    ...new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
};

const getEnv = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

const resolveAuthEnv = (allowDevDefaults = false): AuthEnv => {
  const baseURL = getEnv(
    "BETTER_AUTH_URL",
    allowDevDefaults ? AUTH_DEV_DEFAULTS.baseURL : undefined,
  );
  const trustedOriginsRaw = getEnv(
    "BETTER_AUTH_TRUSTED_ORIGINS",
    allowDevDefaults ? AUTH_DEV_DEFAULTS.trustedOrigins : undefined,
  );
  const trustedOrigins = parseCsv(trustedOriginsRaw);
  if (!trustedOrigins.includes(baseURL)) {
    trustedOrigins.push(baseURL);
  }

  return {
    baseURL,
    secret: getEnv(
      "BETTER_AUTH_SECRET",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.secret : undefined,
    ),
    trustedOrigins,
    googleClientId: getEnv(
      "GOOGLE_CLIENT_ID",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.googleClientId : undefined,
    ),
    googleClientSecret: getEnv(
      "GOOGLE_CLIENT_SECRET",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.googleClientSecret : undefined,
    ),
    passkeyRpId: getEnv(
      "PASSKEY_RP_ID",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.passkeyRpId : undefined,
    ),
    passkeyRpName: getEnv(
      "PASSKEY_RP_NAME",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.passkeyRpName : undefined,
    ),
    passkeyOrigin: getEnv(
      "PASSKEY_ORIGIN",
      allowDevDefaults ? AUTH_DEV_DEFAULTS.passkeyOrigin : undefined,
    ),
  };
};

const createAuthWithEnv = (database: D1Database, env: AuthEnv) => {
  const db = drizzle(database, { schema });

  return betterAuth({
    baseURL: env.baseURL,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },
    user: {
      additionalFields: {
        nickname: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "user",
        },
      },
    },
    plugins: [
      passkey({
        rpID: env.passkeyRpId,
        rpName: env.passkeyRpName,
        origin: env.passkeyOrigin,
      }),
    ],
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
      useSecureCookies: env.baseURL.startsWith("https://"),
    },
  });
};

export const getAuthCorsOrigins = (): string[] => {
  return resolveAuthEnv(true).trustedOrigins;
};

const authCache = new WeakMap<D1Database, ReturnType<typeof betterAuth>>();

export const createAuth = (database: D1Database) => {
  const cachedAuth = authCache.get(database);
  if (cachedAuth) {
    return cachedAuth;
  }

  const auth = createAuthWithEnv(database, resolveAuthEnv(false));
  authCache.set(database, auth);

  return auth;
};

// Better Auth CLI needs an exported auth instance for schema generation.
export const auth = createAuthWithEnv({} as D1Database, resolveAuthEnv(true));
