import type { Metadata } from "next";

const DEFAULT_PROD_SITE_URL = "https://yonyoung.moveto.kr";

export const resolveSiteUrl = (): string => {
  if (process.env.NODE_ENV !== "production") {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PROD_SITE_URL;
};

export const createPageMetadata = (input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata => {
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = new URL(input.path, siteUrl);

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: input.type ?? "website",
      locale: "ko_KR",
      url: canonicalUrl,
      title: input.title,
      description: input.description,
      siteName: "연영회",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
};
