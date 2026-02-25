import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listActivities = vi.fn();

vi.mock("../../../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    listActivities: (...args: unknown[]) => listActivities(...args),
  },
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

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

// Vite test transform in this project expects React to exist at runtime for JSX files.
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("GenerationActivitiesList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    listActivities.mockReset();
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

  it("현재 기수 ID를 포함해 활동 목록을 조회한다", async () => {
    listActivities.mockResolvedValue([
      {
        id: "activity-1",
        title: "60기 워크숍",
        description: "설명",
        startDate: Date.parse("2030-03-01T00:00:00.000Z"),
        endDate: Date.parse("2030-03-02T00:00:00.000Z"),
        coverImageUrl: "https://example.com/cover-1.jpg",
        generationId: "generation-60",
        createdAt: Date.parse("2030-03-01T00:00:00.000Z"),
        updatedAt: Date.parse("2030-03-01T00:00:00.000Z"),
        detailImages: [],
      },
    ]);

    const { default: GenerationActivitiesList } = await import("./generation-activities-list");

    await act(async () => {
      root.render(
        <GenerationActivitiesList
          generationId="generation-60"
          generationName="60기"
          generationPath="/dashboard/60%EA%B8%B0"
          canManage
        />,
      );
      await flushEffects();
    });

    expect(listActivities).toHaveBeenCalledTimes(1);
    expect(listActivities).toHaveBeenCalledWith({ generationId: "generation-60" });
    expect(
      container.querySelector("[data-testid='generation-activity-card-activity-1']"),
    ).toBeInTheDocument();
  });

  it("권한이 없으면 활동 추가 버튼을 노출하지 않는다", async () => {
    listActivities.mockResolvedValue([]);

    const { default: GenerationActivitiesList } = await import("./generation-activities-list");

    await act(async () => {
      root.render(
        <GenerationActivitiesList
          generationId="generation-60"
          generationName="60기"
          generationPath="/dashboard/60%EA%B8%B0"
          canManage={false}
        />,
      );
      await flushEffects();
    });

    expect(listActivities).toHaveBeenCalledTimes(1);
    expect(listActivities).toHaveBeenCalledWith({ generationId: "generation-60" });
    expect(container.textContent).toContain("활동 생성/수정 권한이 없습니다.");
    expect(container.textContent).not.toContain("활동 추가");
  });
});
