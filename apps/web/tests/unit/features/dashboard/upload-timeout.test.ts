import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  PRESIGN_PATHS,
  UPLOAD_STALL_TIMEOUT_MS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";

vi.mock("@/features/dashboard/api/admin-api/http", () => ({
  adminRequest: vi.fn(),
}));

const adminRequestMock = vi.mocked(adminRequest);

describe("uploadWithPresign 정지 감지", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    adminRequestMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("PUT이 응답 없이 멈추면 중단하고 예약을 aborted로 정산한다", async () => {
    adminRequestMock.mockImplementation(async (path) =>
      path === PRESIGN_PATHS.activityCover
        ? {
            uploadUrl: "https://upload.example.com/signed",
            objectKey: "activities/cover/key",
            publicUrl: "https://cdn.example.com/activities/cover/key",
            reservationId: "reservation-stall",
          }
        : undefined,
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const pending = uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityCover,
      file: new File([new Uint8Array([1])], "cover.png", { type: "image/png" }),
    });
    const assertion = expect(pending).rejects.toMatchObject({ code: "UPLOAD_TIMEOUT" });

    await vi.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS + 1);
    await assertion;

    expect(adminRequestMock).toHaveBeenCalledWith("/uploads/settle", "POST", {
      reservationId: "reservation-stall",
      outcome: "aborted",
    });
  });
});
