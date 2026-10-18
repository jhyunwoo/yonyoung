import { type ReactNode } from "react";
import Reveal from "@/app/(home)/_components/reveal";

type SectionShellProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionShellProps) {
  return (
    <section id={id} className={["px-4 py-12 md:px-8 md:py-16", className].join(" ")}>
      <div className="mx-auto w-full max-w-[1200px]">
        <Reveal className="mb-10 text-center md:mb-12">
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-[2.2rem] leading-tight tracking-[-0.02em] text-(--text-primary) md:text-[2.5rem]">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-(--text-muted) md:text-base">
              {description}
            </p>
          ) : null}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
