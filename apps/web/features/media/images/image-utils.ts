const OPTIMIZED_HOSTNAMES = [
  "storage.yonyoung.moveto.kr",
  "yonyoung.yonsei.ac.kr",
  "localhost",
  "127.0.0.1",
];

const OPTIMIZED_DOMAIN_SUFFIXES = [
  ".moveto.kr",
  ".yonsei.ac.kr",
  ".googleusercontent.com",
];

/**
 * 신뢰된 미디어 호스트(R2 스토리지, 동아리 웹 도메인, 구글 이미지, 상대 경로 등)는
 * Next.js Image Optimizer(서버 리사이징, WebP/AVIF 인코딩)를 사용할 수 있도록 false를 반환합니다.
 * 검증되지 않은 외부 HTTP/HTTPS URL이나 blob/data URL은 unoptimized: true를 반환합니다.
 */
export const shouldUseUnoptimizedImage = (src: string): boolean => {
  if (!src) {
    return false;
  }

  // 상대 경로는 Next.js 최적화 대상
  if (src.startsWith("/")) {
    return false;
  }

  // blob:이나 data: URL은 브라우저 전용 로드
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return true;
  }

  try {
    const url = new URL(src);
    const hostname = url.hostname.toLowerCase();

    // 환경 변수 도메인 체크
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      try {
        if (new URL(siteUrl).hostname.toLowerCase() === hostname) {
          return false;
        }
      } catch {
        // ignore invalid NEXT_PUBLIC_SITE_URL
      }
    }

    // 허용된 호스트 및 도메인 접미사 체크
    if (OPTIMIZED_HOSTNAMES.includes(hostname)) {
      return false;
    }

    if (OPTIMIZED_DOMAIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      return false;
    }

    // 그 외 검증되지 않은 원격 URL
    return true;
  } catch {
    return false;
  }
};
