import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_PUBLIC_MEDIA_IMAGE_ORIGINS = [
  "https://yonyoung.yonsei.ac.kr",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;
type RemoteImagePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
  port?: string;
};
const CSP_CONNECT_SOURCES = [
  "'self'",
  "https://vitals.vercel-insights.com",
  "https://va.vercel-scripts.com",
  "https://*.r2.cloudflarestorage.com",
] as const;

const buildPublicMediaRemotePatterns = (): RemoteImagePattern[] => {
  const candidateOrigins = new Set<string>(DEFAULT_PUBLIC_MEDIA_IMAGE_ORIGINS);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    candidateOrigins.add(configuredSiteUrl);
  }

  return [...candidateOrigins].flatMap((origin) => {
    try {
      const url = new URL(origin);

      return [
        {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          pathname: "/api/public/media/**",
          ...(url.port ? { port: url.port } : {}),
        },
      ];
    } catch {
      return [];
    }
  });
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  // 이미지 출처는 실제 사용하는 호스트로 한정한다:
  // 'self'(웹 프록시 미디어), data:/blob:(업로드 미리보기), R2 공개 도메인, 구글 프로필 이미지
  "img-src 'self' data: blob: https://storage.yonyoung.moveto.kr https://*.googleusercontent.com",
  "font-src 'self' data:",
  // 'unsafe-inline'은 cacheComponents(정적 프리렌더)와 nonce 기반 CSP가 호환되지 않아 유지한다.
  // 리치 텍스트는 서버에서 allowlist 필터(FilterXSS)로 정화되므로 실질 XSS 표면은 제한적이다.
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${!isProduction ? " 'unsafe-eval'" : ""}`,
  `connect-src ${CSP_CONNECT_SOURCES.join(" ")}`,
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  cacheComponents: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...buildPublicMediaRemotePatterns(),
      {
        protocol: "https",
        hostname: "storage.yonyoung.moveto.kr",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source:
          "/:path((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
