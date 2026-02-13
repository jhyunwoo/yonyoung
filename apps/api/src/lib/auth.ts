import type { MiddlewareHandler } from "hono";
import { createAuth } from "@yonyoung/auth/server";
import { ContentRepository } from "@yonyoung/db";
import type { AppContextEnv } from "@yonyoung/db";

function isAllowlisted(email: string, allowlistRaw: string | undefined) {
  if (!allowlistRaw) return false;
  const allowlist = allowlistRaw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase());
}

export const requireAdmin: MiddlewareHandler<AppContextEnv> = async (c, next) => {
  const auth = createAuth(c.env);
  const repo = new ContentRepository(c.env.DB);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user?.id) {
    return c.json({ error: { message: "Unauthorized" } }, 401);
  }

  const userId = String(session.user.id);
  const email = String(session.user.email ?? "");

  let role = await repo.getAdminRole(userId);

  if (!role && isAllowlisted(email, c.env.ADMIN_ALLOWLIST_EMAILS)) {
    await repo.upsertAdminRole(userId, "SUPER_ADMIN");
    role = "SUPER_ADMIN";
  }

  if (!role) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  await next();
};
