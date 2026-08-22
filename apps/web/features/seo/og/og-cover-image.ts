import "server-only";
import { buildCloudflareTransformUrl } from "@/features/media/images/cloudflare-image-loader";
import { logger } from "@/server/observability/logger";

/** OG 카드 크기와 동일 — 변환 단계에서 정확히 이 크기로 잘라 받는다 */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;
const COVER_QUALITY = 80;

/** 변환본이 이 크기를 넘으면 원본이 그대로 온 것으로 보고 버린다 (OG 한도는 8MB) */
const MAX_COVER_BYTES = 4 * 1024 * 1024;

const COVER_FETCH_TIMEOUT_MS = 8_000;

/**
 * 대표 이미지를 OG 카드에 넣을 수 있는 data URI로 만든다.
 *
 * Cloudflare Image Transformations로 1200×630 JPEG를 받아 엣지에서 자르므로 오리진 CPU를
 * 쓰지 않는다. `format=jpeg`로 고정하는 이유는 `next/og`(satori/resvg)가 Accept 협상 없이
 * 바이트를 직접 디코딩하기 때문이다 — `format=auto`로는 디코딩 못 하는 포맷이 올 수 있다.
 *
 * 실패하면 반드시 `null`을 돌려준다. 빌드 시점에 이미지 호스트가 닿지 않는 경우(E2E의
 * mock 호스트, 네트워크 단절)에도 빌드를 깨뜨리지 않고 텍스트 카드로 폴백하기 위해서다.
 *
 * 이 fetch를 일부러 `"use cache"`로 감싸지 않았다. 감싸면 실패한 결과(null = 사진 없는
 * 카드)까지 캐시돼 정적 PNG로 굳어 버린다. 지금은 fetch가 실패하면 해당 OG 라우트가
 * 사전 렌더링을 포기하고 요청 시점 렌더링으로 내려가므로(빌드 로그의 `ƒ` 표시), 내용은
 * 계속 맞고 다음 빌드에서 저절로 정적으로 돌아온다. 대신 **빌드 시점에
 * `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` 호스트가 닿아야 게시물 OG 이미지가 정적으로 구워진다.**
 */
export const loadOgCoverImage = async (
  coverImageUrl: string | null | undefined,
): Promise<string | null> => {
  if (!coverImageUrl) {
    return null;
  }

  // CDN이 설정돼 있고 R2 미디어면 변환본을, 아니면 원본 절대 URL을 받는다.
  const transformedUrl = buildCloudflareTransformUrl(
    coverImageUrl,
    process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL,
    {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      quality: COVER_QUALITY,
      format: "jpeg",
      fit: "cover",
    },
  );
  const targetUrl = transformedUrl ?? coverImageUrl;

  if (!URL.canParse(targetUrl)) {
    return null;
  }

  try {
    const response = await fetch(targetUrl, {
      cache: "force-cache",
      signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Unexpected content-type: ${contentType || "(none)"}`);
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) {
      throw new Error(`Unexpected size: ${bytes.byteLength} bytes`);
    }

    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    logger.warn({
      event: "seo.og.cover_image_fallback",
      route: targetUrl,
      method: "GET",
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return null;
  }
};
