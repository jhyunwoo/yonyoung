import "server-only";
import { cacheLife } from "next/cache";
import { buildCloudflareTransformUrl } from "@/features/media/images/cloudflare-image-loader";
import { logger } from "@/server/observability/logger";

/** OG 카드 크기와 동일 — 변환 단계에서 정확히 이 크기로 잘라 받는다 */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;
const COVER_QUALITY = 80;

/** 변환본이 이 크기를 넘으면 원본이 그대로 온 것으로 보고 버린다 (OG 한도는 8MB) */
const MAX_COVER_BYTES = 4 * 1024 * 1024;

const COVER_FETCH_TIMEOUT_MS = 8_000;

/** 받아 온 변환본의 캐시 수명. 게시물 상세(`public-read-service.ts`)와 같은 `days`다. */
const COVER_CACHE_PROFILE = "days";

/**
 * 실패(= 사진 없는 텍스트 카드)의 캐시 수명.
 *
 * 짧아야 일시적인 CDN 장애가 텍스트 카드로 굳지 않는다. 다만 `expire`가 5분보다 짧은
 * 프로필(`seconds`)은 프리렌더에서 동적 입력으로 취급돼 다시 같은 오류가 나므로 `minutes`다.
 * 이 수명이 OG 라우트의 재검증 주기로 전파돼 몇 분 뒤 다음 요청에서 사진을 다시 시도한다.
 */
const COVER_FAILURE_CACHE_PROFILE = "minutes";
const PUBLIC_MEDIA_PATH_PREFIX = "/api/public/media/";

const parseHttpUrl = (value: string, base?: string): URL | null => {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

const resolveOrigin = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? (parseHttpUrl(normalized)?.origin ?? null) : null;
};

export const resolveTrustedOgCoverUrl = (
  coverImageUrl: string,
  options: {
    siteUrl: string | null | undefined;
    cdnBaseUrl: string | null | undefined;
  },
): string | null => {
  const cdnOrigin = resolveOrigin(options.cdnBaseUrl);
  const transformedUrl = buildCloudflareTransformUrl(coverImageUrl, options.cdnBaseUrl, {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    quality: COVER_QUALITY,
    format: "jpeg",
    fit: "cover",
  });

  if (transformedUrl) {
    const transformed = parseHttpUrl(transformedUrl);
    return transformed && cdnOrigin && transformed.origin === cdnOrigin
      ? transformed.toString()
      : null;
  }

  const siteOrigin = resolveOrigin(options.siteUrl);
  const candidate = parseHttpUrl(coverImageUrl, siteOrigin ?? undefined);
  if (!candidate) {
    return null;
  }

  if (
    siteOrigin &&
    candidate.origin === siteOrigin &&
    candidate.pathname.startsWith(PUBLIC_MEDIA_PATH_PREFIX)
  ) {
    return candidate.toString();
  }

  if (cdnOrigin && candidate.origin === cdnOrigin) {
    return candidate.toString();
  }

  return null;
};

/**
 * 검증을 마친 URL에서 변환본을 받아 data URI로 만든다.
 *
 * 반드시 `"use cache"` 안에서 받아야 한다. 게시물 OG 라우트는 `generateStaticParams`를 쓰는
 * 정적 라우트 핸들러라, 빌드 뒤에 추가된 게시물의 첫 요청과 수명이 지난 PNG의 재검증을
 * 서버가 프리렌더로 처리한다. 프리렌더는 캐시를 채운 뒤 한 번 더 실행하는데, 두 번째 실행에서
 * 캐시되지 않은 I/O가 남아 있으면 `used IO that was not cached` 오류로 요청 전체가 실패한다
 * (새 게시물은 500, 재검증은 오래된 PNG가 계속 남는다). 캐시 밖의 `fetch`는 성공한 응답만
 * 캐시되므로 CDN이 한 번 실패하면 두 번째 실행이 다시 네트워크를 타서 정확히 이 경로로 빠졌다.
 * 그래서 실패도 예외로 던지지 않고 `null`을 짧은 수명으로 캐시한다.
 */
const fetchOgCoverDataUrl = async (targetUrl: string): Promise<string | null> => {
  "use cache";

  /*
   * 리다이렉트는 자동으로 따라가지 않는다. 신뢰한 CDN/미디어 경로가 공격자 제어 호스트로
   * 리다이렉트되면 목적지 검증을 우회할 수 있기 때문이다. 변환 실패 시에는 텍스트 카드로
   * 폴백한다.
   */
  try {
    const response = await fetch(targetUrl, {
      redirect: "error",
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
    cacheLife(COVER_CACHE_PROFILE);
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

    cacheLife(COVER_FAILURE_CACHE_PROFILE);
    return null;
  }
};

/**
 * 대표 이미지를 OG 카드에 넣을 수 있는 data URI로 만든다.
 *
 * Cloudflare Image Transformations로 1200×630 JPEG를 받아 엣지에서 자르므로 오리진 CPU를
 * 쓰지 않는다. `format=jpeg`로 고정하는 이유는 `next/og`(satori/resvg)가 Accept 협상 없이
 * 바이트를 직접 디코딩하기 때문이다 — `format=auto`로는 디코딩 못 하는 포맷이 올 수 있다.
 *
 * 실패하면 반드시 `null`을 돌려준다. 빌드 시점에 이미지 호스트가 닿지 않는 경우(E2E의
 * mock 호스트, 네트워크 단절)에도 빌드를 깨뜨리지 않고 텍스트 카드로 폴백하기 위해서다.
 * 실패한 카드는 `COVER_FAILURE_CACHE_PROFILE` 수명만큼만 유지되고 이후 재검증에서 사진을 다시 시도한다.
 */
export const loadOgCoverImage = async (
  coverImageUrl: string | null | undefined,
): Promise<string | null> => {
  if (!coverImageUrl) {
    return null;
  }

  // 애플리케이션이 관리하는 공개 미디어와 명시적으로 설정된 CDN만 가져온다.
  const targetUrl = resolveTrustedOgCoverUrl(coverImageUrl, {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    cdnBaseUrl: process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL,
  });
  if (!targetUrl) {
    return null;
  }

  return fetchOgCoverDataUrl(targetUrl);
};
