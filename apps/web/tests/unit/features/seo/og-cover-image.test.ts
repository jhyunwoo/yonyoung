import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadOgCoverImage,
  resolveTrustedOgCoverUrl,
} from "@/features/seo/og/og-cover-image";

const SITE_URL = "https://app.example.com";
const CDN_URL = "https://media.example.com";

describe("features/seo/og/og-cover-image", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalCdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL = CDN_URL;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    if (originalCdnUrl === undefined) {
      delete process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL = originalCdnUrl;
    }
  });

  it("rejects loopback and unrelated external destinations", async () => {
    expect(
      resolveTrustedOgCoverUrl("http://127.0.0.1/internal.png", {
        siteUrl: SITE_URL,
        cdnBaseUrl: CDN_URL,
      }),
    ).toBeNull();
    expect(
      resolveTrustedOgCoverUrl("https://evil.example/image.png", {
        siteUrl: SITE_URL,
        cdnBaseUrl: CDN_URL,
      }),
    ).toBeNull();

    await expect(loadOgCoverImage("http://127.0.0.1/internal.png")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves signed public media through the configured image CDN", () => {
    const resolved = resolveTrustedOgCoverUrl(
      `${SITE_URL}/api/public/media/activities/user/cover/photo.jpg?sig=abc`,
      { siteUrl: SITE_URL, cdnBaseUrl: CDN_URL },
    );

    expect(resolved).toBe(
      `${CDN_URL}/cdn-cgi/image/format=jpeg,fit=cover,metadata=none,onerror=redirect,width=1200,height=630,quality=80/activities/user/cover/photo.jpg`,
    );
  });

  it("allows only the configured site media path when the CDN is disabled", () => {
    expect(
      resolveTrustedOgCoverUrl("/api/public/media/activities/photo.jpg?sig=abc", {
        siteUrl: SITE_URL,
        cdnBaseUrl: undefined,
      }),
    ).toBe(`${SITE_URL}/api/public/media/activities/photo.jpg?sig=abc`);
    expect(
      resolveTrustedOgCoverUrl(`${SITE_URL}/admin/internal.png`, {
        siteUrl: SITE_URL,
        cdnBaseUrl: undefined,
      }),
    ).toBeNull();
  });

  it("fetches a trusted media URL without following redirects", async () => {
    delete process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL;
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    await expect(
      loadOgCoverImage("/api/public/media/activities/photo.png?sig=abc"),
    ).resolves.toBe("data:image/png;base64,AQID");
    expect(fetchMock).toHaveBeenCalledWith(
      `${SITE_URL}/api/public/media/activities/photo.png?sig=abc`,
      expect.objectContaining({
        redirect: "error",
      }),
    );
  });

  // 실패를 예외로 던지면 캐시에 남지 않아 OG 프리렌더의 두 번째 실행이 다시 네트워크를 탄다
  // (Sentry: "used IO that was not cached"). 실패도 null 값으로 돌려줘 캐시되게 한다.
  it("returns null instead of throwing when the CDN responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    await expect(
      loadOgCoverImage(`${SITE_URL}/api/public/media/activities/photo.jpg?sig=abc`),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
