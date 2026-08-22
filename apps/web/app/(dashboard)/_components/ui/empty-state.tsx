import type { ComponentType, ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import {
  stickerTileClass,
  type StickerAccent,
} from "@/app/(dashboard)/_components/ui/sticker";

type EmptyStateProps = {
  Icon: ComponentType<{ className?: string }>;
  /** DESIGN.md 의 스티커 팔레트가 구조적으로 쓰이는 유일한 자리. */
  accent?: StickerAccent;
  title: string;
  description?: string;
  /** 비어 있는 화면은 행동 유도의 기회다 — 가능하면 항상 CTA 를 준다. */
  action?: ReactNode;
  className?: string;
};

/**
 * 빈 상태.
 *
 * 재디자인 이전에는 점선 테두리 안에 회색 한 줄만 있었고 다음에 뭘 해야 하는지
 * 알려주지 않았다.
 */
export const EmptyState = ({
  Icon,
  accent = "sky",
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cx(
      "flex flex-col items-center rounded-lg border border-dashed border-hairline-strong",
      "bg-surface-sunken px-6 py-10 text-center",
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-lg",
        stickerTileClass(accent),
      )}
    >
      <Icon className="h-5 w-5" />
    </span>

    <p className="mt-4 text-body font-semibold text-ink">{title}</p>

    {description !== undefined && (
      <p className="mt-1.5 max-w-sm text-body-sm text-ink-muted">{description}</p>
    )}

    {action !== undefined && <div className="mt-5">{action}</div>}
  </div>
);
