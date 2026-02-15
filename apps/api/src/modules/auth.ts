import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "../lib/auth";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

/**
 * registerAuthRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export function registerAuthRoutes(app: App) {
  app.on(["GET", "POST"], "/api/auth/*", /** app.on 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c) => {
    const auth = createAuth(c.env.db);
    return auth.handler(c.req.raw);
  });
}
