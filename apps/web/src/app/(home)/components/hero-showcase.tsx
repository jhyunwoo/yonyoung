"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { ApiActivity, ApiExhibition } from "../../../lib/admin-api/types";
import { shouldUseUnoptimizedImage } from "../../../lib/image-utils";

type HeroShowcaseProps = {
  featuredExhibition: ApiExhibition | null;
  recentActivities: ApiActivity[];
};

const formatDateRange = (startDate: number, endDate: number): string => {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

/**
 * HeroShowcase 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function HeroShowcase({
  featuredExhibition,
  recentActivities,
}: HeroShowcaseProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end start"],
  });
  const textOffset = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const imageOffset = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const firstActivity = recentActivities[0];

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden border-b border-(--surface-border) px-4 pb-16 pt-14 md:px-6 md:pb-20 md:pt-18"
      data-testid="home-hero"
    >
      <div className="hero-glow -left-16 top-10" />
      <div className="hero-glow bottom-8 right-[-6rem]" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <motion.div style={shouldReduceMotion ? undefined : { y: textOffset }}>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-(--text-muted)">
            Yonsei University Central Photography Club
          </p>
          <h1 className="font-display text-5xl leading-[0.94] text-(--text-primary) md:text-7xl">
            연영회
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-(--text-secondary) md:text-lg">
            1966년부터 이어온 연세대학교 중앙사진동아리. 기록과 전시, 그리고 서로의
            시선이 만나는 장소를 만듭니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/archive"
              data-testid="home-cta-archive"
              className="rounded-full bg-(--accent) px-5 py-2.5 text-sm font-medium text-(--accent-foreground) transition hover:opacity-90"
            >
              활동 아카이브 보기
            </Link>
            <Link
              href="/about"
              data-testid="home-cta-about"
              className="rounded-full border border-(--surface-border) bg-(--surface-elevated) px-5 py-2.5 text-sm font-medium text-(--text-primary) transition hover:border-(--accent) hover:text-(--accent)"
            >
              동아리 소개 보기
            </Link>
          </div>
        </motion.div>

        <motion.div
          style={shouldReduceMotion ? undefined : { y: imageOffset }}
          className="space-y-4"
        >
          <motion.article
            whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated) shadow-[0_20px_60px_-40px_var(--shadow-strong)]"
          >
            <div className="relative aspect-[4/3]">
              {featuredExhibition ? (
                <Image
                  src={featuredExhibition.coverImageUrl}
                  alt={featuredExhibition.title}
                  fill
                  unoptimized={shouldUseUnoptimizedImage(featuredExhibition.coverImageUrl)}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="h-full w-full object-cover"
                  data-testid="home-hero-exhibition-image"
                  fetchPriority="high"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-(--surface-muted) text-sm text-(--text-muted)">
                  전시 데이터를 불러오는 중입니다.
                </div>
              )}
            </div>
            <div className="space-y-2 p-4" data-testid="home-hero-exhibition-meta">
              <p className="text-xs uppercase tracking-[0.16em] text-(--text-muted)">
                Latest Exhibition
              </p>
              <h2 className="font-display text-2xl text-(--text-primary)">
                {featuredExhibition?.title ?? "준비 중"}
              </h2>
              {featuredExhibition ? (
                <p className="text-sm text-(--text-secondary)">
                  {formatDateRange(featuredExhibition.startDate, featuredExhibition.endDate)} ·{" "}
                  {featuredExhibition.place}
                </p>
              ) : null}
            </div>
          </motion.article>

          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                Recent Activity
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-(--text-primary)">
                {firstActivity?.title ?? "활동 업데이트 예정"}
              </p>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                Since
              </p>
              <p className="mt-2 font-display text-3xl text-(--text-primary)">1966</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
