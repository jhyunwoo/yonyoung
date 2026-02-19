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
  ApiCreateExhibitionImageBatchSchema,
  ApiCreateExhibitionImageSchema,
  ApiCreateExhibitionSchema,
  ApiExhibitionImageSchema,
  ApiExhibitionSchema,
  ApiIdParamSchema,
  ApiImageIdParamSchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
  ApiUpdateExhibitionSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listExhibitionsRoute = createRoute({
  method: "get",
  path: "/api/exhibitions",
  tags: ["Exhibitions"],
  operationId: "listExhibitions",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiExhibitionSchema.array(), "전시 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createExhibitionRoute = createRoute({
  method: "post",
  path: "/api/exhibitions",
  tags: ["Exhibitions"],
  operationId: "createExhibition",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateExhibitionSchema, "전시 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionSchema, "전시 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getExhibitionByIdRoute = createRoute({
  method: "get",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "getExhibitionById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema, "전시 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "updateExhibition",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionSchema, "전시 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema, "전시 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteExhibitionRoute = createRoute({
  method: "delete",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "deleteExhibition",
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

const addExhibitionImageRoute = createRoute({
  method: "post",
  path: "/api/exhibitions/{id}/images",
  tags: ["Exhibitions"],
  operationId: "addExhibitionImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateExhibitionImageSchema, "전시 이미지 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionImageSchema, "전시 이미지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionImageRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}/images/{imageId}",
  tags: ["Exhibitions"],
  operationId: "updateExhibitionImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionImageSchema, "전시 이미지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionImageSchema, "전시 이미지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addExhibitionImagesBatchRoute = createRoute({
  method: "post",
  path: "/api/exhibitions/{id}/images/batch",
  tags: ["Exhibitions"],
  operationId: "addExhibitionImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateExhibitionImageBatchSchema, "전시 이미지 일괄 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionImageSchema.array(), "전시 이미지 일괄 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionImagesBatchRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}/images/batch",
  tags: ["Exhibitions"],
  operationId: "updateExhibitionImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionImageBatchSchema, "전시 이미지 일괄 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionImageSchema.array(), "전시 이미지 일괄 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteExhibitionImageRoute = createRoute({
  method: "delete",
  path: "/api/exhibitions/{id}/images/{imageId}",
  tags: ["Exhibitions"],
  operationId: "deleteExhibitionImage",
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
 * registerExhibitionRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerExhibitionRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listExhibitionsRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listExhibitions();
    return ok(c, data);
  });

  app.openapi(createExhibitionRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createExhibition(body.data);
    return ok(c, data, 201);
  });

  app.openapi(getExhibitionByIdRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getExhibitionById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateExhibitionRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateExhibition(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(deleteExhibitionRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteExhibition(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  // 전시 세부 이미지도 별도 엔드포인트로 분리해 부분 수정이 가능하도록 한다.
  app.openapi(addExhibitionImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addExhibitionImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "전시를 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.openapi(addExhibitionImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateExhibitionImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addExhibitionImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "전시를 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.openapi(updateExhibitionImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateExhibitionImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .updateExhibitionImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.openapi(updateExhibitionImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateExhibitionImage(params.data.id, params.data.imageId, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.openapi(deleteExhibitionImageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteExhibitionImage(params.data.id, params.data.imageId);
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
