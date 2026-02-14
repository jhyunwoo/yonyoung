import { Hono } from "hono";
import { z } from "zod";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  forbidden,
  noContent,
  notFound,
  ok,
} from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can } from "../lib/authorization/policy";

type App = Hono<HonoAppType>;

const idParamSchema = z.object({
  id: z.uuid("id 형식이 올바르지 않습니다."),
});

const adminUpdateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    nickname: z.string().nullable().optional(),
    image: z.string().url().nullable().optional(),
    role: z
      .enum(["president", "vice_president", "manager", "member", "user"])
      .optional(),
    generationId: z.uuid("generationId 형식이 올바르지 않습니다.").nullable().optional(),
  })
  .strict();

const memberProfileUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    nickname: z.string().nullable().optional(),
    image: z.string().url().nullable().optional(),
  })
  .strict();

export const registerUserRoutes = (app: App, dependencies: AppDependencies) => {
  app.get("/api/users", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    // member의 사용자 조회는 본인만 허용한다.
    if (can(actorResult.actor.role, "user", "read")) {
      const data = await dependencies.getDataService(c).listUsers();
      return ok(c, data);
    }

    if (actorResult.actor.role === "member") {
      const me = await dependencies.getDataService(c).getUserById(actorResult.actor.id);
      if (!me) {
        return notFound(c);
      }
      return ok(c, [me]);
    }

    return forbidden(c);
  });

  app.get("/api/users/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (!can(actorResult.actor.role, "user", "read") && !isSelf) {
      return forbidden(c);
    }
    if (actorResult.actor.role === "member" && !isSelf) {
      return forbidden(c, "부원은 본인 정보만 조회할 수 있습니다.");
    }

    const data = await dependencies.getDataService(c).getUserById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.patch("/api/users/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    const isAdminLike = can(actorResult.actor.role, "user", "update");

    if (isAdminLike) {
      const body = await parseBody(c, adminUpdateUserSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }
      const data = await dependencies
        .getDataService(c)
        .updateUser(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    }

    // member는 본인 프로필(name/nickname/image)만 수정 가능하다.
    if (actorResult.actor.role === "member" && isSelf) {
      const body = await parseBody(c, memberProfileUpdateSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }
      const data = await dependencies
        .getDataService(c)
        .updateUser(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      return ok(c, data);
    }

    return forbidden(c);
  });

  app.delete("/api/users/:id", async (c) => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, idParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (!can(actorResult.actor.role, "user", "delete")) {
      if (!(actorResult.actor.role === "member" && isSelf)) {
        return forbidden(c);
      }
    }

    const deleted = await dependencies.getDataService(c).deleteUser(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    return noContent(c);
  });
};
