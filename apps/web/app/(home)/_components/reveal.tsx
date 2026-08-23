import type { CSSProperties, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** 등장까지의 지연(초). 카드 목록의 스태거를 만든다. */
  delay?: number;
  /** 시작 위치의 아래쪽 오프셋(px). */
  y?: number;
};

/**
 * 스크롤 진입 시 한 번 나타나는 래퍼 — 서버 컴포넌트다.
 *
 * 예전에는 framer-motion `motion.div`(`whileInView`)를 카드마다 하나씩 썼다. 그러면
 * 홈 한 페이지에만 클라이언트 컴포넌트가 15개 넘게 생기고, 공개 라우트 전체가
 * framer-motion 청크(gzip 약 43KB)를 초기 번들로 받는다. 애니메이션 자체는
 * "투명도 + 세로 이동" 뿐이라 CSS transition 으로 그대로 재현할 수 있다.
 *
 * 이 컴포넌트는 마크업만 서버에서 내보내고, 실제 트리거는 페이지당 하나뿐인
 * `RevealObserver`(IntersectionObserver 1개)가 담당한다. 즉 카드가 몇 장이든
 * 클라이언트 컴포넌트는 0개, 옵저버는 1개다.
 *
 * 동작 파리티(framer 시절과 동일):
 *   - opacity 0 → 1, translateY 18px → 0, 0.6s, cubic-bezier(0.22, 1, 0.36, 1)
 *   - 한 번만 실행(되돌아와도 다시 재생하지 않는다)
 *   - rootMargin "-10% 0px"
 *   - prefers-reduced-motion 이면 애니메이션 없이 처음부터 보인다
 */
export default function Reveal({ children, className, delay = 0, y = 18 }: RevealProps) {
  const style: CSSProperties = {};
  if (delay > 0) {
    (style as Record<string, string>)["--reveal-delay"] = `${delay}s`;
  }
  if (y !== 18) {
    (style as Record<string, string>)["--reveal-y"] = `${y}px`;
  }

  return (
    <div
      data-reveal=""
      className={className}
      {...(Object.keys(style).length > 0 ? { style } : {})}
    >
      {children}
    </div>
  );
}
