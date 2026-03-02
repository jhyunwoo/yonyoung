import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_CACHE_TAGS } from "@/features/public/api/public-api";

type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];

const ALLOWED_TAGS: ReadonlySet<PublicCacheTag> = new Set(
  Object.values(PUBLIC_CACHE_TAGS),
);

const isAllowedTag = (tag: string): tag is PublicCacheTag =>
  ALLOWED_TAGS.has(tag as PublicCacheTag);

const readSecret = (request: NextRequest): string | null => {
  const headerSecret = request.headers.get("x-revalidate-secret")?.trim();
  if (headerSecret) {
    return headerSecret;
  }

  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();
  return querySecret || null;
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
  const configuredSecret = process.env.REVALIDATE_SECRET;
  const incomingSecret = readSecret(request);

  if (!configuredSecret || !incomingSecret || incomingSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { tags, path } = await parsePayload(request);
  const validTags = tags.filter(isAllowedTag);

  const revalidatedTags =
    validTags.length > 0 ? validTags : Array.from(ALLOWED_TAGS.values());

  for (const tag of revalidatedTags) {
    revalidateTag(tag, "max");
  }

  if (path) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidatedTags,
    revalidatedPath: path,
  });
}
