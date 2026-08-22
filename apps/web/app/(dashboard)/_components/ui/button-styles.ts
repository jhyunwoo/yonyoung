import { cx } from "@/app/(dashboard)/_components/ui/cx";

/**
 * 버튼 클래스 생성기 (순수 함수).
 *
 * Button / ButtonLink / IconButton / FormSubmitButton 이 모두 이걸 공유하므로
 * 버튼 스타일의 단일 출처다. 컴포넌트가 아니라 함수라서 button-testid 계약의
 * 대상이 아니다.
 *
 * DESIGN.md 해석: pill(rounded-full)은 마케팅 CTA 전용이고 nav/utility 버튼은
 * 8px(rounded-md)이다. 대시보드는 전부 유틸리티 표면이므로 rounded-md 를 쓴다.
 */

export type ButtonVariant =
  "primary" | "secondary" | "utility" | "ghost" | "danger" | "danger-ghost";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * 모바일에서 최소 44px 터치 타깃을 보장하고 md 이상에서 밀도를 높인다.
 * (Apple HIG 44pt / Material 48dp)
 */
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "min-h-11 gap-1.5 px-3 text-caption md:min-h-8 md:px-2.5",
  md: "min-h-11 gap-2 px-3.5 text-body-sm font-medium md:min-h-9",
  lg: "min-h-12 gap-2 px-5 text-body font-medium",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  // 유일한 구조 액센트. 한 화면에 primary 는 하나만 둔다.
  primary: cx(
    "bg-primary text-on-primary",
    "hover:bg-primary-active active:bg-primary-active",
    "disabled:bg-hairline disabled:text-ink-muted",
  ),
  // 흰 표면 + hairline + Notion 의 barely-there 그림자.
  secondary: cx(
    "border border-hairline bg-surface text-ink shadow-soft",
    "hover:bg-canvas-soft active:bg-canvas-soft",
    "disabled:bg-surface-sunken disabled:text-ink-muted disabled:shadow-none",
  ),
  // 그림자 없는 조밀한 버전 — 툴바 · 카드 내부 액션.
  utility: cx(
    "border border-hairline bg-surface text-ink",
    "hover:bg-canvas-soft active:bg-canvas-soft",
    "disabled:bg-surface-sunken disabled:text-ink-muted",
  ),
  ghost: cx(
    "text-ink-secondary",
    "hover:bg-canvas-soft hover:text-ink active:bg-canvas-soft",
    "disabled:text-ink-muted",
  ),
  danger: cx(
    "bg-danger text-on-primary",
    "hover:opacity-90 active:opacity-90",
    "disabled:bg-hairline disabled:text-ink-muted",
  ),
  "danger-ghost": cx(
    "text-danger-text",
    "hover:bg-danger-soft active:bg-danger-soft",
    "disabled:text-ink-muted",
  ),
};

/*
 * 누름 피드백은 scale 0.98 이다. 0.95~0.97 이 아닌 이유: 대시보드 버튼은 하루
 * 수십 번 눌리는 고빈도 표면이라 눈에 띄는 모션은 금방 굼떠 보인다. 여기서는
 * "색만 바뀌고 아무것도 움직이지 않는" 상태(특히 hover 가 없는 터치)를 메우는
 * 정도면 충분하다. duration-150 은 누름 피드백 예산(100~160ms) 안에 있다.
 *
 * transition-colors 대신 프로퍼티를 명시하는 이유는 transform 을 추가하기
 * 위해서다. secondary 의 shadow-soft 는 기존처럼 트랜지션 대상에서 제외해
 * 현재 동작을 바꾸지 않는다.
 *
 * motion-reduce 오버라이드가 아니라 motion-safe 로 거는 이유: 오버라이드는
 * 같은 명시도라 Tailwind 의 유틸 정렬 순서에 승패가 걸리지만, motion-safe 는
 * 애초에 감소 모드에서 규칙 자체가 생성되지 않아 순서와 무관하게 안전하다.
 */
const BASE_CLASS = cx(
  "inline-flex items-center justify-center rounded-md py-2",
  "whitespace-nowrap select-none",
  "transition-[color,background-color,border-color,transform] duration-150",
  "motion-reduce:transition-none",
  "motion-safe:active:scale-[0.98]",
  // 비활성은 눌려도 반응하지 않아야 한다. a[aria-disabled](ButtonLink)는 :active 가
  // 실제로 발동하므로 명시적으로 되돌린다 — 속성 선택자가 붙어 명시도로 이긴다.
  "aria-disabled:active:scale-100 disabled:active:scale-100",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
  "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
);

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export const buildButtonClass = ({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string =>
  cx(
    BASE_CLASS,
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    fullWidth && "w-full",
    className,
  );

/** 아이콘만 있는 정사각 버튼 — 모바일 44px, md 이상 36px. */
export const buildIconButtonClass = ({
  variant = "ghost",
  size = "md",
  className,
}: Omit<ButtonStyleOptions, "fullWidth"> = {}): string =>
  cx(
    BASE_CLASS,
    "shrink-0 p-0",
    size === "sm" ? "h-11 w-11 md:h-8 md:w-8" : "h-11 w-11 md:h-9 md:w-9",
    VARIANT_CLASS[variant],
    className,
  );
