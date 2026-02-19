import type { Metadata } from "next";
import MotionReveal from "../../components/motion-reveal";
import SupporterGrid from "../../components/supporter-grid";
import {
  listPublicSupporters,
  safeList,
} from "../../../../lib/public-api";
import { createPageMetadata } from "../../../../lib/seo";
import ArchiveSubNav from "../components/archive-subnav";

export const metadata: Metadata = createPageMetadata({
  title: "서포터즈 | 연영회",
  description: "연영회의 활동과 전시를 함께 만들어가는 서포터즈를 소개합니다.",
  path: "/archive/supporters",
  keywords: ["연영회 서포터즈", "연영회 후원사", "사진 동아리 파트너"],
});

/**
 * ArchiveSupportersPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function ArchiveSupportersPage() {
  const supporters = await safeList(listPublicSupporters, []);

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-6 pt-14 md:px-6 md:pb-8 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Archive
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              서포터즈
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회의 활동을 함께 만드는 파트너를 소개합니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <ArchiveSubNav active="supporters" />

      <section className="bg-(--surface-elevated)/60 px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-6xl" data-testid="archive-supporters-section">
          <SupporterGrid
            supporters={supporters}
            emptyMessage="준비 중입니다."
            containerTestId="archive-supporters-grid"
            cardTestIdPrefix="archive-supporter-card"
            showExpiresAt
          />
        </div>
      </section>
    </div>
  );
}
