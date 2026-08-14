import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode, Suspense } from "react";
import Script from "next/script";
import SiteHeader from "@/app/(home)/_components/site-header";
import SiteFooter from "@/app/(home)/_components/site-footer";
import PublicHeaderSafeArea from "@/app/(home)/_components/public-header-safe-area";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import { WebVitalsReporter } from "@/app/_components/web-vitals-reporter";

const ROOT_FONT_FAMILY =
  '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

// 이미지가 별도 오리진(Cloudflare R2 커스텀 도메인)에서 오므로 연결을 미리 열어 둔다
const IMAGE_CDN_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL?.trim() || null;

export const metadata: Metadata = createPageMetadata(PAGE_SEO.home);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * RootLayout 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  children,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {IMAGE_CDN_BASE_URL ? (
          <>
            <link rel="preconnect" href={IMAGE_CDN_BASE_URL} crossOrigin="" />
            <link rel="dns-prefetch" href={IMAGE_CDN_BASE_URL} />
          </>
        ) : null}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body
        className="min-h-screen bg-(--bg-primary) text-(--text-primary) antialiased"
        style={{ fontFamily: ROOT_FONT_FAMILY }}
      >
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>
        <Suspense
          fallback={
            <div
              className="h-(--public-header-height-mobile) md:h-(--public-header-height-desktop)"
              aria-hidden="true"
            />
          }
        >
          <SiteHeader />
        </Suspense>
        <main>
          <PublicHeaderSafeArea>{children}</PublicHeaderSafeArea>
        </main>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
