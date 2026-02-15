import { eq } from "drizzle-orm";
import { Context } from "hono";
import { normalizeRole } from "../authorization/policy";
import { Actor } from "../authorization/types";
import createDB from "../db";
import { user } from "../db/schema";
import { createAuth } from "../auth";
import HonoAppType from "../../types/honoAppType";

/**
 * Better Auth 세션 기반으로 현재 사용자 정보를 로드한다.
 * 권한 판정 정확도를 위해 role/generationId는 DB에서 다시 읽는다.
 */
export const getActorFromSession = async (
  c: Context<HonoAppType>,
): Promise<Actor | null> => {
  const auth = createAuth(c.env.db);
  const sessionResult = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionResult?.user?.id) {
    return null;
  }

  const db = createDB(c.env.db);
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, sessionResult.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      generationId: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    role: normalizeRole(dbUser.role),
    rawRole: dbUser.role ?? "unverified",
    name: dbUser.name,
    email: dbUser.email,
    generationId: dbUser.generationId,
  };
};
