import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent } from "react";

import {
  toSortedDetailImageItems,
  useDetailImageField,
} from "@/features/media/upload/use-detail-image-field";

const existingImages = [
  { id: "img-b", imageUrl: "https://cdn.example.com/b.jpg", sortOrder: 1 },
  { id: "img-a", imageUrl: "https://cdn.example.com/a.jpg", sortOrder: 0 },
];

describe("useDetailImageField", () => {
  it("기존 사진은 sortOrder 순서로 시작하고 초기 목록은 한 번만 만든다", () => {
    const createInitialItems = vi.fn(() => toSortedDetailImageItems(existingImages));
    const { result, rerender } = renderHook(() =>
      useDetailImageField(createInitialItems),
    );
    rerender();

    expect(result.current.items.map((item) => item.id)).toEqual(["img-a", "img-b"]);
    expect(createInitialItems).toHaveBeenCalledTimes(1);
  });

  it("지운 기존 사진 id만 모으고, 서버 삭제가 끝난 id는 잊는다", () => {
    URL.createObjectURL = () => "blob:new";
    URL.revokeObjectURL = () => {};
    const { result } = renderHook(() =>
      useDetailImageField(() => toSortedDetailImageItems(existingImages)),
    );

    act(() => {
      result.current.onFilesChange({
        target: { files: [new File(["x"], "new.png")], value: "" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });
    const newItemId = result.current.items[2]?.id ?? "";
    expect(result.current.items[2]?.source).toBe("new");

    act(() => result.current.remove(newItemId));
    act(() => result.current.remove("img-a"));
    act(() => result.current.remove("img-a"));

    expect(result.current.items.map((item) => item.id)).toEqual(["img-b"]);
    expect(result.current.deletedImageIds).toEqual(["img-a"]);

    act(() => result.current.forgetDeletedImageIds(["img-a"]));
    expect(result.current.deletedImageIds).toEqual([]);
  });

  it("그리드가 넘긴 순서대로 다시 정렬한다", () => {
    const { result } = renderHook(() =>
      useDetailImageField(() => toSortedDetailImageItems(existingImages)),
    );
    const reorder = result.current.reorder;

    act(() => result.current.reorder([{ id: "img-b" }, { id: "img-a" }]));

    expect(result.current.items.map((item) => item.id)).toEqual(["img-b", "img-a"]);
    expect(result.current.reorder).toBe(reorder);
  });
});
