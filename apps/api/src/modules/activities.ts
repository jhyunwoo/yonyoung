import { Hono } from "hono";
import { z } from "zod";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  noContent,
  notFound,
  ok,
} from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor, requirePermission } from "../lib/http/authz";

type App = Hono<HonoAppType>;

const idParamSchema = z.object({
  id: z.uuid("id 형식이 올바르지 않습니다."),
});

const imageParamsSchema = z.object({
  id: z.uuid("id 형식이 올바르지 않습니다."),
  imageId: z.uuid("imageId 형식이 올바르지 않습니다."),
});

const createActivitySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  activityDate: z.number().int().positive(),
  coverImageUrl: z.string().url(),
  generationId: z.uuid("generationId 형식이 올바르지 않습니다."),
});

const updateActivitySchema = createActivitySchema.partial();

const createActivityImageSchema = z.object({
  imageUrl: z.string().url(),
  sortOrder: z.number().int().nonnegative().default(0),
});

const updateActivityImageSchema = createActivityImageSchema.partial();

export const registerActivityRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/activities", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listActivities();
    return ok(c, data);
  });

  app.post("/api/activities", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, createActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createActivity(body.data);
    return ok(c, data, 201);
  });

  app.get("/api/activities/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getActivityById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/activities/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, updateActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateActivity(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.delete("/api/activities/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies.getDataService(c).deleteActivity(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  // 세부 이미지는 활동 본문 수정과 동일 권한으로 분리 관리한다.
  app.post("/api/activities/:id/images", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, createActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addActivityImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "활동을 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.patch("/api/activities/:id/images/:imageId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, imageParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, updateActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateActivityImage(params.data.id, params.data.imageId, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.delete("/api/activities/:id/images/:imageId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, imageParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteActivityImage(params.data.id, params.data.imageId);
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
