import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock(this: { config?: unknown }, config: unknown) {
    this.config = config;
  }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommandMock(this: { input?: unknown }, input: unknown) {
    this.input = input;
  }),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2PresignService, MissingStorageConfigError } from "../lib/storage/presign";

describe("createR2PresignService", () => {
  const mockS3Client = vi.mocked(S3Client);
  const mockPutObjectCommand = vi.mocked(PutObjectCommand);
  const mockGetSignedUrl = vi.mocked(getSignedUrl);

  beforeEach(() => {
    vi.restoreAllMocks();
    mockS3Client.mockClear();
    mockPutObjectCommand.mockClear();
    mockGetSignedUrl.mockReset();
  });

  it("R2_PUBLIC_BASE_URL이 없어도 uploadUrl 기반 publicUrl을 생성한다", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    mockGetSignedUrl.mockResolvedValue(
      "https://yonyoung-storage.example-account.r2.cloudflarestorage.com/activities/user-1/cover/1700000000000-photo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256",
    );

    const service = createR2PresignService({
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
    } as never);

    const result = await service.issuePresignedPutUrl({
      actorId: "user-1",
      resource: "activities",
      slot: "cover",
      fileName: "photo.png",
      contentType: "image/png",
    });

    expect(result.publicUrl).toBe(
      "https://yonyoung-storage.example-account.r2.cloudflarestorage.com/activities/user-1/cover/1700000000000-photo.png",
    );
    expect(mockS3Client).toHaveBeenCalledWith({
      region: "auto",
      endpoint: "https://example-account.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "key",
        secretAccessKey: "secret",
      },
    });
    expect(mockPutObjectCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: "activities/user-1/cover/1700000000000-photo.png",
      ContentType: "image/png",
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
    expect(result.requiredHeaders).toEqual({
      "Content-Type": "image/png",
    });
  });

  it("R2_PUBLIC_BASE_URL이 있으면 해당 base URL을 우선 사용한다", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    mockGetSignedUrl.mockResolvedValue(
      "https://yonyoung-storage.example-account.r2.cloudflarestorage.com/activities/user-1/cover/1700000000000-photo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256",
    );

    const service = createR2PresignService({
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
      R2_PUBLIC_BASE_URL: "https://cdn.example.com/",
    } as never);

    const result = await service.issuePresignedPutUrl({
      actorId: "user-1",
      resource: "activities",
      slot: "cover",
      fileName: "photo.png",
      contentType: "image/png",
    });

    expect(result.publicUrl).toBe(
      "https://cdn.example.com/activities/user-1/cover/1700000000000-photo.png",
    );
  });

  it("필수 R2 설정이 누락되면 MissingStorageConfigError를 던진다", () => {
    expect(
      () =>
        createR2PresignService({
          R2_ACCESS_KEY_ID: "key",
          R2_SECRET_ACCESS_KEY: "secret",
          R2_BUCKET: "yonyoung-storage",
        } as never),
    ).toThrowError(MissingStorageConfigError);
  });
});
