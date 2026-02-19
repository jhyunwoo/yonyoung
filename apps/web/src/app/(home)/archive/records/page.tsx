import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listPublicActivities, safeList } from "../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../lib/image-utils";
import { createPageMetadata } from "../../../../lib/seo";
import styles from "./records.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatDate = (value: number): string =>
  dateFormatter.format(value).replaceAll(" ", "").replace(/\.$/, "");

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 | 연영회",
  description: "연영회의 활동 기록을 사진 중심 아카이브로 확인하세요.",
  path: "/archive/records",
  keywords: ["연영회 활동 기록", "사진 동아리 활동", "연세대 연영회 아카이브"],
});

export default async function ArchiveRecordsPage() {
  const activities = await safeList(listPublicActivities, []);

  return (
    <div className={styles.archivePage}>
      <div className={styles.archiveHeader}>
        <div className={styles.container}>
          <h1>활동 기록</h1>
        </div>
      </div>

      <div className={styles.galleryContainer}>
        {activities.length === 0 ? (
          <div className={styles.emptyGallery}>
            <p>준비 중입니다.</p>
          </div>
        ) : (
          <div className={styles.imageGrid} data-testid="archive-records-grid">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/archive/records/${activity.id}`}
                className={styles.gridItem}
                data-testid={`archive-record-card-${activity.id}`}
                aria-label={`${activity.title} 상세 보기`}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={activity.coverImageUrl}
                    alt={activity.title}
                    fill
                    unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className={styles.image}
                  />
                </div>
                <div className={styles.imageOverlay}>
                  <div className={styles.titleContainer}>
                    <h3>{activity.title}</h3>
                    <span className={styles.imageDate}>{formatDate(activity.activityDate)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
