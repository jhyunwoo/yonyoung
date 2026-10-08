import type { OpenAPIHono } from "@hono/zod-openapi";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { Context } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Bindings } from "../../bindings/types";
import { getAuthCorsOrigins } from "../../lib/auth";
import type { Actor } from "../../lib/authorization/types";
import { resolveMcpRuntimeEnv } from "../../lib/config/runtime-env";
import type { AppDependencies } from "../../lib/services/dependencies";
import { requireAuthenticatedActor } from "../../shared/http/route-guards";
import type HonoAppType from "../../types/honoAppType";
import {
  McpUploadError,
  createRequestMcpUploadService,
} from "./files/mcp-upload-service";
import { resolveChatGptFileHostSuffixes } from "./files/chatgpt-file";
import { createMcpFileResolver } from "./files/file-ref";
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
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32003, message }, id: null }),
    { status: 403, headers: { "content-type": "application/json" } },
  );

const readExecutionContext = (c: Context<HonoAppType>): ExecutionContext | undefined => {
  try {
    return c.executionCtx as ExecutionContext;
  } catch {
    return undefined;
  }
};

const createMcpToolContext = (
  c: Context<HonoAppType>,
  input: { actor: Actor; dispatch: InternalDispatch; dependencies: AppDependencies },
): McpToolContext => {
  const uploads = createRequestMcpUploadService(c, input.dependencies);
  return {
    actor: input.actor,
    api: createInternalApiClient({
      dispatch: input.dispatch,
      env: c.env,
      executionCtx: readExecutionContext(c),
      actor: input.actor,
      origin: new URL(c.req.url).origin,
      requestId: c.get("requestId") ?? crypto.randomUUID(),
    }),
    uploads,
    files: createMcpFileResolver({
      actor: input.actor,
      uploads,
      fetch: input.dependencies.fetchChatGptFile,
      hostSuffixes: resolveChatGptFileHostSuffixes(c.env),
    }),
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
        return mcpUnauthorizedResponse(mcpEnv, "연결이 해제되었습니다. 커넥터를 다시 연결해 주세요.");
      }

      const actor = await dependencies.loadActorByUserId(c, identity.userId);
      if (!actor) {
        return mcpUnauthorizedResponse(mcpEnv, "계정을 찾을 수 없습니다. 다시 연결해 주세요.");
      }
      if (actor.role === "unverified") {
        return mcpForbiddenResponse("관리자 승인 후 사용할 수 있습니다.");
      }

      const context = createMcpToolContext(c, { actor, dispatch, dependencies });
      const handler = createMcpHandler(() => buildMcpServer(context, MCP_TOOL_DEFINITIONS));
      return handler.fetch(c.req.raw);
    }),
  );

  app.on(["GET", "DELETE"], "/mcp", (c) => c.body(null, 405, { Allow: "POST" }));

  const uploadErrorResponse = (c: Context<HonoAppType>, error: McpUploadError) =>
    c.json(
      { error: { code: "UPLOAD_ERROR", message: error.message, requestId: c.get("requestId") } },
      error.status as ContentfulStatusCode,
    );

  // 브라우저 업로드 페이지(웹 오리진)가 이 주소로 직접 PUT한다. 자격 증명은 URL의 일회용 토큰이다.
  app.use(
    "/mcp/uploads/*",
    cors({
      origin: (origin, c: Context<HonoAppType>) =>
        getAuthCorsOrigins(c.env).includes(origin) ? origin : null,
      allowMethods: ["PUT", "OPTIONS"],
      allowHeaders: ["content-type"],
      maxAge: 600,
    }),
  );

  app.put("/mcp/uploads/:token", async (c) => {
    const lengthHeader = c.req.header("content-length");
    const contentLength =
      lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
    try {
      const record = await createRequestMcpUploadService(c, dependencies).receive(
        c.req.param("token"),
        { contentLength, body: c.req.raw.body },
      );
      return c.json({
        data: {
          uploadId: record.id,
          status: record.status,
          fileName: record.fileName,
          size: record.declaredSize,
        },
      });
    } catch (error) {
      if (error instanceof McpUploadError) {
        return uploadErrorResponse(c, error);
      }
      throw error;
    }
  });

  app.get("/api/mcp/uploads/lookup", async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);
    const token = c.req.query("token") ?? "";
    const service = createRequestMcpUploadService(c, dependencies);
    try {
      const record = await service.lookupByToken(actor, token);
      return c.json({
        data: {
          uploadId: record.id,
          fileName: record.fileName,
          contentType: record.contentType,
          declaredSize: record.declaredSize,
          purpose: record.purpose,
          status: record.status,
          expiresAt: new Date(record.expiresAt).toISOString(),
          putUrl: service.putUrlFor(token),
        },
      });
    } catch (error) {
      if (error instanceof McpUploadError) {
        return uploadErrorResponse(c, error);
      }
      throw error;
    }
  });
};
