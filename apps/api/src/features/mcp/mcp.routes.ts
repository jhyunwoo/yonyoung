import type { OpenAPIHono } from "@hono/zod-openapi";
import { resolveMcpRuntimeEnv } from "../../lib/config/runtime-env";
import type { AppDependencies } from "../../lib/services/dependencies";
import type HonoAppType from "../../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

const PROTECTED_RESOURCE_METADATA_PATHS = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

export const registerMcpRoutes = (app: App, _dependencies: AppDependencies) => {
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
};
