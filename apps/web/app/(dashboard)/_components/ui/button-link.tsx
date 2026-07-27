import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import {
  buildButtonClass,
  type ButtonSize,
  type ButtonVariant,
} from "@/app/(dashboard)/_components/ui/button-styles";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/**
 * 버튼처럼 보이는 링크. 실제로 이동하는 동작이면 <button> 대신 이걸 쓴다
 * (새 탭 열기 · 주소 복사 같은 브라우저 기본 동작이 살아 있어야 한다).
 * <a> 는 button-testid 계약 대상이 아니지만, e2e 조회를 위해 호출부에서
 * data-testid 를 주는 것을 권장한다.
 */
export const ButtonLink = ({
  variant,
  size,
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonLinkProps) => (
  <Link className={buildButtonClass({ variant, size, fullWidth, className })} {...rest}>
    {leadingIcon}
    {children}
    {trailingIcon}
  </Link>
);
