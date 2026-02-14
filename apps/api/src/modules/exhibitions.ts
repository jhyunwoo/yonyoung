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

const createExhibitionSchema = z.object({
  title: z.string().min(1),
  startDate: z.number().int().positive(),
  endDate: z.number().int().positive(),
  generationId: z.uuid("generationId 형식이 올바르지 않습니다."),
  place: z.string().min(1),
  coverImageUrl: z.string().url(),
  description: z.string().min(1),
});

const updateExhibitionSchema = createExhibitionSchema.partial();

const createExhibitionImageSchema = z.object({
  imageUrl: z.string().url(),
  sortOrder: z.number().int().nonnegative().default(0),
});

const updateExhibitionImageSchema = createExhibitionImageSchema.partial();

export const registerExhibitionRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/exhibitions", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listExhibitions();
    return ok(c, data);
  });

  app.post("/api/exhibitions", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, createExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createExhibition(body.data);
    return ok(c, data, 201);
  });

  app.get("/api/exhibitions/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getExhibitionById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/exhibitions/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, updateExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateExhibition(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.delete("/api/exhibitions/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteExhibition(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  // 전시 세부 이미지도 별도 엔드포인트로 분리해 부분 수정이 가능하도록 한다.
  app.post("/api/exhibitions/:id/images", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, createExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addExhibitionImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "전시를 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.patch("/api/exhibitions/:id/images/:imageId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, imageParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, updateExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateExhibitionImage(params.data.id, params.data.imageId, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.delete("/api/exhibitions/:id/images/:imageId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, imageParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteExhibitionImage(params.data.id, params.data.imageId);
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
