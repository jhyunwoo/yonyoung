import { createServerApiClient } from "@/lib/api-client";
import { unwrapData } from "@/lib/api-result";
import about from "@/config/about.json";
import activities from "@/config/activities.json";
import exhibitions from "@/config/exhibitions.json";
import hero from "@/config/hero.json";
import linktree from "@/config/linktree.json";
import photographers from "@/config/photographers.json";
import { NextRequest, NextResponse } from "next/server";

const FALLBACK_MAP: Record<string, unknown> = {
  activities,
  exhibitions,
  photographers,
  linktree,
  hero,
  about,
  recruiting: {
    title: "RECRUITING",
    sections: []
  },
  donate: {
    title: "DONATE US",
    sections: []
  },
  supporters: {
    title: "서포터즈",
    sections: []
  }
};

function getLoader(type: string) {
  const client = createServerApiClient();

  const loaders: Record<string, () => Promise<unknown>> = {
    activities: () => unwrapData(client.v1.public.activities.$get()),
    exhibitions: () => unwrapData(client.v1.public.exhibitions.$get()),
    photographers: () => unwrapData(client.v1.public.photographers.$get()),
    linktree: () => unwrapData(client.v1.public.linktree.$get()),
    hero: () => unwrapData(client.v1.public.hero.$get()),
    about: () => unwrapData(client.v1.public.pages[":slug"].$get({ param: { slug: "about" } })),
    recruiting: () => unwrapData(client.v1.public.pages[":slug"].$get({ param: { slug: "recruiting" } })),
    donate: () => unwrapData(client.v1.public.pages[":slug"].$get({ param: { slug: "donate" } })),
    supporters: () => unwrapData(client.v1.public.pages[":slug"].$get({ param: { slug: "supporters" } }))
  };

  return loaders[type] ?? null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const params = await context.params;
  const loader = getLoader(params.type);

  if (!loader) {
    return NextResponse.json({ error: "Data not found" }, { status: 404 });
  }

  try {
    const data = await loader();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch {
    return NextResponse.json(FALLBACK_MAP[params.type] ?? { error: "Data not found" }, { status: 200 });
  }
}
