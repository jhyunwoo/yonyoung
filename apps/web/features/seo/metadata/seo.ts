import type { Metadata } from "next";

const DEFAULT_PROD_SITE_URL = "https://yonyoung.yonsei.ac.kr";

export type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
};

export const resolveSiteUrl = (): string => {
  if (process.env.NODE_ENV !== "production") {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PROD_SITE_URL;
};

/**
 * createPageMetadata 공개 페이지의 공통 메타데이터를 만듭니다.
 * @param input 페이지 제목·설명·경로와 선택적 키워드·OG 타입입니다.
 * @returns Next.js `Metadata` 객체를 반환합니다.
 * @remarks `openGraph.images`를 일부러 비워 둡니다. 이 값이 채워져 있으면 Next.js가
 *   세그먼트의 `opengraph-image` 파일 컨벤션을 무시하기 때문입니다. 이미지는 각
 *   라우트의 `opengraph-image.tsx`가 빌드 시점에 PNG로 구워 제공하고, `twitter:image`는
 *   `twitter.images`가 비어 있을 때 Next.js가 OG 이미지로 자동 채웁니다.
 */
export const createPageMetadata = (input: PageMetadataInput): Metadata => {
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = new URL(input.path, siteUrl);

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.webmanifest",
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
