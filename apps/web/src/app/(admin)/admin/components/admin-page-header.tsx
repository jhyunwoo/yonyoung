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
    <header className="rounded-xl border border-gray-200 bg-white p-5">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {guidance ? <p className="mt-2 text-xs text-gray-500">{guidance}</p> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </header>
  );
}
