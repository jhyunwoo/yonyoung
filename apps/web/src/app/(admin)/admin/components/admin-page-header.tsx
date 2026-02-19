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
    <header className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-gray-100 blur-2xl" />

      <div className="relative">
        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-gray-600">{description}</p>
        {guidance ? <p className="mt-2 text-xs text-gray-500">{guidance}</p> : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </header>
  );
}
