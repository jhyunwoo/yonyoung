import { describe, expect, it, vi } from "vitest";
import {
  createExistingUploadImageItem,
  createNewUploadImageItem,
  readFileList,
  reorderUploadImageItems,
  revokeUploadImageItem,
  revokeUploadImageItems,
} from "./image-upload-state";

describe("image-upload-state", () => {
  it("readFileList는 null이면 빈 배열을 반환한다", () => {
    expect(readFileList(null)).toEqual([]);
  });

  it("새 파일 아이템을 생성한다", () => {
    const objectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:new-1");
    const file = new File(["a"], "a.png", { type: "image/png" });

    const item = createNewUploadImageItem(file, "detail");

    expect(item.id.startsWith("detail-")).toBe(true);
    expect(item.source).toBe("new");
    expect(item.file).toBe(file);
    expect(item.imageUrl).toBe("blob:new-1");
    objectUrlSpy.mockRestore();
  });

  it("기존 URL 아이템을 생성한다", () => {
    const item = createExistingUploadImageItem({
      id: "existing-1",
      imageUrl: "https://example.com/a.jpg",
    });

    expect(item).toEqual({
      id: "existing-1",
      imageUrl: "https://example.com/a.jpg",
      source: "existing",
      file: null,
    });
  });

  it("정렬 id 순서대로 아이템을 재배열한다", () => {
    const sourceItems = [
      createExistingUploadImageItem({
        id: "a",
        imageUrl: "https://example.com/a.jpg",
      }),
      createExistingUploadImageItem({
        id: "b",
        imageUrl: "https://example.com/b.jpg",
      }),
      createExistingUploadImageItem({
        id: "c",
        imageUrl: "https://example.com/c.jpg",
      }),
    ];

    const reordered = reorderUploadImageItems(sourceItems, ["c", "a", "missing"]);

    expect(reordered.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("revokeUploadImageItem은 new source만 revoke한다", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const existingItem = createExistingUploadImageItem({
      id: "existing-1",
      imageUrl: "https://example.com/a.jpg",
    });
    const newItem = {
      id: "new-1",
      imageUrl: "blob:new-1",
      source: "new" as const,
      file: new File(["a"], "a.png", { type: "image/png" }),
    };

    revokeUploadImageItem(existingItem);
    revokeUploadImageItem(newItem);

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:new-1");
    revokeSpy.mockRestore();
  });

  it("revokeUploadImageItems는 목록 전체를 처리한다", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    revokeUploadImageItems([
      createExistingUploadImageItem({
        id: "existing-1",
        imageUrl: "https://example.com/a.jpg",
      }),
      {
        id: "new-1",
        imageUrl: "blob:new-1",
        source: "new",
        file: new File(["a"], "a.png", { type: "image/png" }),
      },
      {
        id: "new-2",
        imageUrl: "blob:new-2",
        source: "new",
        file: new File(["b"], "b.png", { type: "image/png" }),
      },
    ]);

    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenNthCalledWith(1, "blob:new-1");
    expect(revokeSpy).toHaveBeenNthCalledWith(2, "blob:new-2");
    revokeSpy.mockRestore();
  });
});
