import type { Metadata } from "next";
import Script from "next/script";
import "./(home)/globals.css";
import HomeNotFoundPage from "@/app/(home)/not-found";

// 루트 레이아웃이 (home)·(dashboard) 둘이라 어느 라우트에도 맞지 않는 주소는
// 레이아웃 없이 여기로 온다. 그래서 html/body·전역 스타일·테마를 직접 갖춘다.
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 | 연영회",
  description: "주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.",
};

export default function GlobalNotFound() {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-(--bg-primary) text-(--text-primary) antialiased">
        <main>
          <HomeNotFoundPage />
        </main>
      </body>
    </html>
  );
}
