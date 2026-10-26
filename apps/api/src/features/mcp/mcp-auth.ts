import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import {
  createInMemoryDpopReplayStore,
  createInsufficientScopeError,
  enforceDpopBinding,
  isDpopBindingError,
  parseAccessTokenAuthorization,
  verifyJwsAccessToken,
} from "better-auth/oauth2";
import type { Context } from "hono";
import { errors, type JSONWebKeySet, type JWTPayload } from "jose";
import {
  resolveMcpRuntimeEnv,
  type McpRuntimeEnv,
} from "../../lib/config/runtime-env";
import type HonoAppType from "../../types/honoAppType";

export type McpTokenIdentity = {
  userId: string;
  clientId: string;
  scopes: string[];
};

export type McpRequestAuthenticator = (
  c: Context<HonoAppType>,
  onAuthenticated: (identity: McpTokenIdentity) => Promise<Response>,
) => Promise<Response>;

const MCP_REQUIRED_SCOPES = ["mcp"] as const;

export const toMcpTokenIdentity = (
  claims: JWTPayload,
): McpTokenIdentity | null => {
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const clientClaim = claims.azp ?? claims.client_id;
  const clientId = typeof clientClaim === "string" ? clientClaim : null;
  // client_credentials 토큰은 sub가 클라이언트 ID다. 사용자 없는 토큰은 받지 않는다.
  if (!userId || !clientId || userId === clientId) {
    return null;
  }
  const scopes =
    typeof claims.scope === "string"
      ? claims.scope.split(" ").filter(Boolean)
      : [];
  return { userId, clientId, scopes };
};

/** 헤더 값은 ASCII여야 하므로 사람이 읽을 한국어 설명은 JSON-RPC 본문에만 넣는다. */
export const mcpUnauthorizedResponse = (
  env: McpRuntimeEnv,
  message: string,
): Response =>
  new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer error="invalid_token", resource_metadata="${env.resourceMetadataUrl}"`,
      },
    },
  );

/** 서명 키는 이 Worker의 D1에 있으므로 HTTP 없이 Better Auth에서 바로 읽는다. */
export type McpJwksLoader = (c: Context<HonoAppType>) => Promise<JSONWebKeySet>;

// 아래 검증은 @better-auth/mcp의 createMcpProtectedRequestHandler와 같은 순서·응답을 따른다.
// 그 핸들러는 JWKS를 URL로만 받는데, issuer(웹 도메인) URL은 Next를 거쳐 이 Worker로
// 되돌아와 웹 오리진이 느리면 JWKSTimeout으로 MCP가 500이 됐다(YONYOUNG-WEB-9, -D).
// Worker는 자기 Custom Domain을 fetch할 수 없어 API 오리진 URL도 못 쓴다(1d22aa7).

// 토큰이 아니라 키 조회가 실패한 것이므로 401로 바꾸지 않고 그대로 던진다.
const JWKS_INFRASTRUCTURE_ERROR_CODES = new Set([
  errors.JWKSTimeout.code,
  errors.JWKSInvalid.code,
  errors.JWKSMultipleMatchingKeys.code,
]);

// Better Auth는 같은 객체를 키로 받을 때만 키 세트를 5분 동안 캐시한다.
const jwksCacheKeys = new Map<string, object>();
const getJwksCacheKey = (issuer: string): object => {
  let key = jwksCacheKeys.get(issuer);
  if (!key) {
    key = {};
    jwksCacheKeys.set(issuer, key);
  }
  return key;
};

// 라이브러리 핸들러의 기본값과 같은 isolate 단위 DPoP 재사용 방지 저장소.
const dpopReplayStore = createInMemoryDpopReplayStore();

const invalidToken = (message: string) =>
  new APIError("UNAUTHORIZED", {
    message,
    error: "invalid_token",
    error_description: message,
  });

const verifyMcpAccessToken = async (
  request: Request,
  env: McpRuntimeEnv,
  loadJwks: () => Promise<JSONWebKeySet>,
): Promise<JWTPayload> => {
  const authorization = parseAccessTokenAuthorization(
    request.headers.get("authorization"),
  );
  if (!authorization?.token) {
    throw new APIError("UNAUTHORIZED", {
      message: "missing authorization header",
    });
  }
  if (authorization.scheme === "Unknown") {
    throw invalidToken("authorization scheme must be Bearer or DPoP");
  }

  let payload: JWTPayload;
  try {
    payload = await verifyJwsAccessToken(authorization.token, {
      jwksFetch: loadJwks,
      jwksCacheKey: getJwksCacheKey(env.issuer),
      verifyOptions: { issuer: env.issuer, audience: env.resourceUrl },
    });
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new APIError("UNAUTHORIZED", { message: "token expired" });
    }
    if (
      error instanceof errors.JOSEError &&
      !JWKS_INFRASTRUCTURE_ERROR_CODES.has(error.code)
    ) {
      throw new APIError("UNAUTHORIZED", { message: "invalid access token" });
    }
    // jose는 헤더를 해석할 수 없는 토큰에 TypeError를 던진다.
    if (error instanceof TypeError) {
      throw new APIError("UNAUTHORIZED", { message: "no token payload" });
    }
    throw error;
  }

  const scopes =
    typeof payload.scope === "string" ? payload.scope.split(" ") : [];
  const missingScopes = MCP_REQUIRED_SCOPES.filter(
    (scope) => !scopes.includes(scope),
  );
  if (missingScopes.length > 0) {
    throw createInsufficientScopeError(missingScopes);
  }

  try {
    await enforceDpopBinding({
      payload,
      authorization,
      proofJwt: request.headers.get("dpop"),
      method: request.method,
      url: request.url,
      replayStore: dpopReplayStore,
    });
  } catch (error) {
    if (isDpopBindingError(error)) {
      throw new APIError("UNAUTHORIZED", {
        message: error.message,
        error: error.code,
        error_description: error.message,
      });
    }
    throw error;
  }
  return payload;
};

type ResourceServerChallenge = NonNullable<
  ReturnType<typeof createResourceServerChallenge>
>;

const challengeResponse = (challenge: ResourceServerChallenge): Response => {
  const headers = new Headers(challenge.headers);
  headers.set("content-type", "application/json");
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: challenge.message },
      id: null,
    }),
    { status: challenge.statusCode, headers },
  );
};

export const createBetterAuthMcpAuthenticator =
  (loadJwks: McpJwksLoader): McpRequestAuthenticator =>
  async (c, onAuthenticated) => {
    const env = resolveMcpRuntimeEnv(c.env);
    let claims: JWTPayload;
    try {
      claims = await verifyMcpAccessToken(c.req.raw, env, () => loadJwks(c));
    } catch (error) {
      const challenge = createResourceServerChallenge(error, env.resourceUrl, {
        challengeScopes: MCP_REQUIRED_SCOPES,
      });
      if (!challenge) {
        throw error;
      }
      return challengeResponse(challenge);
    }
    const identity = toMcpTokenIdentity(claims);
    if (!identity) {
      return mcpUnauthorizedResponse(
        env,
        "사용자 계정으로 발급된 토큰이 아닙니다.",
      );
    }
    return onAuthenticated(identity);
  };
