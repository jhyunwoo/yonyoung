import type { ComponentType, ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import {
  stickerTileClass,
  type StickerAccent,
} from "@/app/(dashboard)/_components/ui/sticker";

type StatTileProps = {
  label: string;
  value: ReactNode;
  /** 값 아래 한 줄 보조 설명. */
  caption?: ReactNode;
  Icon?: ComponentType<{ className?: string }>;
  accent?: StickerAccent;
  className?: string;
};

/**
 * 숫자 요약 타일.
 *
 * 숫자에 tabular-nums 를 적용한다 — 값이 갱신될 때 자릿수가 달라져도 폭이
 * 흔들리지 않는다(폴링하는 통계 화면에서 특히 중요).
 */
export const StatTile = ({
  label,
  value,
  caption,
  Icon,
  accent,
  className,
}: StatTileProps) => (
  <div
    className={cx(
      "flex items-start gap-3 rounded-lg border border-hairline bg-surface p-4",
      className,
    )}
  >
    {Icon !== undefined && (
      <span
        aria-hidden="true"
        className={cx(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          stickerTileClass(accent ?? "sky"),
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    )}

    <div className="min-w-0">
      <p className="text-eyebrow text-ink-muted uppercase">{label}</p>
      <p className="mt-1 text-h3 text-ink tabular-nums">{value}</p>
      {caption !== undefined && (
        <p className="mt-1 text-caption text-ink-muted">{caption}</p>
      )}
    </div>
  </div>
);
