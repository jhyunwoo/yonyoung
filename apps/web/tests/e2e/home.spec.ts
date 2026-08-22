import { expect, test } from "@playwright/test";

test("home renders and contains main text", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("연영회", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("home-activities-grid")).toBeVisible();
});

test("home recent activity card navigates to the record detail page", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const firstActivityCard = page.locator("[data-testid^='home-activity-card-']").first();
  await expect(firstActivityCard).toHaveAttribute("href", /\/archive\/records\/[^/]+$/);

  await firstActivityCard.click();

  await expect(page).toHaveURL(/\/archive\/records\/[^/]+$/);
  await expect(page.getByTestId("record-detail-gallery")).toBeVisible();
});

test("home latest exhibition card navigates to the exhibition detail page", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const latestExhibitionCard = page
    .locator("[data-testid^='home-hero-exhibition-card-']")
    .first();
  await expect(latestExhibitionCard).toHaveAttribute(
    "href",
    /\/archive\/exhibitions\/[^/]+$/,
  );

  await latestExhibitionCard.click();

  await expect(page).toHaveURL(/\/archive\/exhibitions\/[^/]+$/);
  await expect(page.getByTestId("exhibition-detail-gallery")).toBeVisible();
});
