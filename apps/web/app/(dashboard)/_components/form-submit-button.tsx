"use client";

import { type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  idleLabel: string;
  pendingLabel: string;
  /**
   * 저장 진행 여부. `onSubmit`으로 제출하는 폼은 `useFormStatus`가 pending을 알 수 없으므로
   * 폼의 저장 상태를 직접 넘긴다. 생략하면 `<form action>`의 상태를 따른다.
   */
  pending?: boolean;
};

export default function FormSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled,
  pending: pendingOverride,
  ...props
}: FormSubmitButtonProps) {
  const formStatus = useFormStatus();
  const pending = pendingOverride ?? formStatus.pending;
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      className={className}
      disabled={isDisabled}
      aria-busy={pending}
      data-testid="form-submit"
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {pending ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {pending ? pendingLabel : idleLabel}
      </span>
    </button>
  );
}
