const ascii = (text: string): number[] => [...text].map((char) => char.charCodeAt(0));
const u16be = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u16le = (value: number) => [value & 0xff, (value >> 8) & 0xff];
const u24le = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
const u32be = (value: number) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

/** 서명 + IHDR 청크(가로·세로)만 있는 최소 PNG 머리. */
export const pngBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...u32be(13), ...ascii("IHDR"), ...u32be(width), ...u32be(height),
    8, 6, 0, 0, 0, 0, 0, 0, 0,
  ]);

/** SOI + APP0(JFIF) + SOF0 + EOI. */
export const jpegBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, ...u16be(16), ...ascii("JFIF"), 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, ...u16be(17), 0x08, ...u16be(height), ...u16be(width), 0x03,
    0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);

export const gifBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([...ascii("GIF89a"), ...u16le(width), ...u16le(height), 0, 0, 0]);

/** RIFF/WEBP + VP8X 청크. 가로·세로는 1을 뺀 24비트 값으로 저장된다. */
export const webpBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    ...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"),
    ...ascii("VP8X"), 10, 0, 0, 0, 0, 0, 0, 0,
    ...u24le(width - 1), ...u24le(height - 1),
  ]);

/** ftyp(avif) 박스 + ispe 박스. */
export const avifBytes = (width: number, height: number): Uint8Array =>
  new Uint8Array([
    ...u32be(24), ...ascii("ftyp"), ...ascii("avif"), 0, 0, 0, 0, ...ascii("mif1"), ...ascii("avif"),
    ...u32be(20), ...ascii("ispe"), 0, 0, 0, 0, ...u32be(width), ...u32be(height),
  ]);

export const pdfBytes = (): Uint8Array => new Uint8Array(ascii("%PDF-1.7\n%âã\n1 0 obj\n"));

export const streamOf = (bytes: Uint8Array, chunkSize = 7): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        controller.enqueue(bytes.slice(offset, offset + chunkSize));
      }
      controller.close();
    },
  });

/** ftyp(heic) 박스 뒤에 썸네일 ispe 박스가 먼저, 본 이미지 ispe 박스가 나중에 오는 HEIF 머리. */
export const heicBytesWithThumbnail = (
  thumbWidth: number,
  thumbHeight: number,
  width: number,
  height: number,
): Uint8Array =>
  new Uint8Array([
    ...u32be(24), ...ascii("ftyp"), ...ascii("heic"), 0, 0, 0, 0, ...ascii("mif1"), ...ascii("heic"),
    ...u32be(20), ...ascii("ispe"), 0, 0, 0, 0, ...u32be(thumbWidth), ...u32be(thumbHeight),
    ...u32be(20), ...ascii("ispe"), 0, 0, 0, 0, ...u32be(width), ...u32be(height),
  ]);
