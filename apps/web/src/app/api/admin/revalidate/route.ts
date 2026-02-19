import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminPage } from "../../../../lib/auth-shared";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { ADMIN_CACHE_TAG_VALUES, type AdminCacheTag } from "../../../../lib/admin-cache";

const ALLOWED_TAGS: ReadonlySet<AdminCacheTag> = new Set(ADMIN_CACHE_TAG_VALUES);

const isAllowedTag = (tag: string): tag is AdminCacheTag =>
  ALLOWED_TAGS.has(tag as AdminCacheTag);

const parsePayload = async (request: NextRequest): Promise<{
  tags: string[];
  path: string | null;
}> => {
  const payload = (await request.json().catch(() => ({}))) as {
    tags?: unknown;
    path?: unknown;
  };

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  const path = typeof payload.path === "string" ? payload.path : null;
  return { tags, path };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await serverAuthTool.getSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessAdminPage(session)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { tags, path } = await parsePayload(request);
  const validTags = tags.filter(isAllowedTag);

  const revalidatedTags =
    validTags.length > 0 ? validTags : Array.from(ALLOWED_TAGS.values());

  for (const tag of revalidatedTags) {
    revalidateTag(tag, "max");
  }

  if (path && path.startsWith("/admin")) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidatedTags,
    revalidatedPath: path,
  });
}

