import { describe, expect, it } from "vitest";
import {
  buildCloudflareTransformUrl,
  buildImageUrl,
} from "@/features/media/images/cloudflare-image-loader";

const CDN_BASE_URL = "https://storage.yonyoung.moveto.kr";
const OBJECT_KEY = "activities/user-abc/cover/2608c868-6e55-4231-98cc-e57db4bff11f-5.jpg";

describe("buildImageUrl", () => {
  describe("CDN 베이스 URL이 설정된 경우", () => {
    it("절대 프록시 URL을 Cloudflare 변환 URL로 바꾼다", () => {
      const url = buildImageUrl(
        {
          src: `https://yonyoung.yonsei.ac.kr/api/public/media/${OBJECT_KEY}?sig=abc123`,
          width: 828,
          quality: 75,
        },
        CDN_BASE_URL,
      );

      expect(url).toBe(
        `${CDN_BASE_URL}/cdn-cgi/image/format=auto,fit=scale-down,metadata=none,onerror=redirect,width=828,quality=75/${OBJECT_KEY}`,
      );
    });

    it("상대 경로 프록시 URL도 변환한다", () => {
      const url = buildImageUrl(
        { src: `/api/public/media/${OBJECT_KEY}?sig=abc123`, width: 640 },
        CDN_BASE_URL,
      );

      expect(url).toContain(`/cdn-cgi/image/`);
      expect(url).toContain(`,width=640,quality=75/${OBJECT_KEY}`);
    });

    it("레거시 R2 직접 URL도 변환한다", () => {
      const url = buildImageUrl(
        { src: `${CDN_BASE_URL}/${OBJECT_KEY}`, width: 1080 },
        CDN_BASE_URL,
      );

      expect(url).toBe(
        `${CDN_BASE_URL}/cdn-cgi/image/format=auto,fit=scale-down,metadata=none,onerror=redirect,width=1080,quality=75/${OBJECT_KEY}`,
      );
    });

    it("이미 변환된 URL은 다시 감싸지 않는다", () => {
      const alreadyTransformed = `${CDN_BASE_URL}/cdn-cgi/image/width=640/${OBJECT_KEY}`;

      expect(buildImageUrl({ src: alreadyTransformed, width: 640 }, CDN_BASE_URL)).toBe(
        alreadyTransformed,
      );
    });

    it("퍼센트 인코딩된 파일명을 이중 인코딩하지 않는다", () => {
      const encodedKey = "activities/user-abc/cover/5bc09a56-1__31_.jpg";
      const url = buildImageUrl(
        {
          src: `https://yonyoung.yonsei.ac.kr/api/public/media/${encodedKey}?sig=x`,
          width: 640,
        },
        CDN_BASE_URL,
      );

      expect(url.endsWith(`/${encodedKey}`)).toBe(true);
      expect(url).not.toContain("%25");
    });

    it("공백이 인코딩된 키의 %20을 보존한다", () => {
      const encodedKey = "activities/user-abc/cover/my%20photo.jpg";
      const url = buildImageUrl(
        {
          src: `https://yonyoung.yonsei.ac.kr/api/public/media/${encodedKey}?sig=x`,
          width: 640,
        },
        CDN_BASE_URL,
      );

      expect(url.endsWith(`/${encodedKey}`)).toBe(true);
    });

    it("베이스 URL 끝의 슬래시를 제거한다", () => {
      const url = buildImageUrl(
        { src: `/api/public/media/${OBJECT_KEY}`, width: 640 },
        `${CDN_BASE_URL}/`,
      );

      expect(url.startsWith(`${CDN_BASE_URL}/cdn-cgi/image/`)).toBe(true);
    });

    it("quality 미지정 시 75를 사용한다", () => {
      const url = buildImageUrl(
        { src: `/api/public/media/${OBJECT_KEY}`, width: 640 },
        CDN_BASE_URL,
      );

      expect(url).toContain("quality=75");
    });

    it("로컬 정적 자산은 src를 그대로 반환한다", () => {
      expect(
        buildImageUrl({ src: "/yonyoung-logo-black.png", width: 96 }, CDN_BASE_URL),
      ).toBe("/yonyoung-logo-black.png");
    });

    it("미디어 호스트가 아닌 원격 URL은 src를 그대로 반환한다", () => {
      const src = "https://lh3.googleusercontent.com/a/profile=s96-c";

      expect(buildImageUrl({ src, width: 96 }, CDN_BASE_URL)).toBe(src);
    });

    it("URL로 파싱할 수 없는 값은 src를 그대로 반환한다", () => {
      expect(buildImageUrl({ src: "not a url", width: 640 }, CDN_BASE_URL)).toBe(
        "not a url",
      );
    });
  });

  describe("CDN 베이스 URL이 없는 경우 (롤백 스위치)", () => {
    it.each([undefined, null, "", "   "])("%s이면 src를 그대로 반환한다", (base) => {
      const src = `https://yonyoung.yonsei.ac.kr/api/public/media/${OBJECT_KEY}?sig=abc123`;

      expect(buildImageUrl({ src, width: 1080, quality: 75 }, base)).toBe(src);
    });
  });

  // OG 이미지 생성이 쓰는 진입점. next/og(satori)는 Accept 협상 없이 바이트를 직접
  // 디코딩하므로 format=auto가 아니라 jpeg로 고정해야 하고, 1200×630을 정확히 채워야 한다.
  describe("buildCloudflareTransformUrl", () => {
    it("OG 카드용 jpeg·cover·고정 크기 변환 URL을 만든다", () => {
      const url = buildCloudflareTransformUrl(
        `https://yonyoung.yonsei.ac.kr/api/public/media/${OBJECT_KEY}?sig=abc123`,
        CDN_BASE_URL,
        { width: 1200, height: 630, quality: 80, format: "jpeg", fit: "cover" },
      );

      expect(url).toBe(
        `${CDN_BASE_URL}/cdn-cgi/image/format=jpeg,fit=cover,metadata=none,onerror=redirect,width=1200,height=630,quality=80/${OBJECT_KEY}`,
      );
    });

    it("height를 생략하면 URL에도 넣지 않는다", () => {
      const url = buildCloudflareTransformUrl(
        `/api/public/media/${OBJECT_KEY}`,
        CDN_BASE_URL,
        { width: 640 },
      );

      expect(url).not.toContain("height=");
    });

    it("변환 대상이 아닌 src는 null을 반환한다", () => {
      expect(
        buildCloudflareTransformUrl("/yonyoung-logo-black.png", CDN_BASE_URL, {
          width: 1200,
        }),
      ).toBeNull();
    });

    it("CDN 베이스 URL이 없으면 null을 반환한다", () => {
      expect(
        buildCloudflareTransformUrl(`/api/public/media/${OBJECT_KEY}`, undefined, {
          width: 1200,
        }),
      ).toBeNull();
    });
  });

  // images.loader가 "custom"이면 Next.js는 /_next/image 엔드포인트를 제공하지 않는다.
  // 이 경로로 URL을 만들면 404가 되므로 로더는 절대 이 문자열을 방출해서는 안 된다.
  describe("/_next/image 엔드포인트를 절대 참조하지 않는다", () => {
    const everySrc = [
      `https://yonyoung.yonsei.ac.kr/api/public/media/${OBJECT_KEY}?sig=abc123`,
      `/api/public/media/${OBJECT_KEY}?sig=abc123`,
      `${CDN_BASE_URL}/${OBJECT_KEY}`,
      `${CDN_BASE_URL}/cdn-cgi/image/width=640/${OBJECT_KEY}`,
      "/yonyoung-logo-black.png",
      "/yonyong-logo-white.png",
      "https://lh3.googleusercontent.com/a/profile=s96-c",
      "https://images.mock.local/activities/act-1-1.jpg",
      "not a url",
      "",
    ];

    it.each(everySrc)("src=%s (CDN 설정됨)", (src) => {
      expect(buildImageUrl({ src, width: 640 }, CDN_BASE_URL)).not.toContain(
        "/_next/image",
      );
    });

    it.each(everySrc)("src=%s (CDN 미설정)", (src) => {
      expect(buildImageUrl({ src, width: 640 }, undefined)).not.toContain("/_next/image");
    });
  });
});
