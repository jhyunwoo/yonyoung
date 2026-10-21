import { expect, test } from "@playwright/test";

// mock-api 시드의 모집 기간은 2026-03-01 ~ 2026-03-20 이라 지금은 마감 상태다.
test("closed recruiting tells applicants when the next round opens", async ({ page }) => {
  await page.goto("/about/recruiting");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "연영회 신입 회원 모집",
  );
  const notice = page.getByTestId("about-recruiting-closed-notice");
  await expect(notice).toContainText("다음 신입 회원 모집은 3월에 진행");
  await notice.getByRole("link", { name: "연영회 공식 채널" }).click();
  await expect(page).toHaveURL(/\/linktree$/);
});
