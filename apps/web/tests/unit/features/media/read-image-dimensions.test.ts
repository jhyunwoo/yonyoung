import { afterEach, describe, expect, it, vi } from "vitest";
import { readImageDimensions } from "@/features/media/images/read-image-dimensions";

/** onload/onerror를 제어할 수 있는 가짜 Image 클래스를 만들어 전역에 주입한다. */
const stubImageElement = (options: {
  naturalWidth: number;
  naturalHeight: number;
  shouldFail?: boolean;
}) => {
  class FakeImage {
    naturalWidth = options.naturalWidth;
    naturalHeight = options.naturalHeight;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        if (options.shouldFail) {
          this.onerror?.();
          return;
        }
        this.onload?.();
      });
    }
  }

  vi.stubGlobal("Image", FakeImage);
};

const createFakeFile = () =>
  new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });

describe("readImageDimensions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createImageBitmap이 지원되면 비트맵 크기를 반환한다", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1600, height: 2400, close })),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const result = await readImageDimensions(createFakeFile());

    expect(result).toEqual({ width: 1600, height: 2400 });
    expect(close).toHaveBeenCalled();
  });

  it("createImageBitmap 실패 시 <img> 프리로드 폴백으로 크기를 읽는다", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("unsupported format");
      }),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    stubImageElement({ naturalWidth: 800, naturalHeight: 1200 });

    const result = await readImageDimensions(createFakeFile());

    expect(result).toEqual({ width: 800, height: 1200 });
  });

  it("두 방식 모두 실패하면 null을 반환한다 (업로드는 계속 진행 가능)", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("unsupported format");
      }),
    );
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL,
    });
    stubImageElement({ naturalWidth: 0, naturalHeight: 0, shouldFail: true });

    const result = await readImageDimensions(createFakeFile());

    expect(result).toBeNull();
    // 실패 경로에서도 object URL이 정리되어야 한다 (메모리 누수 방지)
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("크기가 0인 이미지는 null로 처리한다", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 0, height: 0, close: vi.fn() })),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    stubImageElement({ naturalWidth: 0, naturalHeight: 0 });

    const result = await readImageDimensions(createFakeFile());

    expect(result).toBeNull();
  });
});
