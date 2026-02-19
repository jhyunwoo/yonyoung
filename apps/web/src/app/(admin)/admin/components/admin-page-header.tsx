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
    <header className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {guidance ? <p className="mt-2 text-xs text-gray-500">{guidance}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
