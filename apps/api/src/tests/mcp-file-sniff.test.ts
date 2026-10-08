import { describe, expect, it } from "vitest";
import {
  StreamLengthMismatchError,
  enforceExactLength,
  peekStream,
} from "../features/mcp/files/byte-stream";
import { matchesDeclaredType, readImageDimensions } from "../features/mcp/files/file-sniff";
import {
  avifBytes,
  gifBytes,
  jpegBytes,
  pdfBytes,
  pngBytes,
  streamOf,
  webpBytes,
} from "./mcp-file-fixtures";

describe("형식 판별", () => {
  it.each([
    ["image/png", pngBytes(3, 2)],
    ["image/jpeg", jpegBytes(3, 2)],
    ["image/gif", gifBytes(3, 2)],
    ["image/webp", webpBytes(3, 2)],
    ["image/avif", avifBytes(3, 2)],
    ["application/pdf", pdfBytes()],
  ] as const)("%s 매직 바이트를 인식한다", (contentType, bytes) => {
    expect(matchesDeclaredType(contentType, bytes)).toBe(true);
  });

  it("선언과 내용이 다르면 거부한다", () => {
    expect(matchesDeclaredType("image/jpeg", pngBytes(1, 1))).toBe(false);
    expect(matchesDeclaredType("application/pdf", pngBytes(1, 1))).toBe(false);
  });

  it("zip 기반 문서(xlsx, docx, hwpx)는 PK 서명으로 인식한다", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
    expect(
      matchesDeclaredType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip),
    ).toBe(true);
    expect(matchesDeclaredType("application/vnd.hancom.hwpx", zip)).toBe(true);
  });

  it("OLE 기반 문서(xls, hwp)는 CFB 서명으로 인식한다", () => {
    const cfb = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(matchesDeclaredType("application/vnd.ms-excel", cfb)).toBe(true);
    expect(matchesDeclaredType("application/x-hwp", cfb)).toBe(true);
  });

  it("허용 목록에 없는 형식은 거부한다", () => {
    expect(matchesDeclaredType("text/html", new Uint8Array([0x3c]))).toBe(false);
  });
});

describe("이미지 크기", () => {
  it.each([
    ["image/png", pngBytes(640, 480)],
    ["image/jpeg", jpegBytes(640, 480)],
    ["image/gif", gifBytes(640, 480)],
    ["image/webp", webpBytes(640, 480)],
    ["image/avif", avifBytes(640, 480)],
  ] as const)("%s 머리에서 가로·세로를 읽는다", (contentType, bytes) => {
    expect(readImageDimensions(contentType, bytes)).toEqual({ width: 640, height: 480 });
  });

  it("읽을 수 없으면 null이다", () => {
    expect(readImageDimensions("image/jpeg", new Uint8Array([0xff, 0xd8, 0x00]))).toBeNull();
    expect(readImageDimensions("application/pdf", pdfBytes())).toBeNull();
  });
});

describe("스트림 도우미", () => {
  it("앞부분을 엿봐도 전체 바이트를 그대로 다시 읽을 수 있다", async () => {
    const bytes = pngBytes(10, 10);
    const { head, stream } = await peekStream(streamOf(bytes), 16);
    expect([...head.subarray(0, 8)]).toEqual([...bytes.subarray(0, 8)]);
    const replayed = new Uint8Array(await new Response(stream).arrayBuffer());
    expect([...replayed]).toEqual([...bytes]);
  });

  it("선언 길이와 같으면 통과한다", async () => {
    const bytes = pdfBytes();
    const out = await new Response(enforceExactLength(streamOf(bytes), bytes.length)).arrayBuffer();
    expect(out.byteLength).toBe(bytes.length);
  });

  it("짧거나 길면 StreamLengthMismatchError로 끝난다", async () => {
    const bytes = pdfBytes();
    await expect(
      new Response(enforceExactLength(streamOf(bytes), bytes.length + 1)).arrayBuffer(),
    ).rejects.toBeInstanceOf(StreamLengthMismatchError);
    await expect(
      new Response(enforceExactLength(streamOf(bytes), bytes.length - 1)).arrayBuffer(),
    ).rejects.toBeInstanceOf(StreamLengthMismatchError);
  });
});
