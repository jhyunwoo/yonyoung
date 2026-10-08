import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
import {
  UPLOAD_RESERVATION_SETTLEMENT_GRACE_MS,
  createMemoryUploadReservationStore,
} from "../lib/uploads/upload-reservation";
import { jpegBytes, pngBytes } from "./mcp-file-fixtures";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
  uploadViaClaudePath,
} from "./mcp-test-harness";
import { IDs, createActor } from "./test-helpers";

type Prepared = { upload_id: string; put_url: string; browser_url: string; expires_at: string };

const setup = async (role: Parameters<typeof createActor>[0] = "manager") => {
  const uploadStore = createMemoryMcpUploadStore();
  const objectStore = createMemoryMcpObjectStore();
  const reservationStore = createMemoryUploadReservationStore();
  const actor = createActor(role, role === "manager" ? IDs.manager : IDs.member);
  const app = createMcpTestApp({
    getActor: () => actor,
    uploadStore,
    objectStore,
    overrides: { getUploadReservationStore: () => reservationStore },
  });
  const client = await connectMcpClient(app);
  return { app, client, uploadStore, objectStore, reservationStore, actor };
};

const reservationOf = async (
  { uploadStore, reservationStore }: Awaited<ReturnType<typeof setup>>,
  uploadId: string,
) => {
  const record = await uploadStore.getById(uploadId);
  return reservationStore.get(record!.reservationId!);
};

const prepare = async (
  client: Awaited<ReturnType<typeof setup>>["client"],
  args: Record<string, unknown>,
) => client.callTool({ name: "upload_prepare", arguments: args });

const putBytes = (app: Awaited<ReturnType<typeof setup>>["app"], putUrl: string, bytes: Uint8Array, headers: Record<string, string> = {}) =>
  app.request(new URL(putUrl).pathname, {
    method: "PUT",
    headers: { "content-length": String(bytes.length), ...headers },
    body: bytes,
  });

afterEach(() => {
  vi.useRealTimers();
});

describe("upload_prepare", () => {
  it("일회용 PUT 주소와 브라우저 주소를 준다", async () => {
    const { client } = await setup();
    const result = await prepare(client, {
      purpose: "activity_image",
      file_name: "봄 출사 🌸.png",
      content_type: "image/png",
      size: 33,
    });

    expect(result.isError).toBeFalsy();
    const data = (result.structuredContent as { data: Prepared }).data;
    expect(data.put_url).toMatch(/\/mcp\/uploads\/[A-Za-z0-9_-]{43}$/);
    expect(data.browser_url).toMatch(/\/dashboard\/mcp\/upload\/[A-Za-z0-9_-]{43}$/);
    expect(resultText(result)).toContain("curl");
  });

  it("용량 예약은 토큰 만료 뒤 1시간까지만 잡아 둔다", async () => {
    const context = await setup();
    const before = Date.now();
    const result = await prepare(context.client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: 33,
    });
    const after = Date.now();
    const { upload_id } = (result.structuredContent as { data: Prepared }).data;

    const reservation = await reservationOf(context, upload_id);
    const ttl = 10 * 60 * 1000 + 60 * 60 * 1000;
    expect(reservation!.expiresAt).toBeGreaterThanOrEqual(before + ttl);
    expect(reservation!.expiresAt).toBeLessThanOrEqual(after + ttl);
  });

  it("권한이 없는 용도는 거부한다", async () => {
    const { client } = await setup("regular_member");
    const result = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: 33,
    });
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("현재 역할(정회원)");
  });

  it("허용하지 않는 형식과 100MB 초과는 거부한다", async () => {
    const { client } = await setup();
    const wrongType = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.svg",
      content_type: "image/svg+xml",
      size: 10,
    });
    expect(resultText(wrongType)).toContain("허용되지 않는 파일 형식입니다.");

    const tooLarge = await prepare(client, {
      purpose: "activity_file",
      file_name: "a.pdf",
      content_type: "application/pdf",
      size: 100_000_001,
    });
    expect(tooLarge.isError).toBe(true);
  });
});

