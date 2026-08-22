import type { ButtonHTMLAttributes, ReactNode } from "react";

import {
  buildIconButtonClass,
  type ButtonSize,
  type ButtonVariant,
} from "@/app/(dashboard)/_components/ui/button-styles";

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  /**
   * 접근 가능한 이름. 필수로 둔 이유: 아이콘만 있는 버튼에 이름이 빠지면
   * e2e 의 axe `button-name` 룰이 전 라우트에서 터진다. 타입 레벨에서 막는다.
   */
  label: string;
  /** aria-hidden 이 적용된 아이콘 노드. */
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: Extract<ButtonSize, "sm" | "md">;
  isPending?: boolean;
};

/** 아이콘 전용 버튼. 모바일 44×44, md 이상 36×36(sm 은 32×32). */
export const IconButton = ({
  label,
  icon,
  variant,
  size,
  isPending = false,
  className,
  disabled,
  ...rest
}: IconButtonProps) => (
  <button
    type="button"
    data-testid="ui-icon-button"
    aria-label={label}
    title={label}
    className={buildIconButtonClass({ variant, size, className })}
    disabled={disabled === true || isPending}
    aria-busy={isPending || undefined}
    {...rest}
  >
    {isPending ? (
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    ) : (
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    )}
  </button>
);
