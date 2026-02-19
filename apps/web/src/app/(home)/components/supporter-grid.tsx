import Image from "next/image";
import MotionReveal from "./motion-reveal";
import type { ApiSupporter } from "../../../lib/admin-api/types";
import { shouldUseUnoptimizedImage } from "../../../lib/image-utils";

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid={containerTestId}>
      {supporters.length === 0 ? (
        <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
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
              className="group block border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:-translate-y-1 hover:border-(--surface-strong-border)"
            >
              <div className="relative mb-4 aspect-[3/2] overflow-hidden border border-(--surface-border) bg-(--surface-muted)">
                <Image
                  src={supporter.logoUrl}
                  alt={supporter.name}
                  fill
                  unoptimized={shouldUseUnoptimizedImage(supporter.logoUrl)}
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 42vw, 90vw"
                  className="h-full w-full object-cover"
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
