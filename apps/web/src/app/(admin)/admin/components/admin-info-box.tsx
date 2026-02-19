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
      className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-sm text-blue-900"
      data-testid={testId}
    >
      <p className="font-medium">{title}</p>
      <div className="mt-1.5 text-xs leading-5 text-blue-900/80">{children}</div>
    </div>
  );
}
