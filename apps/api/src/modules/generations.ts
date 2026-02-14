import { Hono } from "hono";
import { z } from "zod";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  conflict,
  internalError,
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

const createGenerationSchema = z.object({
  name: z.string().min(1, "name은 필수입니다."),
  sortOrder: z.number().int().nonnegative(),
  startDate: z.number().int().positive(),
  endDate: z.number().int().positive(),
});

const updateGenerationSchema = createGenerationSchema.partial();

const isUniqueError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE") || error.message.includes("unique"))
  );
};

export const registerGenerationRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/generations", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listGenerations();
    return ok(c, data);
  });

  app.post("/api/generations", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, createGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    try {
      const data = await dependencies.getDataService(c).createGeneration(body.data);
      return ok(c, data, 201);
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, "sortOrder 값이 이미 존재합니다.");
      }
      return internalError(c);
    }
  });

  app.get("/api/generations/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGenerationById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/generations/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, updateGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    try {
      const data = await dependencies
        .getDataService(c)
        .updateGeneration(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, "sortOrder 값이 이미 존재합니다.");
      }
      return internalError(c);
    }
  });

  app.delete("/api/generations/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteGeneration(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
