import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { internalError } from "../lib/http/response";
import { enrichOpenApiDocument } from "../lib/openapi/enrich";
import { mergeOpenApiDocuments } from "../lib/openapi/merge";
import { errorResponses } from "../lib/openapi/responses";
import { ApiOpenApiDocumentSchema } from "../lib/openapi/schemas";
import { requireActor } from "../lib/http/authz";
import { AppDependencies } from "../lib/services/dependencies";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

export const OPENAPI_BASE_DOCUMENT = {
  openapi: "3.1.1",
  info: {
    title: "Yonyoung API",
    version: "1.0.0",
    description: "Yonyoung 서비스 API 문서",
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey" as const,
        in: "cookie" as const,
        name: "better-auth.session_token",
      },
    },
  },
};

const openApiJsonRoute = createRoute({
  method: "get",
  path: "/api/openapi.json",
  tags: ["Docs"],
  operationId: "getOpenApiDocument",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "통합 OpenAPI 문서 조회 성공",
      content: {
        "application/json": {
          schema: ApiOpenApiDocumentSchema,
        },
      },
    },
    401: errorResponses[401],
    500: errorResponses[500],
  },
});

const docsRoute = createRoute({
  method: "get",
  path: "/api/docs",
  tags: ["Docs"],
  operationId: "getScalarApiReference",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Scalar API Reference 페이지",
      content: {
        "text/html": {
          schema: z.string(),
        },
      },
    },
    401: errorResponses[401],
  },
});

export const registerDocsRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(openApiJsonRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    try {
      const internalDoc = app.getOpenAPI31Document({
        ...OPENAPI_BASE_DOCUMENT,
        servers: [{ url: new URL(c.req.url).origin }],
      });
      const authDoc = await dependencies.getAuthOpenApiSchema(c);
      const merged = mergeOpenApiDocuments(internalDoc, authDoc);
      const enriched = enrichOpenApiDocument(merged);
      return c.json(enriched, 200);
    } catch (error) {
      console.error("openapi merge failed", error);
      return internalError(c, "OpenAPI 문서를 생성하지 못했습니다.");
    }
  });

  const scalarReference = Scalar<HonoAppType>({
    url: "/api/openapi.json",
    pageTitle: "Yonyoung API Docs",
    theme: "saturn",
  });

  app.openapi(docsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    return scalarReference(c, async () => {});
  });
};
