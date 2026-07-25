import { describe, expect, it } from "vitest";
import { buildImageUrl } from "@/features/media/images/cloudflare-image-loader";

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
        `/_next/image?url=${encodeURIComponent(alreadyTransformed)}&w=640&q=75`,
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

    it("로컬 정적 자산은 /_next/image로 폴백한다", () => {
      expect(
        buildImageUrl({ src: "/yonyoung-logo-black.png", width: 96 }, CDN_BASE_URL),
      ).toBe("/_next/image?url=%2Fyonyoung-logo-black.png&w=96&q=75");
    });

    it("미디어 호스트가 아닌 원격 URL은 /_next/image로 폴백한다", () => {
      const src = "https://lh3.googleusercontent.com/a/profile=s96-c";

      expect(buildImageUrl({ src, width: 96 }, CDN_BASE_URL)).toBe(
        `/_next/image?url=${encodeURIComponent(src)}&w=96&q=75`,
      );
    });

    it("URL로 파싱할 수 없는 값은 /_next/image로 폴백한다", () => {
      expect(buildImageUrl({ src: "not a url", width: 640 }, CDN_BASE_URL)).toBe(
        `/_next/image?url=${encodeURIComponent("not a url")}&w=640&q=75`,
      );
    });
  });

  describe("CDN 베이스 URL이 없는 경우 (롤백 스위치)", () => {
    it.each([undefined, null, "", "   "])(
      "%s이면 기존 /_next/image 경로를 그대로 쓴다",
      (base) => {
        const src = `https://yonyoung.yonsei.ac.kr/api/public/media/${OBJECT_KEY}?sig=abc123`;

        expect(buildImageUrl({ src, width: 1080, quality: 75 }, base)).toBe(
          `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`,
        );
      },
    );
  });
});
