"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";

type AdaptiveGalleryImageProps = {
  src: string;
  alt: string;
  /** 크기를 알기 전까지 사용할 CSS aspect-ratio 값 (예: "2 / 3") */
  fallbackAspectRatio: string;
  sizes: string;
};

/**
 * 원본 크기 정보가 없는 레거시 이미지용 폴백 렌더러.
 *
 * DB에 width/height가 저장되기 전에 업로드된 이미지는 서버에서 비율을 알 수 없으므로,
 * 우선 fallbackAspectRatio 프레임으로 렌더링한 뒤 브라우저가 이미지를 디코딩하면
 * onLoad에서 naturalWidth/naturalHeight를 읽어 실제 비율로 보정합니다.
 * (마켓 상세 페이지의 비율 감지 패턴을 공용화한 것)
 */
export function AdaptiveGalleryImage({
  src,
  alt,
  fallbackAspectRatio,
  sizes,
}: AdaptiveGalleryImageProps) {
  // "W / H" 문자열 형식 사용 (숫자 단독 값은 jsdom CSSOM이 거부하며, 형식상 의미도 더 명확)
  const [measuredRatio, setMeasuredRatio] = useState<string | null>(null);

  const style: CSSProperties = {
    aspectRatio: measuredRatio ?? fallbackAspectRatio,
  };

  return (
    <div className="relative w-full overflow-hidden" style={style}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={shouldUseUnoptimizedImage(src)}
        // 실제 비율 측정 전에는 크롭(cover)으로 프레임을 채우고, 측정 후에는 원본 비율이라 크롭이 사라짐
        className="object-cover"
        sizes={sizes}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setMeasuredRatio(`${naturalWidth} / ${naturalHeight}`);
          }
        }}
      />
    </div>
  );
}
