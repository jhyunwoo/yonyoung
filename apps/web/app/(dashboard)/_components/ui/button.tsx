import type { ButtonHTMLAttributes, ReactNode } from "react";

import {
  buildButtonClass,
  type ButtonSize,
  type ButtonVariant,
} from "@/app/(dashboard)/_components/ui/button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** 진행 중이면 스피너를 보여주고 버튼을 비활성화한다. */
  isPending?: boolean;
  /** 진행 중일 때 대체할 라벨. 없으면 children 을 그대로 쓴다. */
  pendingLabel?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/**
 * 대시보드 기본 버튼.
 *
 * data-testid 계약: 리터럴 기본값을 먼저 두고 {...rest} 를 뒤에 펼쳐서
 * 호출자가 런타임에 덮어쓸 수 있게 한다. tests/unit/app-shared/
 * button-testid-contract.test.ts 는 AST 상의 리터럴만 보므로 통과한다.
 * (form-submit-button.tsx 가 쓰던 것과 같은 패턴)
 */
export const Button = ({
  variant,
  size,
  fullWidth,
  isPending = false,
  pendingLabel,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    data-testid="ui-button"
    className={buildButtonClass({ variant, size, fullWidth, className })}
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
      leadingIcon
    )}
    {isPending && pendingLabel !== undefined ? pendingLabel : children}
    {!isPending && trailingIcon}
  </button>
);
