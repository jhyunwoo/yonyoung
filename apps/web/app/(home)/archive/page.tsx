import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";

export const metadata: Metadata = createPageMetadata(PAGE_SEO.archive);

export default function ArchiveRootPage() {
  redirect("/archive/records");
}
