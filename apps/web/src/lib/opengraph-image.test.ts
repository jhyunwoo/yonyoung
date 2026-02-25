import { describe, expect, it } from "vitest";
import {
  buildOpenGraphImagePath,
  decodeOpenGraphImagePayload,
  encodeOpenGraphImagePayload,
  normalizeOpenGraphImagePayload,
} from "./opengraph-image";

describe("opengraph-image helpers", () => {
  it("encode/decode는 payload를 직렬화하여 복원한다", () => {
    const encoded = encodeOpenGraphImagePayload({
      title: "LINKTREE | 연영회",
      description: "연영회 공식 SNS, 문의 채널, 활동 관련 외부 링크를 한 곳에서 확인하세요.",
      path: "/linktree",
    });

    expect(decodeOpenGraphImagePayload(encoded)).toEqual({
      title: "LINKTREE | 연영회",
      description: "연영회 공식 SNS, 문의 채널, 활동 관련 외부 링크를 한 곳에서 확인하세요.",
      path: "/linktree",
    });
  });

  it("buildOpenGraphImagePath는 Next metadata 파일 컨벤션 경로를 만든다", () => {
    const imagePath = buildOpenGraphImagePath({
      title: "활동 기록 | 연영회",
      description: "연영회의 활동 기록을 사진 중심 아카이브로 확인하세요.",
      path: "/archive/records",
    });
    const match = imagePath.match(/^\/og\/([^/]+)\/opengraph-image$/u);

    expect(match).not.toBeNull();
    expect(decodeOpenGraphImagePayload(match?.[1] ?? "")).toEqual({
      title: "활동 기록 | 연영회",
      description: "연영회의 활동 기록을 사진 중심 아카이브로 확인하세요.",
      path: "/archive/records",
    });
  });

  it("decode는 잘못된 payload를 null로 처리한다", () => {
    expect(decodeOpenGraphImagePayload("invalid-payload")).toBeNull();
  });

  it("normalizeOpenGraphImagePayload는 공백/잘못된 경로를 기본값으로 보정한다", () => {
    expect(
      normalizeOpenGraphImagePayload({
        title: "   ",
        description: "",
        path: "about",
      }),
    ).toEqual({
      title: "연영회",
      description: "연세대학교 중앙사진동아리 연영회",
      path: "/about",
    });
  });
});
