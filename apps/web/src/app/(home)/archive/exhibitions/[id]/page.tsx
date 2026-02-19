import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicExhibitionById } from "../../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../../lib/image-utils";
import { createPageMetadata } from "../../../../../lib/seo";
import styles from "./exhibition-detail.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatDate = (value: number): string =>
  dateFormatter.format(value).replaceAll(" ", "").replace(/\.$/, "");

export const metadata: Metadata = createPageMetadata({
  title: "전시 아카이브 상세 | 연영회",
  description: "연영회 전시 아카이브 상세를 확인하세요.",
  path: "/archive/exhibitions",
});

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExhibitionDetailPage({
  params,
}: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await getPublicExhibitionById(id).catch(() => null);

  if (!exhibition) {
    notFound();
  }

  const imageUrls =
    exhibition.detailImages.length > 0
      ? exhibition.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => image.imageUrl)
      : [exhibition.coverImageUrl];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/archive/exhibitions" className={styles.backLink}>
            전시 아카이브로 돌아가기
          </Link>
          <h1>{exhibition.title}</h1>
          <p className={styles.date}>
            {formatDate(exhibition.startDate)} ~ {formatDate(exhibition.endDate)}
          </p>
          <p className={styles.location}>{exhibition.place}</p>
          <p className={styles.description}>{exhibition.description}</p>
        </header>

        <section className={styles.gallery} data-testid="exhibition-detail-gallery">
          {imageUrls.map((imageUrl, index) => (
            <div key={`${exhibition.id}-${imageUrl}-${index}`} className={styles.imageFrame}>
              <Image
                src={imageUrl}
                alt={`${exhibition.title} 상세 이미지 ${index + 1}`}
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
