import type { Metadata } from "next";
import Image from "next/image";
import { listPublicSupporters, safeList } from "../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../lib/image-utils";
import { createPageMetadata } from "../../../../lib/seo";
import styles from "./supporters.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "서포터즈 | 연영회",
  description: "연영회의 활동과 전시를 함께 만들어가는 서포터즈를 소개합니다.",
  path: "/archive/supporters",
  keywords: ["연영회 서포터즈", "연영회 후원사", "사진 동아리 파트너"],
});

export default async function ArchiveSupportersPage() {
  const supporters = await safeList(listPublicSupporters, []);

  return (
    <div className={styles.supportersPage}>
      <div className={styles.container}>
        <header className={styles.supportersHeader}>
          <h1>서포터즈</h1>
        </header>

        <div className={styles.supportersContent}>
          {supporters.length === 0 ? (
            <div className={styles.emptyMessage}>준비 중입니다.</div>
          ) : (
            <div className={styles.supportersGrid} data-testid="archive-supporters-grid">
              {supporters.map((supporter) => (
                <a
                  key={supporter.id}
                  href={supporter.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.supporterCard}
                  data-testid={`archive-supporter-card-${supporter.id}`}
                >
                  <div className={styles.supporterLogo}>
                    <Image
                      src={supporter.logoUrl}
                      alt={supporter.name}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(supporter.logoUrl)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className={styles.logoImage}
                    />
                  </div>
                  <p className={styles.supporterName}>{supporter.name}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
