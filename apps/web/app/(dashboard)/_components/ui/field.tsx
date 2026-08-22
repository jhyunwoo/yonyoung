"use client";

import { useId, type ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

/** Field 가 자식 컨트롤에 넘겨주는 접근성 배선. */
export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  required: boolean | undefined;
};

type FieldProps = {
  label: ReactNode;
  /** 컨트롤 아래 항상 보이는 도움말. placeholder 로 대체하지 않는다. */
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * 라벨 · 도움말 · 에러를 컨트롤과 프로그램적으로 연결한다.
 *
 * 재디자인 이전에는 라벨이 <label> 로 감싸는 암묵적 방식이라 htmlFor/id 가 없고,
 * 에러 문구는 aria-describedby 없이 형제 <span> 으로만 떠 있어서 스크린리더가
 * 필드와 에러를 잇지 못했다. 이 컴포넌트가 그 배선을 강제한다.
 */
export const Field = ({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) => {
  const baseId = useId();
  const controlId = `${baseId}-control`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const hasError = typeof error === "string" && error !== "";

  const describedBy =
    cx(hint !== undefined ? hintId : undefined, hasError ? errorId : undefined) ||
    undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="text-caption font-medium text-ink">
        {label}
        {required === true && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-danger-text">
              *
            </span>
            <span className="sr-only">(필수)</span>
          </>
        )}
      </label>

      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": hasError ? true : undefined,
        required,
      })}

      {hint !== undefined && (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}

      {hasError && (
        <p id={errorId} role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
};
