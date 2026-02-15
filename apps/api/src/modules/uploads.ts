import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, internalError, ok } from "../lib/http/response";
import { parseBody } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can } from "../lib/authorization/policy";
import { Resource } from "../lib/authorization/types";
import {
  createdResponse,
  errorResponses,
  jsonBody,
} from "../lib/openapi/responses";
import {
  ApiPresignRequestSchema,
  ApiPresignResponseSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const canCreateOrUpdate = (role: Parameters<typeof can>[0], resource: Resource) => {
  return can(role, resource, "create") || can(role, resource, "update");
};

const resourceUploadPathMap = {
  activity: "activities",
  exhibition: "exhibitions",
  supporter: "supporters",
} as const;

const registerResourcePresignRoute = (
  app: App,
  dependencies: AppDependencies,
  routePath: string,
  operationId: string,
  resource: Extract<Resource, "activity" | "exhibition" | "supporter">,
  slot: "cover" | "detail" | "logo",
) => {
  const route = createRoute({
    method: "post",
    path: routePath,
    tags: ["Uploads"],
    operationId,
    security: [{ cookieAuth: [] }],
    request: {
      body: jsonBody(ApiPresignRequestSchema, "Presigned URL 발급 요청"),
    },
    responses: {
      201: createdResponse(ApiPresignResponseSchema, "Presigned URL 발급 성공"),
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
      500: errorResponses[500],
    },
  });

  app.openapi(route, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!canCreateOrUpdate(actorResult.actor.role, resource)) {
      return forbidden(c);
    }

    const body = await parseBody(c, ApiPresignRequestSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    try {
      const data = await dependencies.getPresignService(c).issuePresignedPutUrl({
        actorId: actorResult.actor.id,
        resource: resourceUploadPathMap[resource],
        slot,
        fileName: body.data.fileName,
        contentType: body.data.contentType,
      });
      return ok(c, data, 201);
    } catch (error) {
      console.error("presign issue failed", error);
      return internalError(c, "업로드 URL 발급에 실패했습니다.");
    }
  });
};

const userProfilePresignRoute = createRoute({
  method: "post",
  path: "/api/users/presign/profile",
  tags: ["Uploads"],
  operationId: "issueUserProfilePresign",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiPresignRequestSchema, "프로필 업로드 Presigned URL 발급 요청"),
  },
  responses: {
    201: createdResponse(ApiPresignResponseSchema, "Presigned URL 발급 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    500: errorResponses[500],
  },
});

export const registerUploadRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/activities/presign/cover",
    "issueActivityCoverPresign",
    "activity",
    "cover",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/activities/presign/detail",
    "issueActivityDetailPresign",
    "activity",
    "detail",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/exhibitions/presign/cover",
    "issueExhibitionCoverPresign",
    "exhibition",
    "cover",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/exhibitions/presign/detail",
    "issueExhibitionDetailPresign",
    "exhibition",
    "detail",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/supporters/presign/logo",
    "issueSupporterLogoPresign",
    "supporter",
    "logo",
  );

  // 사용자 프로필 이미지는 관리자 업데이트 권한 또는 member 본인 프로필 수정 권한을 기준으로 발급한다.
  app.openapi(userProfilePresignRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const canUserUpdate = can(actorResult.actor.role, "user", "update");
    const canMemberSelfProfile = actorResult.actor.role === "member";
    if (!canUserUpdate && !canMemberSelfProfile) {
      return forbidden(c);
    }

    const body = await parseBody(c, ApiPresignRequestSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    try {
      const data = await dependencies.getPresignService(c).issuePresignedPutUrl({
        actorId: actorResult.actor.id,
        resource: "users",
        slot: "profile",
        fileName: body.data.fileName,
        contentType: body.data.contentType,
      });
      return ok(c, data, 201);
    } catch (error) {
      console.error("presign issue failed", error);
      return internalError(c, "업로드 URL 발급에 실패했습니다.");
    }
  });
};
