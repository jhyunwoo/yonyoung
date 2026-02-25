import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, noContent, notFound, ok } from "../lib/http/response";
import { purgePublicCachePath } from "../lib/http/public-cache";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor, requirePermission } from "../lib/http/authz";
import {
  recordAuditLog,
  readChangedFields,
  withUpdatedByActor,
} from "../lib/audit";
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
const PUBLIC_SUPPORTERS_CACHE_PATH = "/api/public/supporters";

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

/**
 * registerSupporterRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerSupporterRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listSupportersRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
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

  app.openapi(createSupporterRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
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

    const dataService = dependencies.getDataService(c);
    const data = await dataService.createSupporter(body.data);
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "supporter",
      resourceId: data.id,
      action: "create",
      changedFields: readChangedFields(body.data, [
        "name",
        "link",
        "logoUrl",
        "expiresAt",
      ]),
    });
    await purgePublicCachePath(c, PUBLIC_SUPPORTERS_CACHE_PATH);
    return ok(c, withUpdatedByActor(data, actorResult.actor), 201);
  });

  app.openapi(getSupporterByIdRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
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

  app.openapi(updateSupporterRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
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

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateSupporter(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "supporter",
      resourceId: data.id,
      action: "update",
      changedFields: readChangedFields(body.data, ["updatedAt"]),
    });
    await purgePublicCachePath(c, PUBLIC_SUPPORTERS_CACHE_PATH);
    return ok(c, withUpdatedByActor(data, actorResult.actor));
  });

  app.openapi(deleteSupporterRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
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

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteSupporter(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "supporter",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });
    await purgePublicCachePath(c, PUBLIC_SUPPORTERS_CACHE_PATH);
    return noContent(c);
  });
};
