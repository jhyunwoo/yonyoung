import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import {
  UPLOAD_BATCH_CONCURRENCY,
  uploadFilesWithPresign,
} from "@/features/dashboard/api/admin-api/upload-batch";
import { AdminApiError } from "@/shared/http/http";

vi.mock("@/features/dashboard/api/admin-api/http", () => ({
  adminRequest: vi.fn(),
}));

const adminRequestMock = vi.mocked(adminRequest);

/** API의 관리자당 동시 예약 한도(upload-reservation.ts)를 흉내 낸다. */
const RESERVATION_LIMIT = 10;

const createFiles = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      new File([new Uint8Array([index])], `photo-${index}.png`, { type: "image/png" }),
  );

describe("uploadFilesWithPresign 동시성", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminRequestMock.mockReset();
  });

  it("예약 한도를 넘는 장수도 슬롯을 재사용해 모두 올리고 입력 순서를 유지한다", async () => {
    let activeReservations = 0;
    let maxActiveReservations = 0;
    let presignCount = 0;

    adminRequestMock.mockImplementation(async (path, _method, body) => {
      if (path === "/uploads/settle") {
        activeReservations -= 1;
        return undefined;
      }

      if (activeReservations >= RESERVATION_LIMIT) {
        throw new AdminApiError({
          status: 409,
          code: "CONFLICT",
          message: "동시에 예약할 수 있는 업로드 수 또는 용량을 초과했습니다.",
        });
      }
      activeReservations += 1;
      maxActiveReservations = Math.max(maxActiveReservations, activeReservations);
      presignCount += 1;
      const { fileName } = body as { fileName: string };
      return {
        uploadUrl: `https://upload.example.com/${fileName}`,
        objectKey: `activities/detail/${fileName}`,
        publicUrl: `https://cdn.example.com/${fileName}`,
        reservationId: `reservation-${presignCount}`,
      };
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return new Response(null, { status: 200 });
    });

    const files = createFiles(25);
    const urls = await uploadFilesWithPresign({
      presignPath: PRESIGN_PATHS.activityDetail,
      files,
    });

    expect(urls).toEqual(files.map((file) => `https://cdn.example.com/${file.name}`));
    expect(maxActiveReservations).toBeLessThanOrEqual(UPLOAD_BATCH_CONCURRENCY);
    expect(activeReservations).toBe(0);
  });

  it("업로드 하나가 실패하면 새 업로드를 시작하지 않고 실패를 전달한다", async () => {
    let presignCount = 0;
    adminRequestMock.mockImplementation(async (path) => {
      if (path === "/uploads/settle") {
        return undefined;
      }
      presignCount += 1;
      return {
        uploadUrl: `https://upload.example.com/${presignCount}`,
        objectKey: `activities/detail/${presignCount}`,
        publicUrl: `https://cdn.example.com/${presignCount}`,
      };
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.activityDetail,
        files: createFiles(20),
      }),
    ).rejects.toBeInstanceOf(AdminApiError);
    expect(presignCount).toBeLessThanOrEqual(UPLOAD_BATCH_CONCURRENCY);
  });
});
