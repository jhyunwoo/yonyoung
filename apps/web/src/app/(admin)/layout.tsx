import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import Script from "next/script";
import { resolveSiteUrl } from "../../lib/seo";
import { WebVitalsReporter } from "../_components/web-vitals-reporter";

export const metadata: Metadata = {
  title: "연영회 관리자 페이지",
  description: "연세대학교 중앙동아리 연영회 관리자 페이지",
  metadataBase: new URL(resolveSiteUrl()),
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
