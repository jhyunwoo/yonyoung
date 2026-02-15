import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  forbidden,
  noContent,
  notFound,
  ok,
} from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can } from "../lib/authorization/policy";
import {
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiAdminUpdateUserSchema,
  ApiIdParamSchema,
  ApiMemberProfileUpdateSchema,
  ApiUserSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const updateUserRequestSchema = z
  .union([ApiAdminUpdateUserSchema, ApiMemberProfileUpdateSchema])
  .openapi("ApiUpdateUserRequest");

const listUsersRoute = createRoute({
  method: "get",
  path: "/api/users",
  tags: ["Users"],
  operationId: "listUsers",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiUserSchema.array(), "사용자 목록/본인 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "getUserById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiUserSchema, "사용자 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateUserRoute = createRoute({
  method: "patch",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "updateUser",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(updateUserRequestSchema, "사용자 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiUserSchema, "사용자 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "deleteUser",
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

export const registerUserRoutes = (app: App, dependencies: AppDependencies) => {
  app.openapi(listUsersRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    // member의 사용자 조회는 본인만 허용한다.
    if (can(actorResult.actor.role, "user", "read")) {
      const data = await dependencies.getDataService(c).listUsers();
      return ok(c, data);
    }

    if (actorResult.actor.role === "member") {
      const me = await dependencies.getDataService(c).getUserById(actorResult.actor.id);
      if (!me) {
        return notFound(c);
      }
      return ok(c, [me]);
    }

    return forbidden(c);
  });

  app.openapi(getUserByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (!can(actorResult.actor.role, "user", "read") && !isSelf) {
      return forbidden(c);
    }
    if (actorResult.actor.role === "member" && !isSelf) {
      return forbidden(c, "부원은 본인 정보만 조회할 수 있습니다.");
    }

    const data = await dependencies.getDataService(c).getUserById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(updateUserRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    const isAdminLike = can(actorResult.actor.role, "user", "update");

    if (isAdminLike) {
      const body = await parseBody(c, ApiAdminUpdateUserSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }
      const data = await dependencies
        .getDataService(c)
        .updateUser(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    }

    // member는 본인 프로필(name/nickname/image)만 수정 가능하다.
    if (actorResult.actor.role === "member" && isSelf) {
      const body = await parseBody(c, ApiMemberProfileUpdateSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }
      const data = await dependencies
        .getDataService(c)
        .updateUser(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    }

    return forbidden(c);
  });

  app.openapi(deleteUserRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (!can(actorResult.actor.role, "user", "delete")) {
      if (!(actorResult.actor.role === "member" && isSelf)) {
        return forbidden(c);
      }
    }

    const deleted = await dependencies.getDataService(c).deleteUser(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
