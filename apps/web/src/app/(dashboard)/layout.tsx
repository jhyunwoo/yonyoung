import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";

import { createPageMetadata } from "../../lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "연영회",
  description: "연세대학교 중앙 사진동아리",
  path: "/",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
