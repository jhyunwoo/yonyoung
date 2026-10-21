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

  // 정적 경로는 lastModified 를 비운다. 홈·목록은 링크트리 수정이나 게시물 삭제로도 바뀌는데
  // 그 시각을 다 추적할 수 없어, 게시물 시각으로 채우면 틀린 lastmod 가 된다(PR #20 리뷰).
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

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
