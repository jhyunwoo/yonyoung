import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  guidance?: string;
  children?: ReactNode;
};

export default function AdminPageHeader({
  title,
  description,
  guidance,
  children,
}: AdminPageHeaderProps) {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-[0_10px_22px_-18px_rgba(0,0,0,0.48)] md:p-6">
      <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">{title}</h1>
      <p className="mt-1.5 text-sm text-gray-600">{description}</p>
      {guidance ? <p className="mt-2 text-xs text-gray-500">{guidance}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
