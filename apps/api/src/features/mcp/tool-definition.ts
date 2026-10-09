import type { CallToolResult } from "@modelcontextprotocol/server";
import type { McpToolName } from "@yonyoung/contracts/mcp";
import { z } from "zod";
import type { Actor } from "../../lib/authorization/types";
import type { McpFileResolver } from "./files/file-ref";
import type { McpUploadService } from "./files/mcp-upload-service";
import {
  fillPath,
  type InternalApiClient,
  type InternalApiMethod,
  type InternalApiQuery,
  type InternalApiRequest,
} from "./internal-api";
import { toToolResult } from "./tool-result";

export type McpToolContext = {
  actor: Actor;
  requestId: string;
  /** 도구가 예상하지 못한 오류로 끝났을 때 Sentry와 로그에 남긴다. */
  reportError: (error: unknown, toolName: McpToolName) => void;
  api: InternalApiClient;
  uploads: McpUploadService;
  files: McpFileResolver;
};

export type McpToolDefinition = {
  name: McpToolName;
  inputSchema: z.ZodObject;
  handler: (args: unknown, context: McpToolContext) => Promise<CallToolResult>;
  /** 기존 라우트 하나를 그대로 호출하는 도구. 노출 일치 테스트가 이 요청을 직접 보낸다. */
  route?: {
    buildRequest: (
      args: unknown,
      context: McpToolContext,
    ) => InternalApiRequest;
  };
};

export const uuidArg = (description: string) => z.uuid().describe(description);

export const defineTool = <TSchema extends z.ZodObject>(definition: {
  name: McpToolName;
  inputSchema: TSchema;
  handler: (
    args: z.output<TSchema>,
    context: McpToolContext,
  ) => Promise<CallToolResult>;
}): McpToolDefinition => ({
  name: definition.name,
  inputSchema: definition.inputSchema,
  handler: (args, context) =>
    definition.handler(args as z.output<TSchema>, context),
});

type RouteRequestParts = {
  pathParams?: Record<string, string>;
  query?: InternalApiQuery;
  body?: unknown;
};

const PATH_PARAM_PATTERN = /\{(\w+)\}/g;

/**
 * 도구 입력 규칙(경로 파라미터는 최상위, 본문은 data, 배열 본문은 items)으로
 * 라우트 요청을 만든다. GET은 경로 파라미터를 뺀 나머지를 쿼리로 보낸다.
 */
const buildDefaultRequest = (
  path: string,
  method: InternalApiMethod,
  args: Record<string, unknown>,
): RouteRequestParts => {
  const pathKeys = [...path.matchAll(PATH_PARAM_PATTERN)].map(
    (match) => match[1]!,
  );
  const pathParams = Object.fromEntries(
    pathKeys.map((key) => [key, String(args[key])]),
  );
  if (method === "GET") {
    const query = Object.fromEntries(
      Object.entries(args).filter(([key]) => !pathKeys.includes(key)),
    ) as InternalApiQuery;
    return { pathParams, query };
  }
  const body =
    "data" in args ? args.data : "items" in args ? args.items : undefined;
  return { pathParams, body };
};

export const routeTool = <TSchema extends z.ZodObject>(definition: {
  name: McpToolName;
  method: InternalApiMethod;
  path: string;
  inputSchema: TSchema;
  summary: string;
  toRequest?: (
    args: z.output<TSchema>,
    context: McpToolContext,
  ) => RouteRequestParts;
}): McpToolDefinition => {
  const buildRequest = (
    args: unknown,
    context: McpToolContext,
  ): InternalApiRequest => {
    const parts = definition.toRequest
      ? definition.toRequest(args as z.output<TSchema>, context)
      : buildDefaultRequest(
          definition.path,
          definition.method,
          args as Record<string, unknown>,
        );
    return {
      method: definition.method,
      path: fillPath(definition.path, parts.pathParams ?? {}),
      query: parts.query,
      body: parts.body,
    };
  };

  return {
    name: definition.name,
    inputSchema: definition.inputSchema,
    route: { buildRequest },
    handler: async (args, context) =>
      toToolResult(await context.api.call(buildRequest(args, context)), {
        summary: definition.summary,
        role: context.actor.role,
      }),
  };
};
