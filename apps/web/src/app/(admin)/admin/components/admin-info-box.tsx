import type { ReactNode } from "react";

type AdminInfoBoxProps = {
  title: string;
  children: ReactNode;
  testId?: string;
};

export default function AdminInfoBox({
  title,
  children,
  testId,
}: AdminInfoBoxProps) {
  return (
    <div
      className="rounded-xl border border-[var(--admin-status-info-border)] bg-[var(--admin-status-info-bg)] px-3.5 py-2.5 text-sm text-[var(--admin-status-info-text)]"
      data-testid={testId}
    >
      <p className="font-medium">{title}</p>
      <div className="mt-1.5 text-xs leading-5 text-[var(--admin-status-info-text)]/85">{children}</div>
    </div>
  );
}
