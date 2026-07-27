import Image from "next/image";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import {
  resolveStickerAccent,
  stickerTileClass,
} from "@/app/(dashboard)/_components/ui/sticker";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  sm: { className: "h-8 w-8 text-caption", pixels: 32 },
  md: { className: "h-10 w-10 text-body-sm", pixels: 40 },
  lg: { className: "h-14 w-14 text-title", pixels: 56 },
} as const;

/**
 * 프로필 아바타. 이미지가 없으면 이름 첫 글자를 스티커 액센트 위에 얹는다.
 *
 * 전체가 aria-hidden 인 이유: 아바타 옆에는 항상 이름 텍스트가 함께 렌더되므로
 * 스크린리더에 이름을 두 번 읽어줄 필요가 없다.
 * 이미지는 next/image 를 쓴다(CLAUDE.md 규칙 — raw <img> 지양).
 */
export const Avatar = ({ name, src, size = "md", className }: AvatarProps) => {
  const { className: sizeClass, pixels } = SIZE[size];
  const initial = name.trim().slice(0, 1) || "?";

  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border border-hairline font-semibold",
        sizeClass,
        src === null || src === undefined
          ? stickerTileClass(resolveStickerAccent(name))
          : "bg-surface-sunken",
        className,
      )}
    >
      {src === null || src === undefined ? (
        initial
      ) : (
        <Image
          src={src}
          alt=""
          width={pixels}
          height={pixels}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
};
