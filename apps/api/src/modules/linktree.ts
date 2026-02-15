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
  ApiCreateLinktreeItemSchema,
  ApiCreateLinktreeSchema,
  ApiIdParamSchema,
  ApiItemIdParamSchema,
  ApiLinktreeItemSchema,
  ApiLinktreeSchema,
  ApiUpdateLinktreeItemSchema,
  ApiUpdateLinktreeSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listLinktreesRoute = createRoute({
  method: "get",
  path: "/api/linktree",
  tags: ["Linktree"],
  operationId: "listLinktrees",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiLinktreeSchema.array(), "링크트리 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createLinktreeRoute = createRoute({
  method: "post",
  path: "/api/linktree",
  tags: ["Linktree"],
  operationId: "createLinktree",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateLinktreeSchema, "링크트리 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiLinktreeSchema, "링크트리 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getLinktreeByIdRoute = createRoute({
  method: "get",
  path: "/api/linktree/{id}",
  tags: ["Linktree"],
  operationId: "getLinktreeById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiLinktreeSchema, "링크트리 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateLinktreeRoute = createRoute({
  method: "patch",
  path: "/api/linktree/{id}",
  tags: ["Linktree"],
  operationId: "updateLinktree",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateLinktreeSchema, "링크트리 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiLinktreeSchema, "링크트리 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteLinktreeRoute = createRoute({
  method: "delete",
  path: "/api/linktree/{id}",
  tags: ["Linktree"],
  operationId: "deleteLinktree",
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

const addLinktreeItemRoute = createRoute({
  method: "post",
  path: "/api/linktree/{id}/items",
  tags: ["Linktree"],
  operationId: "addLinktreeItem",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateLinktreeItemSchema, "링크트리 아이템 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiLinktreeItemSchema, "링크트리 아이템 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateLinktreeItemRoute = createRoute({
  method: "patch",
  path: "/api/linktree/{id}/items/{itemId}",
  tags: ["Linktree"],
  operationId: "updateLinktreeItem",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiItemIdParamSchema,
    body: jsonBody(ApiUpdateLinktreeItemSchema, "링크트리 아이템 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiLinktreeItemSchema, "링크트리 아이템 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteLinktreeItemRoute = createRoute({
  method: "delete",
  path: "/api/linktree/{id}/items/{itemId}",
  tags: ["Linktree"],
  operationId: "deleteLinktreeItem",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiItemIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

export const registerLinktreeRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listLinktreesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listLinktrees();
    return ok(c, data);
  });

  app.openapi(createLinktreeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateLinktreeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createLinktree(body.data);
    return ok(c, data, 201);
  });

  app.openapi(getLinktreeByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getLinktreeById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateLinktreeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateLinktreeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateLinktree(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(deleteLinktreeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteLinktree(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  app.openapi(addLinktreeItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateLinktreeItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addLinktreeItem(params.data.id, body.data);
    if (!data) {
      return notFound(c, "링크트리를 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.openapi(updateLinktreeItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateLinktreeItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateLinktreeItem(params.data.id, params.data.itemId, body.data);
    if (!data) {
      return notFound(c, "링크 아이템을 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.openapi(deleteLinktreeItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteLinktreeItem(params.data.id, params.data.itemId);
    if (!deleted) {
      return notFound(c, "링크 아이템을 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
