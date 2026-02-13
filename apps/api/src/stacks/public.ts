import { OpenAPIHono } from "@hono/zod-openapi";
import { ContentRepository, type AppContextEnv } from "@yonyoung/db";
import { fail, ok } from "../lib/http";
import { bustPrefix, readThroughJsonCache } from "../lib/cache";
import { publicRoutes } from "../openapi/routes";

export const publicStack = new OpenAPIHono<AppContextEnv>()
  .openapi(publicRoutes.getHero, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const data = await readThroughJsonCache(c.env, "public:hero", 60, () => repo.getHero());
    return ok(c, data);
  })
  .openapi(publicRoutes.listActivities, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const data = await readThroughJsonCache(c.env, "public:activities", 60, () => repo.listActivities(200));
    return ok(c, data);
  })
  .openapi(publicRoutes.getActivity, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const item = await repo.getActivity(id);
    if (!item) return fail(c, 404, "Activity not found");
    return ok(c, item);
  })
  .openapi(publicRoutes.listExhibitions, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const data = await readThroughJsonCache(c.env, "public:exhibitions", 60, () => repo.listExhibitions(200));
    return ok(c, data);
  })
  .openapi(publicRoutes.getExhibition, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const id = Number(c.req.valid("param").id);
    const item = await repo.getExhibition(id);
    if (!item) return fail(c, 404, "Exhibition not found");
    return ok(c, item);
  })
  .openapi(publicRoutes.listPhotographers, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const data = await readThroughJsonCache(c.env, "public:photographers", 60, () => repo.listPhotographerGroups());
    return ok(c, data);
  })
  .openapi(publicRoutes.listLinks, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const data = await readThroughJsonCache(c.env, "public:linktree", 60, () => repo.listLinks());
    return ok(c, data);
  })
  .openapi(publicRoutes.getPage, async (c) => {
    const repo = new ContentRepository(c.env.DB);
    const slug = c.req.valid("param").slug;
    const page = await repo.getPage(slug);
    if (!page) return fail(c, 404, "Page not found");
    return ok(c, page);
  });

// Keep named exports for explicit stack composition in app.ts
export async function bustPublicCachePrefix(env: AppContextEnv["Bindings"], prefix: string) {
  await bustPrefix(env, prefix);
}
