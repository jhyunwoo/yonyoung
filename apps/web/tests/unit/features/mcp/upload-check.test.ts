import { describe, expect, it } from "vitest";
import { checkSelectedFile } from "@/features/mcp/upload-check";

const expected = { declaredSize: 1000, contentType: "image/jpeg" };

describe("checkSelectedFile", () => {
  it("크기와 형식이 맞으면 null이다", () => {
    expect(checkSelectedFile({ size: 1000, type: "image/jpeg" }, expected)).toBeNull();
    expect(checkSelectedFile({ size: 1000, type: "image/jpg" }, expected)).toBeNull();
  });

  it("크기가 다르면 같은 파일을 고르라고 안내한다", () => {
    expect(checkSelectedFile({ size: 999, type: "image/jpeg" }, expected)).toContain(
      "같은 파일",
    );
  });

  it("형식이 다르면 안내한다", () => {
    expect(checkSelectedFile({ size: 1000, type: "image/png" }, expected)).toContain(
      "형식",
    );
  });
});
