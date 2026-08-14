import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgCard } from "@/features/seo/og/og-card";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";

export const alt = PAGE_SEO.archiveRecords.title;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpenGraphImage() {
  return renderOgCard({
    title: PAGE_SEO.archiveRecords.title,
    description: PAGE_SEO.archiveRecords.description,
  });
}
