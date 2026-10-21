import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";
import {
  listPublicActivities,
  listPublicExhibitions,
} from "@/features/public/services/public-read-service";

type StaticSitemapRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const STATIC_ROUTES: StaticSitemapRoute[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/about",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/about/photographers",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/about/recruiting",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/archive/records",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/archive/exhibitions",
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    path: "/linktree",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/donate",
    changeFrequency: "monthly",
    priority: 0.7,
  },
];

const toDate = (timestamp: number): Date => new Date(timestamp);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();
  const [activities, exhibitions] = await Promise.all([
    listPublicActivities(),
    listPublicExhibitions(),
  ]);

  // 목록·홈은 새 게시물이 붙을 때 바뀌므로 가장 최근 게시물의 수정 시각을 쓴다.
  // 나머지 정적 페이지는 게시물과 무관해 lastModified 를 비워 둔다.
  const latestActivity = Math.max(0, ...activities.map((activity) => activity.updatedAt));
  const latestExhibition = Math.max(
    0,
    ...exhibitions.map((exhibition) => exhibition.updatedAt),
  );
  const routeLastModified: Record<string, number> = {
    "/": Math.max(latestActivity, latestExhibition),
    "/archive/records": latestActivity,
    "/archive/exhibitions": latestExhibition,
  };

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => {
    const lastModified = routeLastModified[route.path];
    return {
      url: `${siteUrl}${route.path}`,
      ...(lastModified ? { lastModified: toDate(lastModified) } : {}),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    };
  });

  const activityEntries: MetadataRoute.Sitemap = activities.map((activity) => ({
    url: `${siteUrl}/archive/records/${activity.id}`,
    lastModified: toDate(activity.updatedAt),
    // 이미지 검색용 대표 사진. 서명 URL 은 키와 비밀값으로만 정해져 만료되지 않는다.
    images: [activity.coverImageUrl],
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const exhibitionEntries: MetadataRoute.Sitemap = exhibitions.map((exhibition) => ({
    url: `${siteUrl}/archive/exhibitions/${exhibition.id}`,
    lastModified: toDate(exhibition.updatedAt),
    images: [exhibition.coverImageUrl],
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...activityEntries, ...exhibitionEntries];
}
