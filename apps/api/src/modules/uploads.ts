import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, internalError, ok } from "../lib/http/response";
import { parseBody } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can, isMemberLikeRole } from "../lib/authorization/policy";
import { Resource } from "../lib/authorization/types";
import { MissingStorageConfigError } from "../lib/storage/presign";
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

/**
 * canCreateOrUpdate 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @param resource 응답 데이터 또는 응답 객체입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const canCreateOrUpdate = (role: Parameters<typeof can>[0], resource: Resource) => {
  return can(role, resource, "create") || can(role, resource, "update");
};

const resourceUploadPathMap = {
  activity: "activities",
  exhibition: "exhibitions",
  supporter: "supporters",
} as const;

/**
 * registerResourcePresignRoute 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @param routePath 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param operationId 대상을 식별하기 위한 ID 값입니다.
 * @param resource 응답 데이터 또는 응답 객체입니다.
 * @param slot 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
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

  app.openapi(route, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
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
      if (error instanceof MissingStorageConfigError) {
        return internalError(
          c,
          "업로드 스토리지 설정이 누락되었습니다. R2_* 환경변수를 확인해 주세요.",
        );
      }
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

/**
 * registerUploadRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
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

  // 사용자 프로필 이미지는 관리자 업데이트 권한 또는 member 계열 role 본인 프로필 수정 권한을 기준으로 발급한다.
  app.openapi(userProfilePresignRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const canUserUpdate = can(actorResult.actor.role, "user", "update");
    const canMemberSelfProfile = isMemberLikeRole(actorResult.actor.role);
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
      if (error instanceof MissingStorageConfigError) {
        return internalError(
          c,
          "업로드 스토리지 설정이 누락되었습니다. R2_* 환경변수를 확인해 주세요.",
        );
      }
      console.error("presign issue failed", error);
      return internalError(c, "업로드 URL 발급에 실패했습니다.");
    }
  });
};
