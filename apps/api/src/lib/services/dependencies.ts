import type { Context } from "hono";
import { getActorFromSession } from "../auth/session";
import { createAuth } from "../auth";
import { Actor } from "../authorization/types";
import HonoAppType from "../../types/honoAppType";
import { createDbDataService } from "./db-service";
import { DataService, PresignService } from "./types";
import { createR2PresignService } from "../storage/presign";
import type { OpenAPIDocument } from "../openapi/merge";

export type ResolveActor = (
  c: Context<HonoAppType>,
) => Promise<Actor | null> | Actor | null;

export type GetDataService = (c: Context<HonoAppType>) => DataService;

export type GetPresignService = (c: Context<HonoAppType>) => PresignService;

export type GetAuthOpenApiSchema = (
  c: Context<HonoAppType>,
) => Promise<OpenAPIDocument>;

export type ShouldRequireDocsAuth = (c: Context<HonoAppType>) => boolean;

export type AppDependencies = {
  resolveActor: ResolveActor;
  getDataService: GetDataService;
  getPresignService: GetPresignService;
  getAuthOpenApiSchema: GetAuthOpenApiSchema;
  shouldRequireDocsAuth: ShouldRequireDocsAuth;
};

const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value || value.trim().length === 0) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

/**
 * createDefaultDependencies 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
export const createDefaultDependencies = (): AppDependencies => ({
  resolveActor: getActorFromSession,
  shouldRequireDocsAuth: (c) => parseBooleanEnv(c.env?.DOCS_AUTH_IN_PROD),
    /**
   * getDataService 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param c 요청/실행 컨텍스트 객체입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getDataService: (c) => createDbDataService(c.env.db),
    /**
   * getPresignService 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param c 요청/실행 컨텍스트 객체입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getPresignService: (c) => createR2PresignService(c.env),
    /**
   * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param c 요청/실행 컨텍스트 객체입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
   */
  getAuthOpenApiSchema: async (c) => {
    const auth = createAuth(c.env.db);
    const request = new Request(
      new URL("/api/auth/open-api/generate-schema", c.req.url),
      {
        method: "GET",
        headers: c.req.raw.headers,
      },
    );
    const response = await auth.handler(request);
    if (!response.ok) {
      throw new Error("인증 OpenAPI 스키마 조회에 실패했습니다.");
    }
    return (await response.json()) as OpenAPIDocument;
  },
});
