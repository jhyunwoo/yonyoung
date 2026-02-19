import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listPublicExhibitions, safeList } from "../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../lib/image-utils";
import { createPageMetadata } from "../../../../lib/seo";
import styles from "./exhibitions.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatDate = (value: number): string =>
  dateFormatter.format(value).replaceAll(" ", "").replace(/\.$/, "");

export const metadata: Metadata = createPageMetadata({
  title: "전시회 | 연영회",
  description: "연영회의 전시 기록을 일정, 장소, 이미지와 함께 확인하세요.",
  path: "/archive/exhibitions",
  keywords: ["연영회 전시", "연영회 전시 아카이브", "대학생 사진 전시"],
});

export default async function ArchiveExhibitionsPage() {
  const exhibitions = await safeList(listPublicExhibitions, []);

  return (
    <div className={styles.exhibitionsPage}>
      <div className={styles.exhibitionsHeader}>
        <div className={styles.container}>
          <h1>전시회</h1>
        </div>
      </div>

      <div className={styles.exhibitionsContent}>
        <div className={styles.container}>
          {exhibitions.length === 0 ? (
            <div className={styles.emptyExhibitions}>
              <p>전시 정보가 없습니다.</p>
            </div>
          ) : (
            <section className={styles.exhibitionsGrid} data-testid="archive-exhibitions-grid">
              {exhibitions.map((exhibition) => (
                <Link
                  key={exhibition.id}
                  href={`/archive/exhibitions/${exhibition.id}`}
                  className={styles.exhibitionCard}
                  data-testid={`archive-exhibition-card-${exhibition.id}`}
                  aria-label={`${exhibition.title} 상세 보기`}
                >
                  <div className={styles.exhibitionImage}>
                    <Image
                      src={exhibition.coverImageUrl}
                      alt={exhibition.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(exhibition.coverImageUrl)}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={styles.image}
                    />
                  </div>
                  <div className={styles.exhibitionInfo}>
                    <h2>{exhibition.title}</h2>
                    <p className={styles.exhibitionDate}>
                      {formatDate(exhibition.startDate)} ~ {formatDate(exhibition.endDate)}
                    </p>
                    <p className={styles.exhibitionLocation}>{exhibition.place}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
