import { test, expect } from "./fixtures";

test.describe("public pages content", () => {
  test("about/archive/linktree/donate 페이지의 텍스트 및 사용자 액션이 정상 동작한다", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "연영회 소개" })).toBeVisible();
    await expect(page.getByTestId("about-history")).toBeVisible();

    await page.goto("/about/photographers");
    await expect(page.getByRole("heading", { name: "PHOTOGRAPHERS" })).toBeVisible();
    await expect(page.getByTestId("about-photographers-page")).toBeVisible();

    await page.goto("/about/recruiting");
    await expect(page.getByRole("heading", { name: "RECRUITING" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "지원 방법" })).toBeVisible();
    await expect(page.getByTestId("about-recruiting-steps")).toBeVisible();

    await page.goto("/about/recruting");
    await expect(page).toHaveURL(/\/about\/recruiting$/);

    await page.goto("/archive");
    await expect(page).toHaveURL(/\/archive\/records$/);
    await expect(page.getByRole("heading", { name: "활동 기록" })).toBeVisible();
    await expect(page.getByTestId("archive-records-grid")).toBeVisible();

    await page.goto("/archive/supporters");
    await expect(page.getByRole("heading", { name: "서포터즈" })).toBeVisible();
    await expect(page.getByTestId("archive-supporters-grid")).toBeVisible();

    await page.goto("/archive/exhibitions");
    await expect(page.getByRole("heading", { name: "전시회" })).toBeVisible();
    await expect(page.getByTestId("archive-exhibitions-grid")).toBeVisible();

    await page.goto("/linktree");
    await expect(page.getByRole("heading", { name: "LINKTREE" })).toBeVisible();
    await expect(page.getByTestId("linktree-groups")).toBeVisible();

    await page.goto("/donate");
    await expect(page.getByRole("heading", { name: "DONATE US" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "후원 방법" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "계좌 이체" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "온라인 후원" })).toBeVisible();
    await expect(page.getByText("후원하기")).toBeVisible();
    await expect(page.getByText("이메일: donate@yeonyeonghoe.com")).toBeVisible();
  });
});
