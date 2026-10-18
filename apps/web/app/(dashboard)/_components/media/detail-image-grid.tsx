import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";

type DetailImageGridProps = {
  resourceId: string;
  title: string;
  coverImageUrl: string;
  detailImages: ReadonlyArray<{ imageUrl: string; sortOrder: number }>;
};

/** 활동·전시 상세의 사진 목록. 세부 사진이 없으면 대표 사진 한 장을 보여 준다. */
export default function DetailImageGrid({
  resourceId,
  title,
  coverImageUrl,
  detailImages,
}: DetailImageGridProps) {
  const imageUrls =
    detailImages.length === 0
      ? [coverImageUrl]
      : detailImages
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((image) => image.imageUrl);

  return (
    <div>
      <p className="text-sm font-semibold text-ink">이미지</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imageUrls.map((imageUrl, index) => (
          <div
            key={`${resourceId}-${index}-${imageUrl}`}
            className="relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline bg-canvas-soft"
          >
            <Image
              src={imageUrl}
              alt={`${title} 이미지 ${index + 1}`}
              fill
              className="object-cover"
              unoptimized={shouldUseUnoptimizedImage(imageUrl)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
