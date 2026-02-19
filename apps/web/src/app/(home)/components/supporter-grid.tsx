import Image from "next/image";
import MotionReveal from "./motion-reveal";
import type { ApiSupporter } from "../../../lib/admin-api/types";

type SupporterGridProps = {
  supporters: ApiSupporter[];
  emptyMessage: string;
  containerTestId: string;
  cardTestIdPrefix: string;
  showExpiresAt?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function SupporterGrid({
  supporters,
  emptyMessage,
  containerTestId,
  cardTestIdPrefix,
  showExpiresAt = false,
}: SupporterGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid={containerTestId}>
      {supporters.length === 0 ? (
        <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
          {emptyMessage}
        </div>
      ) : (
        supporters.map((supporter, index) => (
          <MotionReveal key={supporter.id} delay={index * 0.03}>
            <a
              href={supporter.link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${cardTestIdPrefix}-${supporter.id}`}
              className="group block rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:-translate-y-1 hover:border-(--accent)"
            >
              <div className="mb-4 flex h-12 items-center justify-center overflow-hidden rounded-xl bg-(--surface-muted) px-3">
                <Image
                  src={supporter.logoUrl}
                  alt={supporter.name}
                  width={160}
                  height={48}
                  sizes="160px"
                  className="max-h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm font-medium text-(--text-primary)">{supporter.name}</p>
              {showExpiresAt ? (
                <p className="mt-1 text-xs text-(--text-muted)">
                  만료일 {dateFormatter.format(supporter.expiresAt)}
                </p>
              ) : null}
            </a>
          </MotionReveal>
        ))
      )}
    </div>
  );
}
