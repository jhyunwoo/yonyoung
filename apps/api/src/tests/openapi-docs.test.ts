import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { OpenAPIDocument } from "../lib/openapi/merge";
import { REQUIRED_DESCRIPTION_SECTIONS } from "../lib/openapi/descriptions";

const authOpenApiFixture: OpenAPIDocument = {
  openapi: "3.1.1",
  info: {
    title: "Better Auth",
    version: "1.0.0",
  },
  paths: {
    "/get-session": {
      get: {
        operationId: "getSession",
        responses: {
          200: {
            description: "ok",
          },
        },
      },
    },
    "/sign-in/social": {
      post: {
        operationId: "signInSocial",
        responses: {
          200: {
            description: "ok",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AuthSession: {
        type: "object",
      },
    },
    securitySchemes: {
      apiKeyCookie: {
        type: "apiKey",
        in: "cookie",
        name: "apiKeyCookie",
      },
    },
  },
  tags: [{ name: "Default", description: "Auth default endpoints" }],
};

describe("OpenAPI docs routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("비로그인 접근 시 /api/docs는 200을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request("/api/docs");
    expect(response.status).toBe(200);
  });

  it("비로그인 접근 시 /api/openapi.json은 200을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);
  });

  it("공개 상태에서 통합 OpenAPI 문서를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);

    const body = (await response.json()) as OpenAPIDocument;
    expect(body.openapi).toBe("3.1.1");

    // 내부 API 경로가 포함되어야 한다.
    expect(body.paths?.["/api/activities"]).toBeDefined();
    expect(body.paths?.["/api/users/{id}"]).toBeDefined();

    // Better Auth 경로는 /api/auth prefix로 정규화되어 병합되어야 한다.
    expect(body.paths?.["/api/auth/get-session"]).toBeDefined();
    expect(body.paths?.["/api/auth/sign-in/social"]).toBeDefined();

    // 보호 라우트 문서에는 cookieAuth security가 있어야 한다.
    const activityPost = body.paths?.["/api/activities"]?.post;
    expect(activityPost?.security).toEqual([{ cookieAuth: [] }]);

    // 요청/응답 스키마가 문서에 포함되어야 한다.
    expect(activityPost?.requestBody).toBeDefined();
    expect(activityPost?.responses?.["201"]).toBeDefined();

    // 내부 스키마와 Auth 스키마가 함께 존재해야 한다.
    expect(body.components?.schemas?.ApiErrorResponse).toBeDefined();
    expect(body.components?.schemas?.AuthSession).toBeDefined();

    // 대표 내부 엔드포인트 설명이 필수 섹션을 포함해야 한다.
    expect(typeof activityPost?.summary).toBe("string");
    expect(activityPost?.summary?.length ?? 0).toBeGreaterThan(0);
    for (const section of REQUIRED_DESCRIPTION_SECTIONS) {
      expect(activityPost?.description).toContain(section);
    }

    // 대표 auth 엔드포인트 설명도 동일 섹션을 가져야 한다.
    const getSession = body.paths?.["/api/auth/get-session"]?.get;
    expect(typeof getSession?.summary).toBe("string");
    for (const section of REQUIRED_DESCRIPTION_SECTIONS) {
      expect(getSession?.description).toContain(section);
    }

    // 에러 응답 설명이 상세화되어 있어야 한다.
    expect(activityPost?.responses?.["403"]?.description).toContain(
      "역할 기반 권한 정책",
    );
  });

  it("공개 상태에서 /api/docs 페이지를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request("/api/docs");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.length).toBeGreaterThan(0);
    expect(html.toLowerCase()).toContain("scalar");
  });
});
