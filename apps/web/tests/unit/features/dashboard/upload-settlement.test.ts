import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";

vi.mock("@/features/dashboard/api/admin-api/http", () => ({
  adminRequest: vi.fn(),
}));

const adminRequestMock = vi.mocked(adminRequest);

const presignResponse = (reservationId?: string) => ({
  uploadUrl: "https://upload.example.com/signed",
  objectKey: "activities/detail/object-key",
  publicUrl: "https://cdn.example.com/activities/detail/object-key",
  requiredHeaders: { "Content-Type": "image/png" },
  ...(reservationId === undefined ? {} : { reservationId }),
});

const createFile = () =>
  new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });

const settleCalls = () =>
  adminRequestMock.mock.calls.filter(([path]) => path === "/uploads/settle");

describe("features/dashboard/api/admin-api/upload 정산", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminRequestMock.mockReset();
  });

  it("업로드에 성공하면 용량 예약을 completed로 정산한다", async () => {
    adminRequestMock.mockImplementation(async (path) =>
      path === PRESIGN_PATHS.activityDetail
        ? presignResponse("reservation-1")
        : undefined,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const publicUrl = await uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityDetail,
      file: createFile(),
    });

    expect(publicUrl).toBe("https://cdn.example.com/activities/detail/object-key");
    expect(settleCalls()).toEqual([
      [
        "/uploads/settle",
        "POST",
        { reservationId: "reservation-1", outcome: "completed" },
      ],
    ]);
  });

  it("업로드에 실패하면 예약을 aborted로 정산하고 에러를 다시 던진다", async () => {
    adminRequestMock.mockImplementation(async (path) =>
      path === PRESIGN_PATHS.activityDetail
        ? presignResponse("reservation-2")
        : undefined,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityDetail,
        file: createFile(),
      }),
    ).rejects.toThrow();

    expect(settleCalls()).toEqual([
      ["/uploads/settle", "POST", { reservationId: "reservation-2", outcome: "aborted" }],
    ]);
  });

  it("정산 호출이 실패해도 이미 끝난 업로드를 되돌리지 않는다", async () => {
    adminRequestMock.mockImplementation(async (path) => {
      if (path === PRESIGN_PATHS.activityDetail) {
        return presignResponse("reservation-3");
      }
      throw new Error("settle failed");
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityDetail,
        file: createFile(),
      }),
    ).resolves.toBe("https://cdn.example.com/activities/detail/object-key");
  });

  it("reservationId를 내려주지 않는 구버전 API 응답에는 정산을 건너뛴다", async () => {
    adminRequestMock.mockImplementation(async () => presignResponse());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityDetail,
      file: createFile(),
    });

    expect(settleCalls()).toEqual([]);
  });
});
