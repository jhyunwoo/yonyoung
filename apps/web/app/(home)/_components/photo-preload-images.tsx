"use client";

import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import type { PhotoLightboxItem } from "./photo-lightbox";

/**
 * 라이트박스 확대 이미지의 sizes.
 *
 * 프리로더와 라이트박스가 반드시 같은 값을 써야 한다 — 다르면 브라우저가 srcset 에서
 * 다른 후보를 골라 미리 받아둔 게 통째로 무효가 되고, Cloudflare 변환 건수만 한 건 더 쓴다.
 */
export const LIGHTBOX_IMAGE_SIZES = "(min-width: 1024px) 90vw, 100vw";

type PhotoPreloadImagesProps = {
  items: PhotoLightboxItem[];
  /** 미리 받아둘 사진의 index 목록 */
  indices: number[];
  /** 다 받은(또는 실패한) 사진을 알려준다 — 라이트박스 스켈레톤을 건너뛰기 위함 */
  onLoaded: (key: string) => void;
};

/**
 * 곧 볼 가능성이 높은 사진을 화면 밖에서 미리 받아두는 숨김 레이어.
 *
 * 타일 이미지는 라이트박스보다 훨씬 작은 후보를 받으므로(sizes 가 다르다) 타일이 이미
 * 떠 있어도 확대할 때 새로 받아야 한다. 그래서 여기서 "라이트박스가 나중에 요청할 URL"을
 * 그대로 미리 요청해둔다.
 *
 * 같은 URL 을 보장하려고 next/image 를 그대로 쓴다 — sizes 뿐 아니라 fill 여부도
 * srcset 후보 집합을 바꾸므로 라이트박스와 동일하게 맞춰야 한다.
 * sizes 가 뷰포트 기준이라 요소를 1px 로 숨겨도 고르는 후보는 달라지지 않는다.
 */
export function PhotoPreloadImages({
  items,
  indices,
  onLoaded,
}: PhotoPreloadImagesProps) {
  if (indices.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="gallery-preload-layer"
      // fill 은 static 이 아닌 부모가 필요하다. fixed 라 레이아웃 흐름 밖이어서 갤러리 기하에 영향이 없다
      className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
    >
      {indices.map((index) => {
        const item = items[index];
        if (!item) {
          return null;
        }

        return (
          <Image
            key={item.key}
            src={item.imageUrl}
            // 장식용이라 alt 는 비운다(보조기술이 읽지 않게)
            alt=""
            fill
            unoptimized={shouldUseUnoptimizedImage(item.imageUrl)}
            sizes={LIGHTBOX_IMAGE_SIZES}
            // 기본값 lazy 면 화면 밖이라 아예 받지 않는다
            loading="eager"
            // 지금 보고 있는 사진의 대역폭을 뺏지 않게
            fetchPriority="low"
            data-testid={`gallery-preload-${item.key}`}
            onLoad={() => onLoaded(item.key)}
            onError={() => onLoaded(item.key)}
          />
        );
      })}
    </div>
  );
}
