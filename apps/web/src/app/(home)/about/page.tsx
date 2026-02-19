import type { Metadata } from "next";
import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import { listPublicGenerations, safeList } from "../../../lib/public-api";
import { createPageMetadata } from "../../../lib/seo";

const yearFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric" });

const annualActivities = [
  { month: "March", title: "리크루팅" },
  { month: "May", title: "연세대학교 대동제 보도 사진전" },
  { month: "June", title: "MT" },
  { month: "August", title: "정기 사진전" },
  { month: "October", title: "정기연고전 보도 사진전" },
  { month: "February", title: "신인 사진전" },
];

const formatYearRange = (startDate: number, endDate: number): string => {
  return `${yearFormatter.format(startDate)} - ${yearFormatter.format(endDate)}`;
};

export const metadata: Metadata = createPageMetadata({
  title: "연영회 소개 | 연세대학교 중앙사진동아리",
  description:
    "1966년부터 이어진 연세대학교 중앙사진동아리 연영회의 역사, 연간 활동, 기수 정보를 소개합니다.",
  path: "/about",
  keywords: ["연영회 소개", "연영회 역사", "연세대학교 동아리", "사진 동아리 활동"],
});

/**
 * AboutPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AboutPage() {
  const generations = await safeList(listPublicGenerations, []);
  const splitIndex = Math.ceil(annualActivities.length / 2);
  const activityColumns = [
    annualActivities.slice(0, splitIndex),
    annualActivities.slice(splitIndex),
  ];

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-10 pt-14 md:px-6 md:pb-14 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 shadow-[0_20px_70px_-42px_var(--shadow-strong)] md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              About YeonYoungHoe
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              카메라를 넘어 시선을 나누는 동아리
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회는 1966년부터 이어진 연세대학교 중앙사진동아리입니다. 사진을
              통해 사회와 학교, 그리고 서로의 순간을 기록하며 정기전과 프로젝트를
              이어갑니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <SectionShell
        eyebrow="Introduction"
        title="연영회 소개"
        description="사진을 통해 세상을 기록하고 표현하며 함께 성장하는 중앙사진동아리입니다."
      >
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6">
            <p className="text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회는 서로의 시선과 결과물을 공유하며 사진의 깊이를 넓혀가는
              공동체입니다. 학기 중에는 촬영 실습, 출사, 워크숍, 전시 준비를
              이어가고, 정기전과 프로젝트를 통해 학교와 사회의 장면을 기록합니다.
            </p>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell
        eyebrow="Annual Activities"
        title="연간 활동"
        description="프리뷰 사이트의 활동 구조를 현재 디자인에 맞춰 반영했습니다."
      >
        <div
          className="grid gap-4 md:grid-cols-2"
          data-testid="about-annual-activities"
        >
          {activityColumns.map((column, columnIndex) => (
            <MotionReveal key={`about-activity-column-${columnIndex}`} delay={columnIndex * 0.05}>
              <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
                <div className="space-y-4">
                  {column.map((activity, activityIndex) => (
                    <div
                      key={`${activity.month}-${activity.title}`}
                      className={[
                        "flex items-start gap-3",
                        activityIndex === column.length - 1
                          ? ""
                          : "border-b border-(--surface-border) pb-4",
                      ].join(" ")}
                    >
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-(--accent)" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                          {activity.month}
                        </p>
                        <p className="mt-1 text-sm font-medium text-(--text-primary)">
                          {activity.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </MotionReveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="History"
        title="연영회의 발자취"
        description="창단 연혁과 기수 데이터를 함께 확인할 수 있습니다."
      >
        <div
          className="relative border-l border-(--surface-border) pl-5 md:pl-8"
          data-testid="about-history"
        >
          <MotionReveal className="mb-6">
            <article className="relative rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
              <span className="absolute -left-[2.15rem] top-6 h-3 w-3 rounded-full bg-(--accent) md:-left-[2.7rem]" />
              <p className="text-sm font-semibold text-(--text-primary)">1966</p>
              <p className="mt-1 text-sm text-(--text-secondary)">
                연세대학교 중앙사진동아리 연영회 창단
              </p>
            </article>
          </MotionReveal>

          {generations.map((generation, index) => (
            <MotionReveal key={generation.id} delay={index * 0.04} className="mb-4">
              <article
                className="relative rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5"
                data-testid={`about-generation-card-${generation.id}`}
              >
                <span className="absolute -left-[2.15rem] top-6 h-3 w-3 rounded-full bg-(--surface-border) md:-left-[2.7rem]" />
                <p className="text-sm font-semibold text-(--text-primary)">
                  {generation.name}
                </p>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  {formatYearRange(generation.startDate, generation.endDate)}
                </p>
              </article>
            </MotionReveal>
          ))}

          {generations.length === 0 ? (
            <MotionReveal>
              <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 text-sm text-(--text-secondary)">
                공개된 기수 정보가 없습니다.
              </article>
            </MotionReveal>
          ) : null}
        </div>
      </SectionShell>
    </div>
  );
}
