import type { Metadata } from "next";
import "./globals.css";
import { ReactNode, Suspense } from "react";
import Script from "next/script";
import SiteHeader from "./components/site-header";
import SiteFooter from "./components/site-footer";
import { createPageMetadata } from "../../lib/seo";
import { WebVitalsReporter } from "../_components/web-vitals-reporter";

export const metadata: Metadata = createPageMetadata({
  title: "연영회 | 연세대학교 중앙사진동아리",
  description: "연세대학교 중앙사진동아리 연영회의 활동과 전시를 소개합니다.",
  path: "/",
  keywords: [
    "연영회",
    "연세대학교",
    "중앙사진동아리",
    "사진동아리",
    "정기전",
    "아카이브",
  ],
});

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
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-(--bg-primary) text-(--text-primary) antialiased">
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>
        <Suspense fallback={<div className="h-[72px]" aria-hidden="true" />}>
          <SiteHeader />
        </Suspense>
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
