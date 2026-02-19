import type { Metadata } from "next";
import Image from "next/image";
import MotionReveal from "../../components/motion-reveal";
import {
  listPublicActivities,
  safeList,
} from "../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../lib/image-utils";
import { createPageMetadata } from "../../../../lib/seo";
import ArchiveSubNav from "../components/archive-subnav";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatDate = (value: number): string =>
  dateFormatter.format(value).replaceAll(" ", "").replace(/\.$/, "");

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 | 연영회",
  description: "연영회의 활동 기록을 사진 중심 아카이브로 확인하세요.",
  path: "/archive/records",
  keywords: ["연영회 활동 기록", "사진 동아리 활동", "연세대 연영회 아카이브"],
});

/**
 * ArchiveRecordsPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function ArchiveRecordsPage() {
  const activities = await safeList(listPublicActivities, []);

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-6 pt-14 md:px-6 md:pb-8 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Archive
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              활동 기록
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회의 현장과 순간을 사진으로 정리한 기록입니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <ArchiveSubNav active="records" />

      <section className="px-4 pb-12 md:px-6 md:pb-16">
        <div
          className="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="archive-records-grid"
        >
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              공개된 활동 기록이 없습니다.
            </div>
          ) : (
            activities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.03}>
                <article
                  className="group relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated)"
                  data-testid={`archive-record-card-${activity.id}`}
                >
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/80">
                        {formatDate(activity.activityDate)}
                      </p>
                      <h2 className="font-display text-2xl text-white">{activity.title}</h2>
                    </div>
                  </div>
                </article>
              </MotionReveal>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
