import type { Metadata } from "next";
import { createPageMetadata } from "../../../lib/seo";
import styles from "./donate.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "DONATE US | 연영회",
  description: "연영회 후원 안내, 후원 방법, 후원금 사용 내역, 문의 정보를 확인하세요.",
  path: "/donate",
  keywords: ["연영회 후원", "DONATE US", "연영회 후원 안내", "후원금 사용 내역"],
});

export default function DonatePage() {
  return (
    <div className={styles.donatePage}>
      <div className={styles.container}>
        <section className={styles.donateHero}>
          <h1>DONATE US</h1>
          <p className={styles.subtitle}>연영회 후원 안내</p>
        </section>

        <section className={styles.donateContent}>
          <div className={styles.donateSection}>
            <h2>후원 안내</h2>
            <p>
              연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다. 후원금은 전시회 개최,
              장비 구매, 워크샵 운영 등에 사용됩니다.
            </p>
          </div>

          <div className={styles.donateSection}>
            <h2>후원 방법</h2>
            <div className={styles.donateMethods}>
              <div className={styles.donateMethod}>
                <h3>계좌 이체</h3>
                <div className={styles.accountInfo}>
                  <p>은행: 예시은행</p>
                  <p>계좌번호: 123-456-789012</p>
                  <p>예금주: 연영회</p>
                </div>
              </div>
              <div className={styles.donateMethod}>
                <h3>온라인 후원</h3>
                <p>온라인 후원 시스템을 통해 후원하실 수 있습니다.</p>
                <button type="button" className={styles.donateButton}>
                  후원하기
                </button>
              </div>
            </div>
          </div>

          <div className={styles.donateSection}>
            <h2>후원금 사용 내역</h2>
            <div className={styles.usageList}>
              <div className={styles.usageItem}>
                <h4>전시회 개최</h4>
                <p>갤러리 대관 및 전시 준비 비용</p>
              </div>
              <div className={styles.usageItem}>
                <h4>장비 구매</h4>
                <p>카메라, 렌즈 등 촬영 장비 구매</p>
              </div>
              <div className={styles.usageItem}>
                <h4>워크샵 운영</h4>
                <p>사진 기술 교육 및 워크샵 비용</p>
              </div>
            </div>
          </div>

          <div className={styles.donateSection}>
            <h2>문의</h2>
            <p>후원 관련 문의사항이 있으시면 언제든지 연락주세요.</p>
            <div className={styles.contactInfo}>
              <p>이메일: donate@yeonyeonghoe.com</p>
              <p>전화: 010-0000-0000</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
