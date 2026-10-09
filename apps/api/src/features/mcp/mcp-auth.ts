import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import type { Context } from "hono";
import type { JWTPayload } from "jose";
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

type ProtectedHandler = (request: Request) => Promise<Response>;

// 원격 JWKS 캐시를 요청 사이에 재사용하려면 보호 핸들러를 설정별로 한 번만 만든다.
// 요청마다 다른 후속 처리는 Request 객체를 키로 넘긴다.
const protectedHandlers = new Map<string, ProtectedHandler>();
const continuations = new WeakMap<
  Request,
  (identity: McpTokenIdentity) => Promise<Response>
>();

const getProtectedHandler = (env: McpRuntimeEnv): ProtectedHandler => {
  const key = `${env.issuer}|${env.resourceUrl}|${env.jwksUrl}`;
  const existing = protectedHandlers.get(key);
  if (existing) {
    return existing;
  }

  const handler = createMcpProtectedRequestHandler(
    {
      issuer: env.issuer,
      audience: env.resourceUrl,
      jwksUrl: env.jwksUrl,
      requiredScopes: MCP_REQUIRED_SCOPES,
    },
    async (request, claims) => {
      const identity = toMcpTokenIdentity(claims);
      if (!identity) {
        return mcpUnauthorizedResponse(
          env,
          "사용자 계정으로 발급된 토큰이 아닙니다.",
        );
      }
      const next = continuations.get(request);
      if (!next) {
        throw new Error("MCP 인증 후속 처리가 등록되지 않았습니다.");
      }
      return next(identity);
    },
  );
  protectedHandlers.set(key, handler);
  return handler;
};

export const createBetterAuthMcpAuthenticator =
  (): McpRequestAuthenticator => async (c, onAuthenticated) => {
    const request = c.req.raw;
    continuations.set(request, onAuthenticated);
    return getProtectedHandler(resolveMcpRuntimeEnv(c.env))(request);
  };
