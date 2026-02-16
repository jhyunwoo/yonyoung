import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import { listPublicGenerations, safeList } from "../../../lib/public-api";

const yearFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric" });

const formatYearRange = (startDate: number, endDate: number): string => {
  return `${yearFormatter.format(startDate)} - ${yearFormatter.format(endDate)}`;
};

/**
 * AboutPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AboutPage() {
  const generations = await safeList(listPublicGenerations, []);

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
        eyebrow="History"
        title="연영회의 발자취"
        description="기수 데이터와 함께 연영회의 흐름을 확인할 수 있습니다."
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
