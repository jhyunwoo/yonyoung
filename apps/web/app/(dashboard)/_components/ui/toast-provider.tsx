"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import { IconButton } from "@/app/(dashboard)/_components/ui/icon-button";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type ToastOptions = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** ms. 0 이면 자동으로 닫지 않는다(사용자가 읽고 조치해야 하는 오류 등). */
  duration?: number;
};

type Toast = ToastOptions & { id: number; tone: ToastTone };

type ToastFn = (options: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

const DEFAULT_DURATION = 4_000;

const TONE: Record<
  ToastTone,
  { className: string; Icon: ComponentType<{ className?: string }> }
> = {
  info: { className: "text-primary-text", Icon: Info },
  success: { className: "text-success-text", Icon: CheckCircle2 },
  warning: { className: "text-warning-text", Icon: AlertTriangle },
  danger: { className: "text-danger-text", Icon: XCircle },
};

/**
 * 토스트 알림.
 *
 * 재디자인 이전에는 저장 성공/실패가 페이지 어딘가의 인라인 배너로만 표현돼
 * 스크롤 위치에 따라 아예 안 보였고, 스크린리더에도 알려지지 않았다.
 *
 * 뷰포트는 aria-live="polite" 라서 포커스를 뺏지 않는다.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const dismiss = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((options) => {
    nextIdRef.current += 1;
    setToasts((current) => [
      ...current,
      { ...options, tone: options.tone ?? "info", id: nextIdRef.current },
    ]);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={cx(
          "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-4",
          "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
          "sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end",
        )}
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) => {
  const { className: toneClass, Icon } = TONE[toast.tone];
  const duration = toast.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    if (duration <= 0) {
      return;
    }
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss, toast.id]);

  return (
    <div
      role="status"
      className={cx(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2.5",
        "rounded-lg border border-hairline bg-surface-raised px-3.5 py-3 shadow-elevated",
      )}
    >
      <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", toneClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-ink">{toast.title}</p>
        {toast.description !== undefined && (
          <p className="mt-0.5 text-caption text-ink-muted">{toast.description}</p>
        )}
      </div>
      <IconButton
        data-testid="ui-toast-dismiss"
        label="알림 닫기"
        icon={<X className="h-4 w-4" />}
        size="sm"
        onClick={() => onDismiss(toast.id)}
      />
    </div>
  );
};

export const useToast = (): ToastFn => {
  const toast = useContext(ToastContext);
  if (toast === null) {
    throw new Error("useToast 는 ToastProvider 안에서만 쓸 수 있습니다.");
  }
  return toast;
};
