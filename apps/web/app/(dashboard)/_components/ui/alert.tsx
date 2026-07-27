import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE: Record<
  AlertTone,
  { className: string; Icon: ComponentType<{ className?: string }> }
> = {
  info: {
    className: "border-primary-hairline bg-primary-soft text-primary-text",
    Icon: Info,
  },
  success: {
    className: "border-success-hairline bg-success-soft text-success-text",
    Icon: CheckCircle2,
  },
  warning: {
    className: "border-warning-hairline bg-warning-soft text-warning-text",
    Icon: AlertTriangle,
  },
  danger: {
    className: "border-danger-hairline bg-danger-soft text-danger-text",
    Icon: XCircle,
  },
};

/**
 * 인라인 상태 배너. 재디자인 이전에는 같은 모양의 div 가 ~30곳에 복사돼
 * 있었고 role 이 붙은 것은 2개뿐이었다.
 *
 * danger 는 role="alert"(즉시 알림), 나머지는 role="status"(대기 후 알림).
 * 아이콘을 함께 두어 색만으로 의미가 전달되지 않게 한다.
 */
export const Alert = ({
  tone = "info",
  title,
  action,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) => {
  const { className: toneClass, Icon } = TONE[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-body-sm",
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title !== undefined && <p className="font-semibold">{title}</p>}
        {children !== undefined && (
          <div className={cx(title !== undefined && "mt-1")}>{children}</div>
        )}
      </div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
};
