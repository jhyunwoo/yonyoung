import type { PropsWithChildren } from "react";

type SectionProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function SectionHeading({ title, subtitle, children }: SectionProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
      {subtitle ? <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      {children}
    </header>
  );
}

export function AdminBadge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
      {children}
    </span>
  );
}