describe("PUT /mcp/uploads/:token", () => {
  it("파일을 저장하고 이미지 크기를 기록한다", async () => {
    const context = await setup();
    const { app, client, uploadStore, objectStore } = context;
    const bytes = pngBytes(640, 480);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes,
    });
    const settledAt = Date.now();

    const record = await uploadStore.getById(uploadId);
    expect(record).toMatchObject({ status: "completed", width: 640, height: 480 });
    expect(objectStore.objects.get(record!.objectKey)?.bytes.length).toBe(bytes.length);

    const reservation = await reservationOf(context, uploadId);
    expect(reservation!.expiresAt).toBeLessThanOrEqual(
      settledAt + UPLOAD_RESERVATION_SETTLEMENT_GRACE_MS,
    );
    expect(reservation!.expiresAt).toBeGreaterThan(
      settledAt + UPLOAD_RESERVATION_SETTLEMENT_GRACE_MS - 5_000,
    );

    const status = await client.callTool({ name: "upload_status", arguments: { upload_id: uploadId } });
    expect(resultText(status)).toContain("completed");
  });

  it("같은 주소로 두 번 올리면 두 번째는 409다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;

    expect((await putBytes(app, put_url, bytes)).status).toBe(200);
    expect((await putBytes(app, put_url, bytes)).status).toBe(409);
  });

  it("동시에 두 번 올려도 하나만 성공한다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;

    const statuses = (await Promise.all([putBytes(app, put_url, bytes), putBytes(app, put_url, bytes)]))
      .map((response) => response.status)
      .sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("Content-Length가 없으면 411이다", async () => {
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const response = await app.request(new URL(put_url).pathname, {
      method: "PUT",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    expect(response.status).toBe(411);
  });

  it("선언 크기와 다르면 400이고 객체를 남기지 않는다", async () => {
    const { app, client, objectStore } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length + 5,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const response = await putBytes(app, put_url, bytes);
    expect(response.status).toBe(400);
    expect(objectStore.objects.size).toBe(0);
  });

  it("본문 길이가 Content-Length와 다르면 400이고 실패로 정리한다", async () => {
    const context = await setup();
    const { app, client, uploadStore, objectStore } = context;
    const bytes = pngBytes(1, 1);
    const declaredSize = bytes.length + 5;
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: declaredSize,
    });
    const { upload_id, put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const reservationId = (await uploadStore.getById(upload_id))!.reservationId!;

    const response = await app.request(new URL(put_url).pathname, {
      method: "PUT",
      headers: { "content-length": String(declaredSize) },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("받은 파일 크기가 선언한 크기와 다릅니다.");
    expect((await uploadStore.getById(upload_id))?.status).toBe("failed");
    expect(objectStore.objects.size).toBe(0);
    expect(await context.reservationStore.get(reservationId)).toBeNull();
  });

  it("내용이 선언 형식과 다르면 415이고 실패로 정리한다", async () => {
    const context = await setup();
    const { app, client, uploadStore, objectStore } = context;
    const bytes = jpegBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { upload_id, put_url } = (prepared.structuredContent as { data: Prepared }).data;
    const reservationId = (await uploadStore.getById(upload_id))!.reservationId!;

    expect((await putBytes(app, put_url, bytes)).status).toBe(415);
    expect((await uploadStore.getById(upload_id))?.status).toBe("failed");
    expect(objectStore.objects.size).toBe(0);
    expect(await context.reservationStore.get(reservationId)).toBeNull();
  });

  it("10분이 지나면 410이다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { app, client } = await setup();
    const bytes = pngBytes(1, 1);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: bytes.length,
    });
    const { put_url } = (prepared.structuredContent as { data: Prepared }).data;
    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    expect((await putBytes(app, put_url, bytes)).status).toBe(410);
  });

  it("웹 오리진의 CORS 사전 요청을 허용한다", async () => {
    const { app } = await setup();
    const response = await app.request("/mcp/uploads/anything", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });
});

describe("GET /api/mcp/uploads/lookup", () => {
  it("소유자에게만 업로드 정보를 보여준다", async () => {
    const uploadStore = createMemoryMcpUploadStore();
    const manager = createActor("manager", IDs.manager);
    let sessionActor = manager;
    const app = createMcpTestApp({
      getActor: () => manager,
      uploadStore,
      overrides: { resolveActor: async () => sessionActor },
    });
    const client = await connectMcpClient(app);
    const prepared = await prepare(client, {
      purpose: "activity_image",
      file_name: "a.png",
      content_type: "image/png",
      size: 33,
    });
    const token = new URL((prepared.structuredContent as { data: Prepared }).data.put_url)
      .pathname.split("/")
      .pop()!;

    const owner = await app.request(`/api/mcp/uploads/lookup?token=${token}`);
    expect(owner.status).toBe(200);
    expect(((await owner.json()) as { data: { fileName: string } }).data.fileName).toBe("a.png");

    sessionActor = createActor("regular_member", IDs.member);
    const stranger = await app.request(`/api/mcp/uploads/lookup?token=${token}`);
    expect(stranger.status).toBe(404);
  });
});
