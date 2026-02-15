import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  conflict,
  internalError,
  noContent,
  notFound,
  ok,
} from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor, requirePermission } from "../lib/http/authz";
import {
  createdResponse,
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiCreateGenerationSchema,
  ApiGenerationSchema,
  ApiIdParamSchema,
  ApiUpdateGenerationSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listGenerationsRoute = createRoute({
  method: "get",
  path: "/api/generations",
  tags: ["Generations"],
  operationId: "listGenerations",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiGenerationSchema.array(), "기수 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGenerationRoute = createRoute({
  method: "post",
  path: "/api/generations",
  tags: ["Generations"],
  operationId: "createGeneration",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateGenerationSchema, "기수 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGenerationSchema, "기수 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    409: errorResponses[409],
    500: errorResponses[500],
  },
});

const getGenerationByIdRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "getGenerationById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationSchema, "기수 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGenerationRoute = createRoute({
  method: "patch",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "updateGeneration",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateGenerationSchema, "기수 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGenerationSchema, "기수 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
    409: errorResponses[409],
    500: errorResponses[500],
  },
});

const deleteGenerationRoute = createRoute({
  method: "delete",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "deleteGeneration",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const isUniqueError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE") || error.message.includes("unique"))
  );
};

export const registerGenerationRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listGenerationsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listGenerations();
    return ok(c, data);
  });

  app.openapi(createGenerationRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    try {
      const data = await dependencies.getDataService(c).createGeneration(body.data);
      return ok(c, data, 201);
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, "sortOrder 값이 이미 존재합니다.");
      }
      return internalError(c);
    }
  });

  app.openapi(getGenerationByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGenerationById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateGenerationRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    try {
      const data = await dependencies
        .getDataService(c)
        .updateGeneration(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, "sortOrder 값이 이미 존재합니다.");
      }
      return internalError(c);
    }
  });

  app.openapi(deleteGenerationRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteGeneration(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
