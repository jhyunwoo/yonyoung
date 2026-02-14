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

const createSupporterSchema = z.object({
  name: z.string().min(1),
  link: z.string().url(),
  logoUrl: z.string().url(),
  expiresAt: z.number().int().positive(),
});

const updateSupporterSchema = createSupporterSchema.partial();

export const registerSupporterRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/supporters", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listSupporters();
    return ok(c, data);
  });

  app.post("/api/supporters", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, createSupporterSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createSupporter(body.data);
    return ok(c, data, 201);
  });

  app.get("/api/supporters/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getSupporterById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/supporters/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, updateSupporterSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateSupporter(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.delete("/api/supporters/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "supporter", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteSupporter(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
