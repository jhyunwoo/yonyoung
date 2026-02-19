import type { Metadata } from "next";
import Image from "next/image";
import MotionReveal from "../../components/motion-reveal";
import {
  listPublicExhibitions,
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
  title: "전시 아카이브 | 연영회",
  description: "연영회의 전시 기록을 일정, 장소, 이미지와 함께 확인하세요.",
  path: "/archive/exhibitions",
  keywords: ["연영회 전시", "연영회 전시 아카이브", "대학생 사진 전시"],
});

/**
 * ArchiveExhibitionsPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function ArchiveExhibitionsPage() {
  const exhibitions = await safeList(listPublicExhibitions, []);

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-6 pt-14 md:px-6 md:pb-8 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Archive
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              전시 아카이브
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회의 전시를 기간과 장소 기준으로 확인할 수 있습니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <ArchiveSubNav active="exhibitions" />

      <section className="px-4 pb-12 md:px-6 md:pb-16">
        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2" data-testid="archive-exhibitions-grid">
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
                    <p className="line-clamp-4 text-sm leading-relaxed text-(--text-secondary)">
                      {exhibition.description}
                    </p>
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
