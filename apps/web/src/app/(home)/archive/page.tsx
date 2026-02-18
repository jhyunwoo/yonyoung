import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import {
  listPublicActivities,
  listPublicExhibitions,
  listPublicSupporters,
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
  const [activities, supporters, exhibitions] = await Promise.all([
    safeList(listPublicActivities, []),
    safeList(listPublicSupporters, []),
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
        eyebrow="Records"
        title="활동 기록"
        description="프리뷰의 records 구성을 현재 아카이브 디자인에 맞춰 반영했습니다."
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
        eyebrow="Supporters"
        title="서포터즈"
        description="연영회의 활동을 함께 만들어가는 파트너입니다."
        className="bg-(--surface-elevated)/60"
      >
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="archive-supporters"
        >
          {supporters.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              공개된 서포터즈 정보가 없습니다.
            </div>
          ) : (
            supporters.map((supporter, index) => (
              <MotionReveal key={supporter.id} delay={index * 0.03}>
                <a
                  href={supporter.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--accent)"
                  data-testid={`archive-supporter-card-${supporter.id}`}
                >
                  <div className="mb-4 flex h-12 items-center justify-center rounded-xl bg-(--surface-muted) px-3">
                    <img
                      src={supporter.logoUrl}
                      alt={supporter.name}
                      className="max-h-8 w-auto object-contain"
                    />
                  </div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {supporter.name}
                  </p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    만료일 {formatDate(supporter.expiresAt)}
                  </p>
                </a>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Exhibitions"
        title="전시 아카이브"
        description="프리뷰의 exhibitions 구성을 현재 전시 카드 레이아웃에 맞춰 제공합니다."
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
