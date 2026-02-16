import { ReactNode } from "react";
import MotionReveal from "./motion-reveal";

type SectionShellProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * SectionShell 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionShellProps) {
  return (
    <section id={id} className={["px-4 py-12 md:px-6 md:py-16", className].join(" ")}>
      <div className="mx-auto w-full max-w-6xl">
        <MotionReveal className="mb-8 md:mb-10">
          {eyebrow ? (
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-(--text-muted)">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-3xl leading-tight text-(--text-primary) md:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              {description}
            </p>
          ) : null}
        </MotionReveal>
        {children}
      </div>
    </section>
  );
}
