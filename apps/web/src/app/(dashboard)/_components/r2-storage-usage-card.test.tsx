import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import R2StorageUsageCard from "./r2-storage-usage-card";

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("R2StorageUsageCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it("정상 조회 시 사용량/사용률/남은 용량과 진행률을 표시한다", async () => {
    const limit = 10 * 1024 * 1024 * 1024;
    const used = 5 * 1024 * 1024 * 1024;

    await act(async () => {
      root.render(
        <R2StorageUsageCard
          stats={{
            usersTotal: 0,
            unverifiedUsersTotal: 0,
            generationsTotal: 0,
            selectedGenerationMembersTotal: 0,
            selectedGenerationActivitiesTotal: 0,
            selectedGenerationExhibitionsTotal: 0,
            linktreeLinksTotal: 0,
            r2StorageUsedBytes: used,
            r2StorageLimitBytes: limit,
            r2StorageUsageAvailable: true,
          }}
        />,
      );
    });

    expect(container.textContent).toContain("파일 저장공간 사용량");
    expect(container.textContent).toContain("5 GB / 10 GB");
    expect(container.textContent).toContain("사용률 50.0%");
    expect(container.textContent).toContain("남은 용량 5 GB");
    const meter = container.querySelector("[data-testid='r2-usage-meter']") as HTMLElement | null;
    expect(meter).toBeInTheDocument();
    expect(meter?.style.width).toBe("50%");
  });

  it("조회 불가 상태면 실패 문구를 표시한다", async () => {
    await act(async () => {
      root.render(
        <R2StorageUsageCard
          stats={{
            usersTotal: 0,
            unverifiedUsersTotal: 0,
            generationsTotal: 0,
            selectedGenerationMembersTotal: 0,
            selectedGenerationActivitiesTotal: 0,
            selectedGenerationExhibitionsTotal: 0,
            linktreeLinksTotal: 0,
            r2StorageUsedBytes: 0,
            r2StorageLimitBytes: 10 * 1024 * 1024 * 1024,
            r2StorageUsageAvailable: false,
          }}
        />,
      );
    });

    expect(container.textContent).toContain("사용량을 불러오지 못했습니다.");
    expect(container.querySelector("[data-testid='r2-usage-meter']")).not.toBeInTheDocument();
  });

  it("데이터가 없으면 실패 문구를 표시한다", async () => {
    await act(async () => {
      root.render(<R2StorageUsageCard stats={null} />);
    });

    expect(container.textContent).toContain("사용량을 불러오지 못했습니다.");
    expect(container.querySelector("[data-testid='r2-usage-meter']")).not.toBeInTheDocument();
  });
});
