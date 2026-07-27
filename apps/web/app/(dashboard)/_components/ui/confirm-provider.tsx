"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/app/(dashboard)/_components/ui/button";
import { Dialog } from "@/app/(dashboard)/_components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * window.confirm 을 대체하는 확인 다이얼로그.
 *
 * 브라우저 기본 confirm 은 스타일링 · 한국어 버튼 라벨 · 포커스 동작을 전혀
 * 제어할 수 없고, 파괴적 동작임을 시각적으로 알릴 방법도 없었다.
 *
 * 사용법:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "삭제할까요?", tone: "danger" }))) return;
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setPending(options);
      }),
    [],
  );

  const settle = useCallback((accepted: boolean): void => {
    resolveRef.current?.(accepted);
    resolveRef.current = null;
    setPending(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title ?? ""}
        description={pending?.description}
        size="sm"
        // 실수로 배경을 눌러 파괴적 동작을 취소/확정하지 않도록 명시적 선택만 받는다.
        dismissOnBackdrop={false}
        testId="confirm-dialog"
        footer={
          <>
            <Button
              data-testid="confirm-dialog-cancel"
              variant="secondary"
              onClick={() => settle(false)}
            >
              {pending?.cancelLabel ?? "취소"}
            </Button>
            <Button
              data-testid="confirm-dialog-accept"
              variant={pending?.tone === "danger" ? "danger" : "primary"}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? "확인"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const confirm = useContext(ConfirmContext);
  if (confirm === null) {
    throw new Error("useConfirm 은 ConfirmProvider 안에서만 쓸 수 있습니다.");
  }
  return confirm;
};
