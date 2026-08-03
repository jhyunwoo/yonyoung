"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

export type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  /** testid 접두사. 결과는 `${testIdPrefix}-${value}` */
  testIdPrefix?: string;
};

type SegmentedControlProps<TValue extends string> = {
  /** 그룹 전체를 설명하는 접근 가능한 이름. */
  label: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  testIdPrefix: string;
  className?: string;
};

/**
 * 세그먼트 컨트롤(기간 전환 등).
 *
 * 재디자인 이전에는 pill 처럼 보이지만 aria-pressed 도 role 도 없는 그냥
 * 버튼 두 개였다. radiogroup 으로 만들어 현재 선택을 AT 에 알린다.
 *
 * 선택 표시는 layoutId 를 공유하는 thumb 하나가 세그먼트 사이를 미끄러진다
 * (이전에는 배경색이 순간이동해 어디서 어디로 옮겨갔는지 읽히지 않았다).
 * layoutId 는 한 페이지에 컨트롤이 둘 이상 있어도 섞이지 않도록 testIdPrefix
 * 에서 파생시킨다.
 */
export const SegmentedControl = <TValue extends string>({
  label,
  options,
  value,
  onChange,
  testIdPrefix,
  className,
}: SegmentedControlProps<TValue>) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        "inline-flex items-center gap-1 rounded-md border border-hairline bg-canvas-soft p-1",
        className,
      )}
    >
      {options.map((option) => (
        <SegmentButton
          key={option.value}
          data-testid={`${testIdPrefix}-${option.value}`}
          isSelected={option.value === value}
          thumbLayoutId={`${testIdPrefix}-thumb`}
          shouldReduceMotion={shouldReduceMotion === true}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </SegmentButton>
      ))}
    </div>
  );
};

/**
 * 세그먼트 버튼 하나.
 *
 * 별도 컴포넌트로 뺀 이유: testid 접두사가 prop 으로 들어오므로 호출부에서는
 * 리터럴을 쓸 수 없다. 여기서 리터럴 기본값을 두고 {...rest} 를 뒤에 펼치면
 * AST 계약(리터럴만 검사)과 런타임 값(호출자가 덮어씀)을 동시에 만족한다.
 */
const SegmentButton = ({
  isSelected,
  thumbLayoutId,
  shouldReduceMotion,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
  thumbLayoutId: string;
  shouldReduceMotion: boolean;
}) => (
  <button
    type="button"
    data-testid="ui-segment"
    role="radio"
    aria-checked={isSelected}
    className={cx(
      "relative min-h-9 rounded-sm px-3 text-caption font-medium",
      "transition-colors duration-150 motion-reduce:transition-none",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
      isSelected ? "text-ink" : "text-ink-muted hover:text-ink",
      className,
    )}
    {...rest}
  >
    {isSelected && (
      <motion.span
        aria-hidden="true"
        layoutId={thumbLayoutId}
        className="absolute inset-0 rounded-sm bg-surface shadow-soft"
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 460, damping: 36, mass: 0.58 }
        }
      />
    )}
    {/* thumb 가 absolute 로 깔리므로 라벨을 위로 올린다 */}
    <span className="relative z-10">{children}</span>
  </button>
);
