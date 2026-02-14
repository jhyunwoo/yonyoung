import { Hono } from "hono";
import { z } from "zod";
import HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, internalError, ok } from "../lib/http/response";
import { parseBody } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can } from "../lib/authorization/policy";
import { Resource } from "../lib/authorization/types";

type App = Hono<HonoAppType>;

const presignRequestSchema = z
  .object({
    fileName: z.string().min(1, "fileName은 필수입니다."),
    contentType: z
      .string()
      .min(1)
      .refine((value) => value.startsWith("image/"), {
        message: "이미지 파일만 업로드할 수 있습니다.",
      }),
  })
  .strict();

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
  path: string,
  resource: Extract<Resource, "activity" | "exhibition" | "supporter">,
  slot: "cover" | "detail" | "logo",
) => {
  app.post(path, async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!canCreateOrUpdate(actorResult.actor.role, resource)) {
      return forbidden(c);
    }

    const body = await parseBody(c, presignRequestSchema);
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

export const registerUploadRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/activities/presign/cover",
    "activity",
    "cover",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/activities/presign/detail",
    "activity",
    "detail",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/exhibitions/presign/cover",
    "exhibition",
    "cover",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/exhibitions/presign/detail",
    "exhibition",
    "detail",
  );
  registerResourcePresignRoute(
    app,
    dependencies,
    "/api/supporters/presign/logo",
    "supporter",
    "logo",
  );

  // 사용자 프로필 이미지는 관리자 업데이트 권한 또는 member 본인 프로필 수정 권한을 기준으로 발급한다.
  app.post("/api/users/presign/profile", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const canUserUpdate = can(actorResult.actor.role, "user", "update");
    const canMemberSelfProfile = actorResult.actor.role === "member";
    if (!canUserUpdate && !canMemberSelfProfile) {
      return forbidden(c);
    }

    const body = await parseBody(c, presignRequestSchema);
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
