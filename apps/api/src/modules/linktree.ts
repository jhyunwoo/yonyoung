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

const itemParamsSchema = z.object({
  id: z.uuid("id 형식이 올바르지 않습니다."),
  itemId: z.uuid("itemId 형식이 올바르지 않습니다."),
});

const createLinktreeSchema = z.object({
  name: z.string().min(1),
});

const updateLinktreeSchema = createLinktreeSchema.partial();

const createLinktreeItemSchema = z.object({
  name: z.string().min(1),
  link: z.string().url(),
});

const updateLinktreeItemSchema = createLinktreeItemSchema.partial();

export const registerLinktreeRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/linktree", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listLinktrees();
    return ok(c, data);
  });

  app.post("/api/linktree", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, createLinktreeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).createLinktree(body.data);
    return ok(c, data, 201);
  });

  app.get("/api/linktree/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getLinktreeById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/linktree/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, updateLinktreeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateLinktree(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.delete("/api/linktree/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteLinktree(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });

  app.post("/api/linktree/:id/items", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, createLinktreeItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies
      .getDataService(c)
      .addLinktreeItem(params.data.id, body.data);
    if (!data) {
      return notFound(c, "링크트리를 찾을 수 없습니다.");
    }
    return ok(c, data, 201);
  });

  app.patch("/api/linktree/:id/items/:itemId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, itemParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, updateLinktreeItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const data = await dependencies
      .getDataService(c)
      .updateLinktreeItem(params.data.id, params.data.itemId, body.data);
    if (!data) {
      return notFound(c, "링크 아이템을 찾을 수 없습니다.");
    }
    return ok(c, data);
  });

  app.delete("/api/linktree/:id/items/:itemId", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "linktree", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, itemParamsSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const deleted = await dependencies
      .getDataService(c)
      .deleteLinktreeItem(params.data.id, params.data.itemId);
    if (!deleted) {
      return notFound(c, "링크 아이템을 찾을 수 없습니다.");
    }
    return noContent(c);
  });
};
