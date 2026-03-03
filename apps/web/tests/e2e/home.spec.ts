import { expect, test } from "@playwright/test";

test("home renders and contains main text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("연영회", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("home-activities-grid")).toBeVisible();
});
