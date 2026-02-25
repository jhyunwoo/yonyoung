import React, { useEffect } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExistingUploadImageItem,
  type UploadImageItem,
} from "./image-upload-state";
import { useImageUploadState } from "./use-image-upload-state";

type HookSnapshot = ReturnType<typeof useImageUploadState>;

const Harness = (props: {
  initialItems?: UploadImageItem[];
  onSnapshot: (snapshot: HookSnapshot) => void;
}) => {
  const snapshot = useImageUploadState({
    initialItems: props.initialItems ?? [],
  });

  useEffect(() => {
    props.onSnapshot(snapshot);
  }, [props, snapshot]);

  return (
    <div data-testid="count">
      {snapshot.items.map((item) => (
        <span key={item.id} data-item-id={item.id} data-item-url={item.imageUrl} />
      ))}
    </div>
  );
};

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("useImageUploadState", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestSnapshot: HookSnapshot | null;

  beforeEach(async () => {
    latestSnapshot = null;
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

  it("append/remove/reorder/clear를 수행하고 object URL을 정리한다", async () => {
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:new-1")
      .mockReturnValueOnce("blob:new-2")
      .mockReturnValueOnce("blob:new-3");
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    await act(async () => {
      root.render(
        <Harness
          onSnapshot={(snapshot) => {
            latestSnapshot = snapshot;
          }}
        />,
      );
      await Promise.resolve();
    });

    const firstFile = new File(["a"], "a.png", { type: "image/png" });
    const secondFile = new File(["b"], "b.png", { type: "image/png" });

    await act(async () => {
      latestSnapshot?.appendFiles([firstFile, secondFile]);
      await Promise.resolve();
    });

    expect(latestSnapshot?.items.map((item) => item.imageUrl)).toEqual([
      "blob:new-1",
      "blob:new-2",
    ]);

    const firstId = latestSnapshot?.items[0]?.id ?? "";
    const secondId = latestSnapshot?.items[1]?.id ?? "";

    await act(async () => {
      latestSnapshot?.removeItemById(firstId);
      await Promise.resolve();
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:new-1");
    expect(latestSnapshot?.items.map((item) => item.imageUrl)).toEqual([
      "blob:new-2",
    ]);

    await act(async () => {
      latestSnapshot?.appendFiles([firstFile]);
      await Promise.resolve();
    });

    const thirdId = latestSnapshot?.items[1]?.id ?? "";
    expect(latestSnapshot?.items).toHaveLength(2);

    await act(async () => {
      latestSnapshot?.reorderByIds([thirdId, secondId]);
      await Promise.resolve();
    });
    expect(latestSnapshot?.items.map((item) => item.id)).toEqual([thirdId, secondId]);

    await act(async () => {
      latestSnapshot?.clear();
      await Promise.resolve();
    });
    expect(latestSnapshot?.items).toHaveLength(0);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:new-2");

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it("replaceItems는 제거된 new 아이템의 object URL을 해제한다", async () => {
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    const initialItems: UploadImageItem[] = [
      {
        id: "new-1",
        imageUrl: "blob:new-1",
        source: "new",
        file: new File(["a"], "a.png", { type: "image/png" }),
      },
      createExistingUploadImageItem({
        id: "existing-1",
        imageUrl: "https://example.com/a.jpg",
      }),
    ];

    await act(async () => {
      root.render(
        <Harness
          initialItems={initialItems}
          onSnapshot={(snapshot) => {
            latestSnapshot = snapshot;
          }}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestSnapshot).not.toBeNull();

    await act(async () => {
      latestSnapshot!.replaceItems([
        createExistingUploadImageItem({
          id: "existing-1",
          imageUrl: "https://example.com/a.jpg",
        }),
      ]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:new-1");
    expect(latestSnapshot?.items).toHaveLength(1);
    expect(latestSnapshot?.items[0]?.id).toBe("existing-1");
    revokeObjectURLSpy.mockRestore();
  });
});
