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
  ApiActivityImageSchema,
  ApiActivitySchema,
  ApiCreateActivityImageSchema,
  ApiCreateActivitySchema,
  ApiIdParamSchema,
  ApiImageIdParamSchema,
  ApiUpdateActivityImageSchema,
  ApiUpdateActivitySchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listActivitiesRoute = createRoute({
  method: "get",
  path: "/api/activities",
  tags: ["Activities"],
  operationId: "listActivities",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiActivitySchema.array(), "활동 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createActivityRoute = createRoute({
  method: "post",
  path: "/api/activities",
  tags: ["Activities"],
  operationId: "createActivity",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateActivitySchema, "활동 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiActivitySchema, "활동 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getActivityByIdRoute = createRoute({
  method: "get",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "getActivityById",
  security: [{ cookieAuth: [] }],
  request: { params: ApiIdParamSchema },
  responses: {
    200: dataResponse(ApiActivitySchema, "활동 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateActivityRoute = createRoute({
  method: "patch",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "updateActivity",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateActivitySchema, "활동 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiActivitySchema, "활동 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteActivityRoute = createRoute({
  method: "delete",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "deleteActivity",
  security: [{ cookieAuth: [] }],
  request: { params: ApiIdParamSchema },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addActivityImageRoute = createRoute({
  method: "post",
  path: "/api/activities/{id}/images",
  tags: ["Activities"],
  operationId: "addActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateActivityImageSchema, "활동 이미지 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiActivityImageSchema, "활동 이미지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateActivityImageRoute = createRoute({
  method: "patch",
  path: "/api/activities/{id}/images/{imageId}",
  tags: ["Activities"],
  operationId: "updateActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
    body: jsonBody(ApiUpdateActivityImageSchema, "활동 이미지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiActivityImageSchema, "활동 이미지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteActivityImageRoute = createRoute({
  method: "delete",
  path: "/api/activities/{id}/images/{imageId}",
  tags: ["Activities"],
  operationId: "deleteActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

/**
 * registerActivityRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerActivityRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listActivitiesRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listActivities();
    return ok(c, data);
  });

  app.openapi(createActivityRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createActivity(body.data);
    return ok(c, data, 201);
  });

  app.openapi(getActivityByIdRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getActivityById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateActivityRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateActivity(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(deleteActivityRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies.getDataService(c).deleteActivity(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  // 세부 이미지는 활동 본문 수정과 동일 권한으로 분리 관리한다.
  app.openapi(addActivityImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addActivityImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "활동을 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.openapi(updateActivityImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateActivityImage(params.data.id, params.data.imageId, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.openapi(deleteActivityImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteActivityImage(params.data.id, params.data.imageId);
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
