import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import {
  listPublicActivities,
  listPublicExhibitions,
  safeList,
} from "../../../lib/public-api";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (value: number): string => dateFormatter.format(value);

/**
 * ArchivePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function ArchivePage() {
  const [activities, exhibitions] = await Promise.all([
    safeList(listPublicActivities, []),
    safeList(listPublicExhibitions, []),
  ]);

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-8 pt-14 md:px-6 md:pb-12 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Archive
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              연영회의 활동과 전시 기록
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              축제, 출사, 워크숍, 정기전까지. 연영회의 사진 기반 활동을 모아둔
              아카이브입니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <SectionShell
        eyebrow="Activities"
        title="활동 기록"
        description="최근 활동 중심으로 정리된 기록입니다."
      >
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="archive-activities"
        >
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              공개된 활동 기록이 없습니다.
            </div>
          ) : (
            activities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.03}>
                <article
                  className="overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated)"
                  data-testid={`archive-activity-card-${activity.id}`}
                >
                  <div className="aspect-[4/3]">
                    <img
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                      {formatDate(activity.activityDate)}
                    </p>
                    <h2 className="font-display text-2xl text-(--text-primary)">
                      {activity.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">
                      {activity.description}
                    </p>
                  </div>
                </article>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Exhibitions"
        title="전시 아카이브"
        description="기수별 전시와 상세 정보를 확인할 수 있습니다."
        className="bg-(--surface-elevated)/60"
      >
        <div className="grid gap-4 md:grid-cols-2" data-testid="archive-exhibitions">
          {exhibitions.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              공개된 전시 정보가 없습니다.
            </div>
          ) : (
            exhibitions.map((exhibition, index) => (
              <MotionReveal key={exhibition.id} delay={index * 0.04}>
                <article
                  className="grid overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated) md:grid-cols-[0.46fr_0.54fr]"
                  data-testid={`archive-exhibition-card-${exhibition.id}`}
                >
                  <div className="aspect-[4/3] md:aspect-auto">
                    <img
                      src={exhibition.coverImageUrl}
                      alt={exhibition.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                      {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
                    </p>
                    <h2 className="font-display text-2xl text-(--text-primary)">
                      {exhibition.title}
                    </h2>
                    <p className="text-sm text-(--text-secondary)">{exhibition.place}</p>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">
                      {exhibition.description}
                    </p>
                  </div>
                </article>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>
    </div>
  );
}
