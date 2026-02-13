import { OpenAPIHono } from "@hono/zod-openapi";
import { ContentRepository, type AppContextEnv } from "@yonyoung/db";
import { requireAdmin } from "../lib/auth";
import { bustPrefix } from "../lib/cache";
import { fail, ok } from "../lib/http";
import { uploadImage } from "../lib/upload";
import { adminRoutes } from "../openapi/routes";

const adminRouter = new OpenAPIHono<AppContextEnv>();
adminRouter.use("*", requireAdmin);

export const adminStack = adminRouter
  .openapi(adminRoutes.uploadAsset, async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const entity = String(formData.get("entity") ?? "general");

    if (!(file instanceof File)) {
      return fail(c, 400, "file is required");
    }

    const uploaded = await uploadImage(c.env, file, entity);
    await c.env.DB
      .prepare("INSERT INTO assets (key, url, mime_type, size, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(uploaded.key, uploaded.url, uploaded.mimeType, uploaded.size, null, new Date().toISOString())
      .run();

    return ok(c, uploaded, 201);
  })
  .openapi(adminRoutes.createActivity, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const body = c.req.valid("json");
    const created = await repo.createActivity(body);
    await bustPrefix(c.env, "public:activities");
    return ok(c, created, 201);
  })
  .openapi(adminRoutes.updateActivity, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const body = c.req.valid("json");
    const updated = await repo.updateActivity(id, body);
    if (!updated) return fail(c, 404, "Activity not found");
    await bustPrefix(c.env, "public:activities");
    return ok(c, updated);
  })
  .openapi(adminRoutes.deleteActivity, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const deleted = await repo.deleteActivity(id);
    if (!deleted) return fail(c, 404, "Activity not found");
    await bustPrefix(c.env, "public:activities");
    return ok(c, { deleted: true as const });
  })
  .openapi(adminRoutes.createExhibition, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const body = c.req.valid("json");
    const created = await repo.createExhibition(body);
    await bustPrefix(c.env, "public:exhibitions");
    return ok(c, created, 201);
  })
  .openapi(adminRoutes.updateExhibition, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const body = c.req.valid("json");
    const updated = await repo.updateExhibition(id, body);
    if (!updated) return fail(c, 404, "Exhibition not found");
    await bustPrefix(c.env, "public:exhibitions");
    return ok(c, updated);
  })
  .openapi(adminRoutes.deleteExhibition, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const deleted = await repo.deleteExhibition(id);
    if (!deleted) return fail(c, 404, "Exhibition not found");
    await bustPrefix(c.env, "public:exhibitions");
    return ok(c, { deleted: true as const });
  })
  .openapi(adminRoutes.createPhotographer, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const body = c.req.valid("json");
    const created = await repo.createPhotographer(body);
    await bustPrefix(c.env, "public:photographers");
    return ok(c, created, 201);
  })
  .openapi(adminRoutes.updatePhotographer, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const body = c.req.valid("json");
    const updated = await repo.updatePhotographer(id, body);
    if (!updated) return fail(c, 404, "Photographer not found");
    await bustPrefix(c.env, "public:photographers");
    return ok(c, updated);
  })
  .openapi(adminRoutes.deletePhotographer, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const deleted = await repo.deletePhotographer(id);
    if (!deleted) return fail(c, 404, "Photographer not found");
    await bustPrefix(c.env, "public:photographers");
    return ok(c, { deleted: true as const });
  })
  .openapi(adminRoutes.createLink, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const body = c.req.valid("json");
    const created = await repo.createLink(body);
    await bustPrefix(c.env, "public:linktree");
    return ok(c, created, 201);
  })
  .openapi(adminRoutes.updateLink, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const body = c.req.valid("json");
    const updated = await repo.updateLink(id, body);
    if (!updated) return fail(c, 404, "Link not found");
    await bustPrefix(c.env, "public:linktree");
    return ok(c, updated);
  })
  .openapi(adminRoutes.deleteLink, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const deleted = await repo.deleteLink(id);
    if (!deleted) return fail(c, 404, "Link not found");
    await bustPrefix(c.env, "public:linktree");
    return ok(c, { deleted: true as const });
  })
  .openapi(adminRoutes.updatePage, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const slug = c.req.valid("param").slug;
    const body = c.req.valid("json");
    const updated = await repo.updatePage(slug, body);
    if (!updated) return fail(c, 404, "Page not found");
    await bustPrefix(c.env, `public:pages:${slug}`);
    return ok(c, updated);
  })
  .openapi(adminRoutes.updateHero, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const body = c.req.valid("json");
    const updated = await repo.updateHero(body);
    await bustPrefix(c.env, "public:hero");
    return ok(c, updated);
  });
