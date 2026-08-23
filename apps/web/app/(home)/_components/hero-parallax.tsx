"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HeroParallaxProps = {
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
};

/**
 * 홈 히어로의 스크롤 패럴랙스 — framer-motion `useScroll`/`useTransform` 대체.
 *
 * 여기서 하는 일은 스크롤 진행도(0~1)를 `--hero-progress` 에 써 넣는 것뿐이고,
 * 실제 이동량과 페인팅은 globals.css 의 `.hero-parallax-text` /
 * `.hero-parallax-image` 가 맡는다. 서버가 그린 자식은 그대로 서버 컴포넌트로
 * 남는다 — 이 아일랜드는 `<section>` 껍데기 하나뿐이다.
 *
 * 진행도 정의는 framer 의 `offset: ["start start", "end start"]` 와 같다.
 *   progress = clamp((scrollY - sectionTop) / sectionHeight, 0, 1)
 * 즉 섹션 위쪽이 뷰포트 위쪽에 닿는 순간 0, 섹션 아래쪽이 닿는 순간 1이다.
 *
 * 저사양 기기를 위해 스크롤 핸들러는 passive 로 붙이고 값 계산은 rAF 로 한
 * 프레임에 한 번만 한다. 레이아웃 읽기(offsetTop/offsetHeight)는 리사이즈 때만
 * 하고 캐시해서, 스크롤 중 강제 리플로우가 생기지 않게 한다.
 */
export default function HeroParallax({
  className,
  children,
  "data-testid": dataTestId,
}: HeroParallaxProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let sectionTop = 0;
    let sectionHeight = 1;
    let lastProgress = -1;

    const measure = () => {
      const rect = root.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = Math.max(rect.height, 1);
    };

    const paint = () => {
      frame = null;
      const raw = (window.scrollY - sectionTop) / sectionHeight;
      const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      // 소수 3자리면 80px/110px 이동에서 0.1px 미만 차이라 눈에 보이지 않는다.
      const rounded = Math.round(progress * 1000) / 1000;
      if (rounded === lastProgress) {
        return;
      }
      lastProgress = rounded;
      root.style.setProperty("--hero-progress", String(rounded));
    };

    const schedule = () => {
      if (frame !== null) {
        return;
      }
      frame = requestAnimationFrame(paint);
    };

    const onResize = () => {
      measure();
      schedule();
    };

    const start = () => {
      measure();
      schedule();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
    };

    const stop = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      root.style.removeProperty("--hero-progress");
      lastProgress = -1;
    };

    const sync = () => {
      stop();
      if (!reduceMotionQuery.matches) {
        start();
      }
    };

    sync();
    reduceMotionQuery.addEventListener("change", sync);

    return () => {
      reduceMotionQuery.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return (
    <section ref={rootRef} className={className} data-testid={dataTestId}>
      {children}
    </section>
  );
}
