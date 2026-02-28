import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listCachedExhibitions = vi.fn();
const readServerCookieHeader = vi.fn();

vi.mock("../../../../../../lib/admin-dashboard-cache", () => ({
  listCachedExhibitions: (...args: unknown[]) => listCachedExhibitions(...args),
}));

vi.mock("../../../../../../lib/admin-generation-server", () => ({
  readServerCookieHeader: (...args: unknown[]) => readServerCookieHeader(...args),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = {
      ...props,
    } as Record<string, unknown>;
    delete rest.fill;
    delete rest.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("GenerationExhibitionsList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    listCachedExhibitions.mockReset();
    readServerCookieHeader.mockReset();
    readServerCookieHeader.mockResolvedValue("session=abc");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("현재 기수 ID를 포함해 전시 목록을 조회한다", async () => {
    listCachedExhibitions.mockResolvedValue([
      {
        id: "exhibition-1",
        title: "60기 정기전",
        description: "설명",
        startDate: Date.parse("2030-03-01T00:00:00.000Z"),
        endDate: Date.parse("2030-03-02T00:00:00.000Z"),
        coverImageUrl: "https://example.com/cover-1.jpg",
        generationId: "generation-60",
        place: "서울",
        createdAt: Date.parse("2030-03-01T00:00:00.000Z"),
        updatedAt: Date.parse("2030-03-01T00:00:00.000Z"),
        detailImages: [],
      },
    ]);

    const { default: GenerationExhibitionsList } = await import("./generation-exhibitions-list");
    const tree = await GenerationExhibitionsList({
      generationId: "generation-60",
      generationName: "60기",
      generationPath: "/dashboard/60%EA%B8%B0",
      canManage: true,
    });

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedExhibitions).toHaveBeenCalledTimes(1);
    expect(listCachedExhibitions).toHaveBeenCalledWith("generation-60", "session=abc");
    expect(
      container.querySelector("[data-testid='generation-exhibition-card-exhibition-1']"),
    ).toBeInTheDocument();
  });

  it("권한이 없으면 전시 추가 버튼을 노출하지 않는다", async () => {
    listCachedExhibitions.mockResolvedValue([]);

    const { default: GenerationExhibitionsList } = await import("./generation-exhibitions-list");
    const tree = await GenerationExhibitionsList({
      generationId: "generation-60",
      generationName: "60기",
      generationPath: "/dashboard/60%EA%B8%B0",
      canManage: false,
    });

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedExhibitions).toHaveBeenCalledWith("generation-60", "session=abc");
    expect(container.textContent).toContain("전시를 등록하거나 수정할 권한이 없습니다.");
    expect(container.textContent).not.toContain("전시 추가");
  });
});
