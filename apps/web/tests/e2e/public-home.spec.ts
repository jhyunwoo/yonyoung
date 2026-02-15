import { test, expect } from "./fixtures";

test.describe("public home", () => {
  test("home page renders", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "연영회" })).toBeVisible();
  });
});
