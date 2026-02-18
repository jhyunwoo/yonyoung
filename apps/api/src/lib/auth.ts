import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import * as schema from "./db/schema";
import createDB from "./db";

type AuthEnv = {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  googleClientId: string;
  googleClientSecret: string;
  passkeyRpId: string;
  passkeyRpName: string;
  passkeyOrigin: string;
  emailAndPasswordEnabled: boolean;
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

const LOCAL_HOSTNAME = "localhost";

const isIpHostname = (hostname: string): boolean => {
  return (
    /^[0-9.]+$/.test(hostname) ||
    hostname.includes(":")
  );
};

export const resolveCrossSubDomainCookieDomain = (
  baseURL: string,
): string | undefined => {
  try {
    const hostname = new URL(baseURL).hostname.toLowerCase();
    if (hostname === LOCAL_HOSTNAME || isIpHostname(hostname)) {
      return undefined;
    }

    const labels = hostname.split(".").filter(Boolean);
    if (labels.length < 3) {
      return undefined;
    }

    return labels.slice(1).join(".");
  } catch {
    return undefined;
  }
};

/**
 * parseCsv 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseCsv = (value: string): string[] => {
  return [
    ...new Set(
      value
        .split(",")
        .map(/** value
        .split(",")
        .map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param entry 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
};

/**
 * parseBooleanEnv 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @param fallback 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

/**
 * getEnv 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param name 함수 로직에서 사용하는 입력값입니다.
 * @param fallback 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const getEnv = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

/**
 * resolveAuthEnv 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param allowDevDefaults 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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
    // E2E/CI에서만 email+password 로그인을 열기 위한 토글.
    emailAndPasswordEnabled: parseBooleanEnv(
      process.env.BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED,
      false,
    ),
  };
};

/**
 * createAuthWithEnv 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param database 처리 대상 데이터입니다.
 * @param env 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createAuthWithEnv = (database: D1Database, env: AuthEnv) => {
  const db = createDB(database);
  const crossSubDomainCookieDomain = resolveCrossSubDomainCookieDomain(
    env.baseURL,
  );

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
    emailAndPassword: {
      enabled: env.emailAndPasswordEnabled,
    },
    user: {
      additionalFields: {
        nickname: {
          type: "string",
          required: false,
        },
        familyName: {
          type: "string",
          required: false,
        },
        givenName: {
          type: "string",
          required: false,
        },
        college: {
          type: "string",
          required: false,
        },
        department: {
          type: "string",
          required: false,
        },
        studentNumber: {
          type: "string",
          required: false,
        },
        phoneNumber: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "unverified",
        },
        generationId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      passkey({
        rpID: env.passkeyRpId,
        rpName: env.passkeyRpName,
        origin: env.passkeyOrigin,
      }),
      openAPI({
        disableDefaultReference: true,
      }),
    ],
    advanced: {
      crossSubDomainCookies: {
        enabled: !!crossSubDomainCookieDomain,
        ...(crossSubDomainCookieDomain
          ? { domain: crossSubDomainCookieDomain }
          : {}),
      },
      useSecureCookies: env.baseURL.startsWith("https://"),
    },
  });
};

/**
 * getAuthCorsOrigins 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getAuthCorsOrigins = (): string[] => {
  return resolveAuthEnv(true).trustedOrigins;
};

const authCache = new WeakMap<D1Database, ReturnType<typeof betterAuth>>();

/**
 * createAuth 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param database 처리 대상 데이터입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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
