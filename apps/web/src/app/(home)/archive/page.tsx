import type { Metadata } from "next";
import Image from "next/image";
import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import SupporterGrid from "../components/supporter-grid";
import {
  listPublicActivities,
  listPublicExhibitions,
  listPublicSupporters,
  safeList,
} from "../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../lib/image-utils";
import { createPageMetadata } from "../../../lib/seo";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (value: number): string => dateFormatter.format(value);

export const metadata: Metadata = createPageMetadata({
  title: "활동 아카이브 | 연영회",
  description:
    "연영회의 활동 기록, 전시 아카이브, 후원사 정보를 한 곳에서 확인할 수 있습니다.",
  path: "/archive",
  keywords: ["연영회 아카이브", "연영회 전시", "연영회 활동", "사진 전시 기록"],
});

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
                    <Image
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      width={640}
                      height={480}
                      unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
        <SupporterGrid
          supporters={supporters}
          emptyMessage="공개된 서포터즈 정보가 없습니다."
          containerTestId="archive-supporters"
          cardTestIdPrefix="archive-supporter-card"
          showExpiresAt
        />
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
                    <Image
                      src={exhibition.coverImageUrl}
                      alt={exhibition.title}
                      width={720}
                      height={540}
                      unoptimized={shouldUseUnoptimizedImage(exhibition.coverImageUrl)}
                      sizes="(min-width: 768px) 46vw, 100vw"
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
