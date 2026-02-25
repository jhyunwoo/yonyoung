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
  ApiCreateGenerationNoticeSchema,
  ApiCreateGlobalNoticeSchema,
  ApiGenerationNoticeSchema,
  ApiGlobalNoticeSchema,
  ApiIdParamSchema,
  ApiNoticeIdParamSchema,
  ApiUpdateGenerationNoticeSchema,
  ApiUpdateGlobalNoticeSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listGenerationNoticesRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}/notices",
  tags: ["Notices"],
  operationId: "listGenerationNotices",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema.array(), "기수 공지 목록 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGenerationNoticeRoute = createRoute({
  method: "post",
  path: "/api/generations/{id}/notices",
  tags: ["Notices"],
  operationId: "createGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateGenerationNoticeSchema, "기수 공지 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGenerationNoticeSchema, "기수 공지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getGenerationNoticeByIdRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "getGenerationNoticeById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema, "기수 공지 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGenerationNoticeRoute = createRoute({
  method: "patch",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "updateGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
    body: jsonBody(ApiUpdateGenerationNoticeSchema, "기수 공지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema, "기수 공지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteGenerationNoticeRoute = createRoute({
  method: "delete",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "deleteGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const listGlobalNoticesRoute = createRoute({
  method: "get",
  path: "/api/global-notices",
  tags: ["Notices"],
  operationId: "listGlobalNotices",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema.array(), "전체 공지 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGlobalNoticeRoute = createRoute({
  method: "post",
  path: "/api/global-notices",
  tags: ["Notices"],
  operationId: "createGlobalNotice",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateGlobalNoticeSchema, "전체 공지 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGlobalNoticeSchema, "전체 공지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getGlobalNoticeByIdRoute = createRoute({
  method: "get",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "getGlobalNoticeById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema, "전체 공지 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGlobalNoticeRoute = createRoute({
  method: "patch",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "updateGlobalNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateGlobalNoticeSchema, "전체 공지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema, "전체 공지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteGlobalNoticeRoute = createRoute({
  method: "delete",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "deleteGlobalNotice",
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

export const registerNoticeRoutes = (app: App, dependencies: AppDependencies) => {
  app.openapi(listGenerationNoticesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .listGenerationNotices(params.data.id);

    return ok(c, data);
  });

  app.openapi(createGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "create");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiCreateGenerationNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createGenerationNotice(params.data.id, {
      ...body.data,
      authorId: actorResult.actor.id,
    });

    if (!data) {
      return notFound(c);
    }

    return ok(c, data, 201);
  });

  app.openapi(getGenerationNoticeByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGenerationNoticeById(params.data.id, params.data.noticeId);

    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(updateGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGenerationNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateGenerationNotice(params.data.id, params.data.noticeId, body.data);

    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(deleteGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteGenerationNotice(params.data.id, params.data.noticeId);

    if (!deleted) {
      return notFound(c);
    }

    return noContent(c);
  });

  app.openapi(listGlobalNoticesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listGlobalNotices();
    return ok(c, data);
  });

  app.openapi(createGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateGlobalNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createGlobalNotice({
      ...body.data,
      authorId: actorResult.actor.id,
    });

    if (!data) {
      return notFound(c);
    }

    return ok(c, data, 201);
  });

  app.openapi(getGlobalNoticeByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGlobalNoticeById(params.data.id);

    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(updateGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGlobalNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateGlobalNotice(params.data.id, body.data);

    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(deleteGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteGlobalNotice(params.data.id);

    if (!deleted) {
      return notFound(c);
    }

    return noContent(c);
  });
};
