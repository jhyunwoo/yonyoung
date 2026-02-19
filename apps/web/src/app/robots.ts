import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/about/photographers",
          "/about/recruiting",
          "/archive",
          "/archive/records",
          "/archive/supporters",
          "/archive/exhibitions",
          "/donate",
          "/linktree",
        ],
        disallow: ["/admin", "/auth", "/api/internal"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
