import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

/**
 * 폼 컨트롤 공통 클래스.
 *
 * DESIGN.md: 인풋은 pill 이 아니라 타이트한 rounded-xs(4px)를 쓴다.
 * 재디자인 이전 대시보드는 outline-none 만 걸고 대체 링을 주지 않아서
 * 키보드 사용자가 위치를 알 수 없었다. 여기서 focus-visible 링을 강제한다.
 * 폰트 크기는 globals.css 의 base 레이어가 16px 로 고정한다(iOS 확대 방지).
 */
const CONTROL_CLASS = cx(
  "w-full rounded-xs border bg-surface px-3 py-2.5 text-ink",
  "placeholder:text-ink-muted",
  "transition-shadow duration-150 motion-reduce:transition-none",
  "focus-visible:outline-none focus-visible:shadow-(--shadow-focus)",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted",
  // 유효하지 않은 값이면 테두리 + 링을 danger 로 바꾼다(색만으로 전달하지 않도록
  // Field 가 role="alert" 문구를 함께 렌더한다).
  "border-hairline-strong aria-invalid:border-danger",
);

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cx(CONTROL_CLASS, className)} {...rest} />
);

export const Textarea = ({
  className,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={rows} className={cx(CONTROL_CLASS, "resize-y", className)} {...rest} />
);

/**
 * 네이티브 <select>. 커스텀 드롭다운을 만들지 않는 이유: 모바일에서 OS 기본
 * 피커가 훨씬 쓰기 좋고, 키보드/스크린리더 동작이 공짜로 따라온다.
 */
export const Select = ({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cx(CONTROL_CLASS, "pr-8", className)} {...rest}>
    {children}
  </select>
);
