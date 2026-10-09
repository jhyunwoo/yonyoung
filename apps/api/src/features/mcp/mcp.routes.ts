import type { OpenAPIHono } from "@hono/zod-openapi";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { captureException } from "@sentry/cloudflare";
import type { Context } from "hono";
import { logError } from "../../app/middleware/logger";
import type { Bindings } from "../../bindings/types";
import type { Actor } from "../../lib/authorization/types";
import { resolveMcpRuntimeEnv } from "../../lib/config/runtime-env";
import type { AppDependencies } from "../../lib/services/dependencies";
import { AppError } from "../../shared/errors/AppError";
import { requireAuthenticatedActor } from "../../shared/http/route-guards";
import type HonoAppType from "../../types/honoAppType";
import { buildMcpOverview } from "./exposure";
import { createInternalApiClient, type InternalDispatch } from "./internal-api";
import { mcpUnauthorizedResponse } from "./mcp-auth";
import { buildMcpServer } from "./mcp-server";
import type { McpToolContext } from "./tool-definition";
import { MCP_TOOL_DEFINITIONS } from "./tools";

type App = OpenAPIHono<HonoAppType>;

const PROTECTED_RESOURCE_METADATA_PATHS = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

const mcpForbiddenResponse = (message: string): Response =>
  new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32003, message },
      id: null,
    }),
    { status: 403, headers: { "content-type": "application/json" } },
  );

const readExecutionContext = (
  c: Context<HonoAppType>,
): ExecutionContext | undefined => {
  try {
    return c.executionCtx as ExecutionContext;
  } catch {
    return undefined;
  }
};

/** 동의 화면이 실제로 돌아갈 주소를 보여주도록 redirect_uri의 호스트만 꺼낸다. */
const readRedirectHost = (redirectUri: string | null): string | null => {
  if (!redirectUri) {
    return null;
  }
  try {
    return new URL(redirectUri).host || null;
  } catch {
    return null;
  }
};

const createMcpToolContext = (
  c: Context<HonoAppType>,
  input: {
    actor: Actor;
    dispatch: InternalDispatch;
  },
): McpToolContext => {
  const requestId = c.get("requestId") ?? crypto.randomUUID();
  return {
    actor: input.actor,
    requestId,
    reportError: (error, toolName) => {
      captureException(error, {
        tags: { requestId, event: "mcp.tool_failed", tool: toolName },
      });
      logError(c, error, {
        event: "mcp.tool_failed",
        requestId,
        tool: toolName,
      });
    },
    api: createInternalApiClient({
      dispatch: input.dispatch,
      env: c.env,
      executionCtx: readExecutionContext(c),
      actor: input.actor,
      origin: new URL(c.req.url).origin,
      requestId,
    }),
    webOrigin: new URL(resolveMcpRuntimeEnv(c.env).issuer).origin,
  };
};

export const registerMcpRoutes = (app: App, dependencies: AppDependencies) => {
  const dispatch: InternalDispatch = (request, env, executionCtx) =>
    app.fetch(request, env as Bindings, executionCtx);

  // RFC 9728 메타데이터. 공개 엔드포인트라 Better Auth를 만들지 않는다(생성 시 DB 시드가 돈다).
  app.on(["GET", "HEAD"], PROTECTED_RESOURCE_METADATA_PATHS, (c) => {
    const env = resolveMcpRuntimeEnv(c.env);
    return c.json({
      resource: env.resourceUrl,
      authorization_servers: [env.issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
    });
  });

  app.post("/mcp", (c) =>
    dependencies.authenticateMcpRequest(c, async (identity) => {
      const mcpEnv = resolveMcpRuntimeEnv(c.env);
      const connections = dependencies.getMcpConnectionStore(c);
      if (!(await connections.hasConsent(identity.userId, identity.clientId))) {
        return mcpUnauthorizedResponse(
          mcpEnv,
          "연결이 해제되었습니다. 커넥터를 다시 연결해 주세요.",
        );
      }

      const actor = await dependencies.loadActorByUserId(c, identity.userId);
      if (!actor) {
        return mcpUnauthorizedResponse(
          mcpEnv,
          "계정을 찾을 수 없습니다. 다시 연결해 주세요.",
        );
      }
      if (actor.role === "unverified") {
        return mcpForbiddenResponse("관리자 승인 후 사용할 수 있습니다.");
      }

      const context = createMcpToolContext(c, { actor, dispatch });
      const handler = createMcpHandler(() =>
        buildMcpServer(context, MCP_TOOL_DEFINITIONS),
      );
      return handler.fetch(c.req.raw);
    }),
  );

  app.on(["GET", "DELETE"], "/mcp", (c) =>
    c.body(null, 405, { Allow: "POST" }),
  );

  app.get("/api/mcp/tools", async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);
    return c.json({
      data: buildMcpOverview(
        actor.role,
        resolveMcpRuntimeEnv(c.env).resourceUrl,
      ),
    });
  });

  app.get("/api/mcp/connections", async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);
    const connections = await dependencies
      .getMcpConnectionStore(c)
      .list(actor.id);
    return c.json({
      data: connections.map((connection) => ({
        ...connection,
        connectedAt: new Date(connection.connectedAt).toISOString(),
        updatedAt: new Date(connection.updatedAt).toISOString(),
      })),
    });
  });

  app.delete("/api/mcp/connections/:clientId", async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);
    const revoked = await dependencies
      .getMcpConnectionStore(c)
      .revoke(actor.id, c.req.param("clientId"), Date.now());
    if (!revoked) {
      throw AppError.notFound("연결을 찾을 수 없습니다.");
    }
    return c.body(null, 204);
  });

  app.get("/api/mcp/consent-context", async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);
    const query = new URL(c.req.url).search.slice(1);
    if (!(await dependencies.verifyOAuthConsentQuery(c, query))) {
      throw AppError.badRequest(
        "연결 요청이 만료되었거나 올바르지 않습니다. 처음부터 다시 연결해 주세요.",
      );
    }
    const params = new URLSearchParams(query);
    const client = await dependencies
      .getMcpConnectionStore(c)
      .getClient(params.get("client_id") ?? "");
    if (!client) {
      throw AppError.notFound("연결하려는 앱을 찾을 수 없습니다.");
    }
    return c.json({
      data: {
        client,
        redirectHost: readRedirectHost(params.get("redirect_uri")),
        scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
        overview: buildMcpOverview(
          actor.role,
          resolveMcpRuntimeEnv(c.env).resourceUrl,
        ),
      },
    });
  });
};
