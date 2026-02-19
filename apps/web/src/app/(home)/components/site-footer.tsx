import Image from "next/image";
import styles from "./site-footer.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer} data-testid="public-footer">
      <div className={styles.container}>
        <div className={styles.footerTop}>
          <div className={styles.logo}>
            <div className={styles.logoImage}>
              <Image
                src="/yonyong-logo-white.png"
                alt="연영회 로고"
                width={40}
                height={40}
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className={styles.logoText}>
              <span>연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerInfoGrid}>
            <div className={styles.footerInfoItem}>
              <span className={styles.infoLabel}>오픈 카톡방</span>
              <a
                href="https://open.kakao.com/o/snVWZ4th"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.infoContent}
              >
                https://open.kakao.com/o/snVWZ4th
              </a>
            </div>

            <div className={styles.footerInfoItem}>
              <span className={styles.infoLabel}>INSTAGRAM</span>
              <span className={styles.infoContent}>@yonyongpage</span>
            </div>

            <div className={styles.footerInfoItem}>
              <span className={styles.infoLabel}>E-mail</span>
              <a href="mailto:kimse0604@naver.com" className={styles.infoContent}>
                kimse0604@naver.com
              </a>
            </div>

            <div className={styles.footerInfoItem}>
              <span className={styles.infoLabel}>HP</span>
              <span className={styles.infoContent}>010-6814-1800</span>
            </div>

            <div className={styles.footerInfoItem}>
              <span className={styles.infoLabel}>주소</span>
              <span className={styles.infoContent}>
                서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
