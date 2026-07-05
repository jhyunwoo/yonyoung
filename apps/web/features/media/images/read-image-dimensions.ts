/**
 * 업로드 전 이미지 파일의 원본 픽셀 크기를 측정하는 유틸리티.
 *
 * 측정된 크기는 이미지 저장 API에 함께 전달되어 공개 갤러리가
 * 레이아웃 시프트 없이 원본 비율(세로/가로)대로 렌더링하는 데 사용됩니다.
 */

export type ImageDimensions = {
  width: number;
  height: number;
};

/** createImageBitmap 미지원/디코딩 실패 시 사용하는 <img> 프리로드 폴백 */
const readDimensionsWithImageElement = (
  file: File,
): Promise<ImageDimensions | null> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      const dimensions =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : null;
      cleanup();
      resolve(dimensions);
    };
    image.onerror = () => {
      cleanup();
      resolve(null);
    };
    image.src = objectUrl;
  });

/**
 * 이미지 파일의 원본 크기(width/height)를 읽습니다.
 *
 * 1순위: createImageBitmap (메인 스레드 부담이 적고 빠름)
 * 2순위: <img> 프리로드 (브라우저가 해당 포맷을 렌더링할 수 있으면 동작)
 *
 * HEIC 등 브라우저가 디코딩하지 못하는 포맷이면 null을 반환하며,
 * 이 경우에도 업로드는 정상 진행됩니다 (크기는 저장하지 않고 프런트 폴백으로 처리).
 */
export const readImageDimensions = async (
  file: File,
): Promise<ImageDimensions | null> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions =
        bitmap.width > 0 && bitmap.height > 0
          ? { width: bitmap.width, height: bitmap.height }
          : null;
      bitmap.close();
      if (dimensions) {
        return dimensions;
      }
    } catch {
      // 디코딩 실패 시 <img> 폴백 시도
    }
  }

  try {
    return await readDimensionsWithImageElement(file);
  } catch {
    return null;
  }
};
