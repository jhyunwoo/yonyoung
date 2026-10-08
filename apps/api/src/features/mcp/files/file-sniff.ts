import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
} from "../../../lib/storage/presign";

/** 형식 판별과 이미지 크기 읽기에 쓰는 앞부분 크기. JPEG는 EXIF 뒤에 SOF가 와서 넉넉히 잡는다. */
export const SNIFF_BYTES = 64 * 1024;

const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);

const HEIF_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
const AVIF_BRANDS = ["avif", "avis"];

const hasFtypBrand = (bytes: Uint8Array, brands: readonly string[]): boolean =>
  ascii(bytes, 4, 4) === "ftyp" && brands.includes(ascii(bytes, 8, 4));

const isZip = (bytes: Uint8Array) => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
const isCfb = (bytes: Uint8Array) =>
  startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const SIGNATURE_BY_TYPE: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (bytes) => ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6)),
  "image/webp": (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP",
  "image/avif": (bytes) => hasFtypBrand(bytes, AVIF_BRANDS),
  "image/heic": (bytes) => hasFtypBrand(bytes, HEIF_BRANDS),
  "image/heif": (bytes) => hasFtypBrand(bytes, HEIF_BRANDS),
  "application/pdf": (bytes) => ascii(bytes, 0, 5) === "%PDF-",
  "application/zip": isZip,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isZip,
  "application/vnd.hancom.hwpx": isZip,
  "application/vnd.ms-excel": isCfb,
  "application/x-hwp": isCfb,
  "application/haansofthwp": isCfb,
  "application/vnd.hancom.hwp": isCfb,
};

const ALLOWED_TYPES = new Set<string>([
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  ...ALLOWED_ATTACHMENT_CONTENT_TYPES,
]);

/** 파일 앞부분이 선언한 형식의 서명과 맞는지 본다. 허용 목록 밖의 형식은 항상 false. */
export const matchesDeclaredType = (contentType: string, head: Uint8Array): boolean => {
  if (!ALLOWED_TYPES.has(contentType)) {
    return false;
  }
  return SIGNATURE_BY_TYPE[contentType]?.(head) ?? false;
};

type Dimensions = { width: number; height: number };

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const readPng = (bytes: Uint8Array): Dimensions | null =>
  bytes.length >= 24 && ascii(bytes, 12, 4) === "IHDR"
    ? { width: view(bytes).getUint32(16), height: view(bytes).getUint32(20) }
    : null;

const readGif = (bytes: Uint8Array): Dimensions | null =>
  bytes.length >= 10
    ? { width: view(bytes).getUint16(6, true), height: view(bytes).getUint16(8, true) }
    : null;

const readUint24le = (bytes: Uint8Array, offset: number) =>
  bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);

const readWebp = (bytes: Uint8Array): Dimensions | null => {
  if (bytes.length < 30) {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    return { width: readUint24le(bytes, 24) + 1, height: readUint24le(bytes, 27) + 1 };
  }
  if (chunk === "VP8 ") {
    return {
      width: view(bytes).getUint16(26, true) & 0x3fff,
      height: view(bytes).getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21]!;
    const b1 = bytes[22]!;
    const b2 = bytes[23]!;
    const b3 = bytes[24]!;
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  return null;
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const readJpeg = (bytes: Uint8Array): Dimensions | null => {
  const data = view(bytes);
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (SOF_MARKERS.has(marker)) {
      return { height: data.getUint16(offset + 5), width: data.getUint16(offset + 7) };
    }
    offset += 2 + data.getUint16(offset + 2);
  }
  return null;
};

const ISPE_TYPE = [0x69, 0x73, 0x70, 0x65];

const isIspeAt = (bytes: Uint8Array, offset: number): boolean =>
  ISPE_TYPE.every((byte, index) => bytes[offset + index] === byte);

/**
 * HEIF 계열(AVIF·HEIC)은 ispe 박스에 크기가 있다. 그리드나 썸네일이 있으면 ispe가 여러 개이므로
 * 머리 안에 완전히 들어 있는 박스 중 면적이 가장 큰 것을 본 이미지 크기로 본다.
 */
const readIspe = (bytes: Uint8Array): Dimensions | null => {
  const data = view(bytes);
  let best: Dimensions | null = null;
  for (let type = 4; type + 12 <= bytes.length - 4; type += 1) {
    if (!isIspeAt(bytes, type)) {
      continue;
    }
    const boxStart = type - 4;
    const boxSize = data.getUint32(boxStart);
    if (boxSize < 20 || boxStart + boxSize > bytes.length) {
      continue;
    }
    const width = data.getUint32(type + 8);
    const height = data.getUint32(type + 12);
    if (!best || width * height > best.width * best.height) {
      best = { width, height };
    }
  }
  return best;
};

const READER_BY_TYPE: Record<string, (bytes: Uint8Array) => Dimensions | null> = {
  "image/png": readPng,
  "image/gif": readGif,
  "image/webp": readWebp,
  "image/jpeg": readJpeg,
  "image/avif": readIspe,
  "image/heic": readIspe,
  "image/heif": readIspe,
};

/** EXIF 회전은 반영하지 않는다. 대시보드 업로드도 원본 픽셀 크기를 저장한다. */
export const readImageDimensions = (
  contentType: string,
  head: Uint8Array,
): Dimensions | null => {
  const dimensions = READER_BY_TYPE[contentType]?.(head) ?? null;
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return null;
  }
  return dimensions;
};
