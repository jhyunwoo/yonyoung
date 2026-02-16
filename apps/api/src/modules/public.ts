import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  ApiActivitySchema,
  ApiExhibitionSchema,
  ApiGenerationSchema,
  ApiLinktreeSchema,
  ApiSupporterSchema,
} from "../lib/openapi/schemas";
import { dataResponse } from "../lib/openapi/responses";
import { ok } from "../lib/http/response";
import { respondWithPublicCache } from "../lib/http/public-cache";
import { AppDependencies } from "../lib/services/dependencies";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

const listPublicActivitiesRoute = createRoute({
  method: "get",
  path: "/api/public/activities",
  tags: ["Public"],
  operationId: "listPublicActivities",
  responses: {
    200: dataResponse(ApiActivitySchema.array(), "공개 활동 목록 조회 성공"),
  },
});

const listPublicExhibitionsRoute = createRoute({
  method: "get",
  path: "/api/public/exhibitions",
  tags: ["Public"],
  operationId: "listPublicExhibitions",
  responses: {
    200: dataResponse(ApiExhibitionSchema.array(), "공개 전시 목록 조회 성공"),
  },
});

const listPublicSupportersRoute = createRoute({
  method: "get",
  path: "/api/public/supporters",
  tags: ["Public"],
  operationId: "listPublicSupporters",
  responses: {
    200: dataResponse(ApiSupporterSchema.array(), "공개 후원사 목록 조회 성공"),
  },
});

const listPublicLinktreeRoute = createRoute({
  method: "get",
  path: "/api/public/linktree",
  tags: ["Public"],
  operationId: "listPublicLinktree",
  responses: {
    200: dataResponse(ApiLinktreeSchema.array(), "공개 링크트리 목록 조회 성공"),
  },
});

const listPublicGenerationsRoute = createRoute({
  method: "get",
  path: "/api/public/generations",
  tags: ["Public"],
  operationId: "listPublicGenerations",
  responses: {
    200: dataResponse(ApiGenerationSchema.array(), "공개 기수 목록 조회 성공"),
  },
});

/**
 * registerPublicRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerPublicRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listPublicActivitiesRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listPublicActivities();
      return ok(c, data);
    }),
  );

  app.openapi(listPublicExhibitionsRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listPublicExhibitions();
      return ok(c, data);
    }),
  );

  app.openapi(listPublicSupportersRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies
        .getDataService(c)
        .listPublicSupporters(Date.now());
      return ok(c, data);
    }),
  );

  app.openapi(listPublicLinktreeRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listLinktrees();
      return ok(c, data);
    }),
  );

  app.openapi(listPublicGenerationsRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies
        .getDataService(c)
        .listGenerations()
        .then((rows) => [...rows].sort((a, b) => a.sortOrder - b.sortOrder));
      return ok(c, data);
    }),
  );
};
