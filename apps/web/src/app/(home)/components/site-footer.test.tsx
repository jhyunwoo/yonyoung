import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "@repo/shared-api-contracts";

const getPublicSiteSettingsMock = vi.fn(async () => DEFAULT_SITE_SETTINGS);

vi.mock("next/image", () => ({
  default: ({
    unoptimized,
    ...rest
  }: {
    unoptimized?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-unoptimized={String(Boolean(unoptimized))} {...rest} />
  ),
}));

vi.mock("../../../lib/public-api", () => ({
  getPublicSiteSettings: getPublicSiteSettingsMock,
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("SiteFooter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-07-12T00:00:00.000Z"));
    getPublicSiteSettingsMock.mockResolvedValue(DEFAULT_SITE_SETTINGS);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("현재 연도를 포함한 저작권 문구를 렌더링한다", async () => {
    const { default: SiteFooter } = await import("./site-footer");
    const footer = await SiteFooter();

    await act(async () => {
      root.render(footer);
      await Promise.resolve();
    });

    expect(container.textContent).toContain(
      "© 2031 연세대학교 중앙사진동아리 연영회. All rights reserved.",
    );
  });
});
