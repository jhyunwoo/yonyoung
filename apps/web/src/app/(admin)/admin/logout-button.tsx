"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "../../../lib/auth-client-tool";
import AdminActionButton from "./components/admin-action-button";
import { AdminStatusMessage } from "./components/admin-form-controls";

type LogoutButtonProps = {
  compact?: boolean;
};

/**
 * LogoutButton 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param { compact = false } 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

    /**
   * handleSignOut의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsPending(true);

    const result = await signOut();

    if (!result.ok) {
      setErrorMessage(result.errorMessage);
      setIsPending(false);
      return;
    }

    router.replace("/auth/sign-in");
    router.refresh();
  };

  return (
    <div
      className={`flex flex-col gap-2 ${
        compact ? "w-auto items-center" : "w-full items-stretch"
      }`}
    >
      <AdminActionButton
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        data-testid="admin-logout-button"
        aria-label={isPending ? "로그아웃 중" : "로그아웃"}
        variant="secondary"
        fullWidth={!compact}
        iconOnly={compact}
        className={compact ? "h-11 w-11" : undefined}
      >
        {compact ? (
          <span aria-hidden="true" className="text-base leading-none">
            {isPending ? "…" : "↩"}
          </span>
        ) : (
          <>
            <span aria-hidden="true" className="text-base leading-none">
              ↩
            </span>
            <span>{isPending ? "로그아웃 중..." : "로그아웃"}</span>
          </>
        )}
      </AdminActionButton>

      {errorMessage ? (
        <AdminStatusMessage tone="error" className="px-2.5 py-1.5 text-xs" testId="admin-logout-error">
          {errorMessage}
        </AdminStatusMessage>
      ) : null}
    </div>
  );
}
