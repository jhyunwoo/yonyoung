import { describe, expect, it } from "vitest";

import { resolveInitialNoticeMessage } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-initial-notice-message";

describe("resolveInitialNoticeMessage", () => {
  it("세부 사진 업로드 실패로 넘어온 경우가 아니면 안내하지 않는다", async () => {
    await expect(
      resolveInitialNoticeMessage(Promise.resolve({}), "활동은"),
    ).resolves.toBe(null);
  });

  it("실패 사유가 있으면 문구 뒤에 붙인다", async () => {
    await expect(
      resolveInitialNoticeMessage(
        Promise.resolve({ error: "detail-upload-failed", message: "용량 초과" }),
        "활동은",
      ),
    ).resolves.toBe(
      "활동은 생성되었지만 일부 세부 이미지 업로드에 실패했습니다: 용량 초과",
    );
  });

  it("실패 사유가 없으면 다시 시도하라고 안내한다", async () => {
    await expect(
      resolveInitialNoticeMessage(
        Promise.resolve({ error: "detail-upload-failed", message: " " }),
        "전시는",
      ),
    ).resolves.toBe(
      "전시는 생성되었지만 일부 세부 이미지 업로드에 실패했습니다. 이미지 업로드를 다시 시도해 주세요.",
    );
  });
});
