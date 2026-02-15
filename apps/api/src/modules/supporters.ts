import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, noContent, notFound, ok } from "../lib/http/response";
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
  ApiCreateSupporterSchema,
  ApiIdParamSchema,
  ApiSupporterSchema,
  ApiUpdateSupporterSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listSupportersRoute = createRoute({
  method: "get",
  path: "/api/supporters",
  tags: ["Supporters"],
  operationId: "listSupporters",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiSupporterSchema.array(), "후원사 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createSupporterRoute = createRoute({
  method: "post",
  path: "/api/supporters",
  tags: ["Supporters"],
  operationId: "createSupporter",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateSupporterSchema, "후원사 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiSupporterSchema, "후원사 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getSupporterByIdRoute = createRoute({
  method: "get",
  path: "/api/supporters/{id}",
  tags: ["Supporters"],
  operationId: "getSupporterById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiSupporterSchema, "후원사 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateSupporterRoute = createRoute({
  method: "patch",
  path: "/api/supporters/{id}",
  tags: ["Supporters"],
  operationId: "updateSupporter",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateSupporterSchema, "후원사 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiSupporterSchema, "후원사 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteSupporterRoute = createRoute({
  method: "delete",
  path: "/api/supporters/{id}",
  tags: ["Supporters"],
  operationId: "deleteSupporter",
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

export const registerSupporterRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listSupportersRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listSupporters();
    return ok(c, data);
  });

  app.openapi(createSupporterRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateSupporterSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createSupporter(body.data);
    return ok(c, data, 201);
  });

  app.openapi(getSupporterByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getSupporterById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateSupporterRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateSupporterSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateSupporter(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(deleteSupporterRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteSupporter(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
