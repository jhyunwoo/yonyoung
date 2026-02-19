import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicActivityById } from "../../../../../lib/public-api";
import { formatKoreanDateCompact } from "../../../../../lib/date-formatters";
import { shouldUseUnoptimizedImage } from "../../../../../lib/image-utils";
import { createPageMetadata } from "../../../../../lib/seo";
import styles from "./record-detail.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 상세 | 연영회",
  description: "연영회 활동 기록 상세를 확인하세요.",
  path: "/archive/records",
});

type RecordDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecordDetailPage({ params }: RecordDetailPageProps) {
  const { id } = await params;
  const activity = await getPublicActivityById(id).catch(() => null);

  if (!activity) {
    notFound();
  }

  const imageUrls =
    activity.detailImages.length > 0
      ? activity.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => image.imageUrl)
      : [activity.coverImageUrl];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/archive/records" className={styles.backLink}>
            활동 기록으로 돌아가기
          </Link>
          <h1>{activity.title}</h1>
          <p className={styles.date}>{formatKoreanDateCompact(activity.activityDate)}</p>
          <p className={styles.description}>{activity.description}</p>
        </header>

        <section className={styles.gallery} data-testid="record-detail-gallery">
          {imageUrls.map((imageUrl, index) => (
            <div key={`${activity.id}-${imageUrl}-${index}`} className={styles.imageFrame}>
              <Image
                src={imageUrl}
                alt={`${activity.title} 상세 이미지 ${index + 1}`}
                fill
                unoptimized={shouldUseUnoptimizedImage(imageUrl)}
                className={styles.image}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
