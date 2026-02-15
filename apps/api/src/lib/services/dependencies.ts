import { Context } from "hono";
import { getActorFromSession } from "../auth/session";
import { createAuth } from "../auth";
import { Actor } from "../authorization/types";
import HonoAppType from "../../types/honoAppType";
import { createDbDataService } from "./db-service";
import { DataService, PresignService } from "./types";
import { createR2PresignService } from "../storage/presign";
import { OpenAPIDocument } from "../openapi/merge";

export type ResolveActor = (
  c: Context<HonoAppType>,
) => Promise<Actor | null> | Actor | null;

export type GetDataService = (c: Context<HonoAppType>) => DataService;

export type GetPresignService = (c: Context<HonoAppType>) => PresignService;

export type GetAuthOpenApiSchema = (
  c: Context<HonoAppType>,
) => Promise<OpenAPIDocument>;

export type AppDependencies = {
  resolveActor: ResolveActor;
  getDataService: GetDataService;
  getPresignService: GetPresignService;
  getAuthOpenApiSchema: GetAuthOpenApiSchema;
};

export const createDefaultDependencies = (): AppDependencies => ({
  resolveActor: getActorFromSession,
  getDataService: (c) => createDbDataService(c.env.db),
  getPresignService: (c) => createR2PresignService(c.env),
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
