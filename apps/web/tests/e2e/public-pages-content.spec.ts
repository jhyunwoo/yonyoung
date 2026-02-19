import { test, expect } from "./fixtures";

test.describe("public pages content", () => {
  test("about/archive/linktree/donate 페이지의 텍스트 및 사용자 액션이 정상 동작한다", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "카메라를 넘어 시선을 나누는 동아리" })).toBeVisible();
    await expect(page.getByTestId("about-history")).toBeVisible();

    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "연영회의 활동과 전시 기록" })).toBeVisible();
    await expect(page.getByTestId("archive-activities")).toBeVisible();
    await expect(page.getByTestId("archive-exhibitions")).toBeVisible();

    await page.goto("/linktree");
    await expect(page.getByRole("heading", { name: "연영회 공식 링크 모음" })).toBeVisible();
    await expect(page.getByTestId("linktree-groups")).toBeVisible();

    await page.goto("/donate");
    await expect(page.getByRole("heading", { name: "연영회의 전시와 기록을 함께 만들어주세요" })).toBeVisible();
    await expect(page.getByText("기업 제휴")).toBeVisible();
    await expect(page.getByText("전시 스폰서십")).toBeVisible();
    await expect(page.getByText("문의 채널")).toBeVisible();
  });
});
