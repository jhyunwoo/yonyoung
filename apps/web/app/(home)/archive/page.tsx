import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";

export const metadata: Metadata = createPageMetadata(PAGE_SEO.archive);

/**
 * ArchiveRootPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ArchiveRootPage() {
  redirect("/archive/records");
}
