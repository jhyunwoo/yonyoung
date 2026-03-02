import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminPage } from "@/features/auth/model/auth-shared";
import { serverAuthTool } from "@/features/auth/server/auth-guard";
import { ADMIN_CACHE_TAG_VALUES, type AdminCacheTag } from "@/features/dashboard/cache/admin-cache";
import { PUBLIC_CACHE_TAGS } from "@/features/public/api/public-api";

const ALLOWED_TAGS: ReadonlySet<AdminCacheTag> = new Set(ADMIN_CACHE_TAG_VALUES);
type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];
type RevalidateTag = AdminCacheTag | PublicCacheTag;

const isAllowedTag = (tag: string): tag is AdminCacheTag =>
  ALLOWED_TAGS.has(tag as AdminCacheTag);

const PUBLIC_TAGS_BY_ADMIN_TAG: Record<AdminCacheTag, PublicCacheTag[]> = {
  "admin:activities": [PUBLIC_CACHE_TAGS.activities],
  "admin:exhibitions": [PUBLIC_CACHE_TAGS.exhibitions],
  "admin:generations": [PUBLIC_CACHE_TAGS.generations, PUBLIC_CACHE_TAGS.photographers],
  "admin:linktree": [PUBLIC_CACHE_TAGS.linktree],
  "admin:market": [],
  "admin:notices": [],
  "admin:recruiting-plan": [PUBLIC_CACHE_TAGS.recruitingPlan],
  "admin:site-settings": [PUBLIC_CACHE_TAGS.siteSettings],
  "admin:users": [PUBLIC_CACHE_TAGS.photographers],
};

const expandWithPublicTags = (
  adminTags: readonly AdminCacheTag[],
): RevalidateTag[] => {
  const expanded = new Set<RevalidateTag>(adminTags);
  for (const adminTag of adminTags) {
    const relatedPublicTags = PUBLIC_TAGS_BY_ADMIN_TAG[adminTag] ?? [];
    for (const publicTag of relatedPublicTags) {
      expanded.add(publicTag);
    }
  }
  return Array.from(expanded);
};

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

  const targetAdminTags =
    validTags.length > 0 ? validTags : Array.from(ALLOWED_TAGS.values());
  const revalidatedTags = expandWithPublicTags(targetAdminTags);

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
