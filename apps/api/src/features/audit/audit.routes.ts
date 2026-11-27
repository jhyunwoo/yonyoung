import { type OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type HonoAppType from "../../types/honoAppType";
import { ok } from "../../lib/http/response";
import type { AppDependencies } from "../../lib/services/dependencies";
import { requireAuthenticatedActor } from "../../shared/http/route-guards";
import { readValidated } from "../../shared/http/validated-input";
import { can, isManagerLikeRole } from "../../lib/authorization/policy";
import type { Resource } from "../../lib/authorization/types";
import { dataResponse, errorResponses } from "../../lib/openapi/responses";
import {
  ApiAuditLogSchema,
  ApiAuditParamSchema,
  ApiAuditQuerySchema,
} from "./audit.contract";
import { AppError } from "../../shared/errors/AppError";

type App = OpenAPIHono<HonoAppType>;

/**
 * 이 feature 가 실제로 쓰는 것만 선언한다.
 * 애플리케이션 전체 dependency bag 을 받으면 무엇에 의존하는지 파일을 다 읽어야 알 수 있다.
 */
export type AuditRouteDependencies = Pick<
  AppDependencies,
  "resolveActor" | "getDataService"
>;

/**
 * 운영진이 읽기만 할 수 있는 리소스의 변경 이력은 그 리소스를 수정할 수 있는 역할에만 보여 준다.
 * 이력에는 누가 어떤 필드를 바꿨는지가 담겨, 조회 권한보다 넓은 정보를 준다.
 */
const AUDIT_RESOURCES_REQUIRING_UPDATE: Partial<Record<string, Resource>> = {
  user: "user",
  site_settings: "site_setting",
};

const listAuditLogsRoute = createRoute({
  method: "get",
  path: "/api/audit/{resourceType}/{resourceId}",
  tags: ["Audit"],
  operationId: "listAuditLogs",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiAuditParamSchema,
    query: ApiAuditQuerySchema,
  },
  responses: {
    200: dataResponse(ApiAuditLogSchema.array(), "감사 로그 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

export const registerAuditRoutes = (
  app: App,
  dependencies: AuditRouteDependencies,
) => {
  app.openapi(listAuditLogsRoute, async (c) => {
    const actor = await requireAuthenticatedActor(c, dependencies);

    if (!isManagerLikeRole(actor.role)) {
      throw AppError.forbidden();
    }

    const params = readValidated(c, "param", ApiAuditParamSchema);

    const restrictedResource =
      AUDIT_RESOURCES_REQUIRING_UPDATE[params.resourceType];
    if (restrictedResource && !can(actor.role, restrictedResource, "update")) {
      throw AppError.forbidden();
    }

    const query = readValidated(c, "query", ApiAuditQuerySchema);

    const logs = await dependencies
      .getDataService(c)
      .listAuditLogs(params.resourceType, params.resourceId, query.limit);

    return ok(c, logs);
  });
};
