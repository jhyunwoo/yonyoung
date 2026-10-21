import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        // 공개 이미지는 /api/public/media 프록시로 나간다(구조화 데이터 image 포함).
        // 더 긴 Allow 규칙이 Disallow: /api/ 보다 우선한다.
        allow: ["/", "/api/public/media/"],
        disallow: "/api/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
