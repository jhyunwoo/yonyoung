/**
 * next/image 전역 커스텀 로더 — R2 미디어를 Cloudflare 엣지에서 변환/전송합니다.
 *
 * 기존 경로는 브라우저 → 오리진(Dokploy) → sharp AVIF 인코딩 → /api/public/media
 * 프록시 → Worker → R2 였습니다. 오리진이 CDN 뒤에 있지 않아 변환이 단일 서버에서
 * 직렬 처리되고, 갤러리 한 페이지에 수십 장이 들어가면 콜드 상태에서 수 초~수십 초가
 * 걸렸습니다.
 *
 * 이 로더는 R2 커스텀 도메인(Cloudflare 존)의 Image Transformations를 사용해
 * 브라우저가 엣지에서 바로 변환본을 받도록 URL을 바꿉니다. 오리진 CPU 사용 없음.
 *
 * NEXT_PUBLIC_IMAGE_CDN_BASE_URL이 비어 있거나 R2 미디어가 아닌 src(로컬 /public
 * 자산, 구글 프로필 이미지 등)는 src를 **그대로** 반환합니다.
 *
 * `images.loader: "custom"`을 설정하면 Next.js는 /_next/image 엔드포인트를 아예
 * 제공하지 않습니다. 따라서 이 경로로 URL을 만들면 404가 되므로 절대 방출하지
 * 않습니다. 대신 변환 대상이 아닌 자산은 리사이즈 없이 원본을 그대로 서빙하며,
 * 그래서 public/ 로고는 표시 크기에 맞춰 미리 축소해 둡니다.
 */

/** DB에 저장된 공개 미디어 URL의 경로 접두사 (yonyoung-api의 presign.ts와 동일) */
const PUBLIC_MEDIA_PATH_PREFIX = "/api/public/media/";

/** 변환 옵션: 포맷 자동 협상, 확대 금지, EXIF 제거, 한도 초과 시 원본으로 리다이렉트 */
const TRANSFORM_BASE_OPTIONS = [
  "format=auto",
  "fit=scale-down",
  "metadata=none",
  "onerror=redirect",
];

const DEFAULT_QUALITY = 75;

export type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const resolveCdnOrigin = (cdnBaseUrl: string): string | null => {
  try {
    return new URL(cdnBaseUrl).origin;
  } catch {
    return null;
  }
};

/**
 * src에서 R2 오브젝트 경로를 추출합니다.
 *
 * pathname은 이미 세그먼트별로 퍼센트 인코딩된 상태이므로(api의 encodeKeyForPublicUrl)
 * 재인코딩하지 않고 그대로 잘라 씁니다. 이중 인코딩하면 R2에서 404가 납니다.
 */
const extractObjectPath = (src: string, cdnBaseUrl: string): string | null => {
  if (!src) {
    return null;
  }

  // 상대 경로 프록시 URL: /api/public/media/<key>?sig=...
  if (src.startsWith(PUBLIC_MEDIA_PATH_PREFIX)) {
    const objectPath = src.slice(PUBLIC_MEDIA_PATH_PREFIX.length).split(/[?#]/)[0];
    return objectPath || null;
  }

  // 그 외 상대 경로(/public 정적 자산 등)는 변환 대상이 아니다
  if (src.startsWith("/")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  // 절대 프록시 URL: https://yonyoung.yonsei.ac.kr/api/public/media/<key>?sig=...
  if (url.pathname.startsWith(PUBLIC_MEDIA_PATH_PREFIX)) {
    const objectPath = url.pathname.slice(PUBLIC_MEDIA_PATH_PREFIX.length);
    return objectPath || null;
  }

  // 레거시 직접 URL: https://storage.yonyoung.moveto.kr/<key>
  const cdnOrigin = resolveCdnOrigin(cdnBaseUrl);
  if (cdnOrigin && url.origin === cdnOrigin) {
    const objectPath = url.pathname.replace(/^\/+/, "");
    // 이미 변환 URL이면 다시 감싸지 않는다
    return objectPath && !objectPath.startsWith("cdn-cgi/") ? objectPath : null;
  }

  return null;
};

/**
 * buildImageUrl 이미지 요청 URL을 생성합니다.
 * @param params next/image가 전달하는 src·width·quality 입력값입니다.
 * @param cdnBaseUrl Cloudflare 변환을 수행할 R2 커스텀 도메인 베이스 URL입니다. 비어 있으면 변환하지 않습니다.
 * @returns 브라우저가 실제로 요청할 이미지 URL을 반환합니다.
 * @remarks 환경 변수에 의존하지 않는 순수 함수라 단위 테스트에서 직접 호출합니다.
 */
export const buildImageUrl = (
  params: ImageLoaderParams,
  cdnBaseUrl: string | null | undefined,
): string => {
  const normalizedBaseUrl = cdnBaseUrl?.trim()
    ? trimTrailingSlash(cdnBaseUrl.trim())
    : null;
  if (!normalizedBaseUrl) {
    return params.src;
  }

  const objectPath = extractObjectPath(params.src, normalizedBaseUrl);
  if (!objectPath) {
    return params.src;
  }

  const options = [
    ...TRANSFORM_BASE_OPTIONS,
    `width=${params.width}`,
    `quality=${params.quality ?? DEFAULT_QUALITY}`,
  ].join(",");

  return `${normalizedBaseUrl}/cdn-cgi/image/${options}/${objectPath}`;
};

/**
 * cloudflareImageLoader next/image가 호출하는 전역 로더 진입점입니다.
 * @param params next/image가 전달하는 src·width·quality 입력값입니다.
 * @returns 브라우저가 실제로 요청할 이미지 URL을 반환합니다.
 * @remarks NEXT_PUBLIC_IMAGE_CDN_BASE_URL은 빌드 타임에 인라인되므로 값 변경 시 재빌드가 필요합니다.
 */
export default function cloudflareImageLoader(params: ImageLoaderParams): string {
  return buildImageUrl(params, process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL);
}
