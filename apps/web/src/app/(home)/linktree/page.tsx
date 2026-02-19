import type { Metadata } from "next";
import { listPublicLinktrees, safeList } from "../../../lib/public-api";
import { createPageMetadata } from "../../../lib/seo";
import styles from "./linktree.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "LINKTREE | 연영회",
  description: "연영회 공식 SNS, 문의 채널, 활동 관련 외부 링크를 한 곳에서 확인하세요.",
  path: "/linktree",
  keywords: ["연영회 링크", "연영회 SNS", "연영회 문의", "Linktree"],
});

export default async function LinktreePage() {
  const linktrees = await safeList(listPublicLinktrees, []);

  return (
    <div className={styles.linktreePage}>
      <div className={styles.container}>
        <header className={styles.linktreeHeader}>
          <div className={styles.headerTitleRow}>
            <h1>LINKTREE</h1>
          </div>
          <p className={styles.subtitle}>연영회 공식 채널 및 서비스</p>
        </header>

        <section className={styles.linktreeColumns} data-testid="linktree-groups">
          {linktrees.length === 0 ? (
            <div className={styles.linkColumn}>
              <h2 className={styles.columnTitle}>링크</h2>
              <div className={styles.emptyCategory}>
                <span>준비 중입니다.</span>
              </div>
            </div>
          ) : (
            linktrees.map((group) => (
              <article
                key={group.id}
                className={styles.linkColumn}
                data-testid={`linktree-group-card-${group.id}`}
              >
                <h2 className={styles.columnTitle}>{group.name}</h2>
                <div className={styles.columnLinks}>
                  {group.items.length > 0 ? (
                    group.items.map((item) => (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkCard}
                        data-testid={`linktree-item-card-${item.id}`}
                      >
                        <span className={styles.linkName}>{item.name}</span>
                      </a>
                    ))
                  ) : (
                    <div className={styles.emptyCategory}>
                      <span>준비 중입니다.</span>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
