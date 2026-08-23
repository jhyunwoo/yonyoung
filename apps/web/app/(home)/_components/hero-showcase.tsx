import Image from "next/image";
import Link from "next/link";
import type { ApiActivity, ApiExhibition } from "@yonyoung/contracts";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import HeroParallax from "@/app/(home)/_components/hero-parallax";

type HeroShowcaseProps = {
  /** 서버에서 이미 고른 노출 대상 전시 (`getFeaturedPublicExhibition`) */
  featuredExhibition: ApiExhibition | null;
  recentActivities: ApiActivity[];
};

/**
 * 홈 히어로 — 서버 컴포넌트다.
 *
 * 예전에는 파일 전체가 `"use client"` 였다. 클라이언트가 필요했던 이유는 스크롤
 * 패럴랙스와 호버 리프트 두 가지뿐이었는데, 전자는 `HeroParallax` 아일랜드
 * 하나로, 후자는 CSS 전환으로 옮겼다. 덕분에 LCP 이미지를 포함한 히어로 전체가
 * 서버 HTML 로만 그려지고 하이드레이션 대상에서 빠진다.
 */
export default function HeroShowcase({
  featuredExhibition,
  recentActivities,
}: HeroShowcaseProps) {
  const firstActivity = recentActivities[0];

  return (
    <HeroParallax
      className="relative border-b border-(--surface-border) bg-(--surface-elevated) px-4 pb-44 pt-14 md:px-8 md:pb-20 md:pt-16"
      data-testid="home-hero"
    >
      <div className="mx-auto grid w-full max-w-300 gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div className="hero-parallax-text">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-(--text-muted)">
            Yonsei University Photography Club
          </p>
          <h1 className="text-6xl leading-[0.96] tracking-[-0.02em] text-(--text-primary) md:text-8xl">
            연영회
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-(--text-muted) md:text-lg">
            1966년부터 이어온 연세대학교 중앙사진동아리. 기록과 전시, 그리고 서로의 시선이
            만나는 장소를 만듭니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/archive/records"
              data-testid="home-cta-archive"
              className="pressable inline-flex border border-(--surface-strong-border) bg-(--accent) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--accent-foreground) transition hover:opacity-90"
            >
              활동 아카이브 보기
            </Link>
            <Link
              href="/about"
              data-testid="home-cta-about"
              className="pressable inline-flex border border-(--surface-strong-border) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white"
            >
              동아리 소개 보기
            </Link>
          </div>
        </div>

        <div className="hero-parallax-image space-y-4">
          <div className="hero-lift-card">
            <div className="hero-lift">
              {featuredExhibition ? (
                <Link
                  href={`/archive/exhibitions/${featuredExhibition.id}`}
                  className="group block overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--text-primary)"
                  data-testid={`home-hero-exhibition-card-${featuredExhibition.id}`}
                  aria-label={`${featuredExhibition.title} 상세 보기`}
                >
                  <div className="relative aspect-4/3">
                    <Image
                      src={featuredExhibition.coverImageUrl}
                      alt={featuredExhibition.title}
                      fill
                      priority
                      unoptimized={shouldUseUnoptimizedImage(
                        featuredExhibition.coverImageUrl,
                      )}
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="h-full w-full object-cover"
                      data-testid="home-hero-exhibition-image"
                    />
                  </div>
                  <div className="space-y-2 p-5" data-testid="home-hero-exhibition-meta">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                      Latest Exhibition
                    </p>
                    <h2 className="text-[1.7rem] tracking-[-0.02em] text-(--text-primary)">
                      {featuredExhibition.title}
                    </h2>
                    <p className="text-sm text-(--text-muted)">
                      {formatKoreanDateRange(
                        featuredExhibition.startDate,
                        featuredExhibition.endDate,
                      )}{" "}
                      · {featuredExhibition.place}
                    </p>
                  </div>
                </Link>
              ) : (
                <article className="overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated)">
                  <div className="relative aspect-4/3">
                    <div className="h-full w-full bg-(--surface-muted) p-6">
                      <div className="h-3 w-24 animate-pulse bg-(--surface-border)" />
                      <div className="mt-3 h-8 w-3/4 animate-pulse bg-(--surface-border)" />
                      <div className="mt-2 h-4 w-4/5 animate-pulse bg-(--surface-border)" />
                    </div>
                  </div>
                  <div className="space-y-2 p-5" data-testid="home-hero-exhibition-meta">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                      Latest Exhibition
                    </p>
                    <h2 className="text-[1.7rem] tracking-[-0.02em] text-(--text-primary)">
                      준비 중
                    </h2>
                  </div>
                </article>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="hero-lift-tile border border-(--surface-border) bg-(--surface-elevated) p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                Recent Activity
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-(--text-primary)">
                {firstActivity?.title ?? "활동 업데이트 예정"}
              </p>
            </div>
            <div className="hero-lift-tile border border-(--surface-border) bg-(--surface-elevated) p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                Since
              </p>
              <p className="mt-2 text-3xl font-semibold text-(--text-primary)">1966</p>
            </div>
          </div>
        </div>
      </div>
    </HeroParallax>
  );
}
