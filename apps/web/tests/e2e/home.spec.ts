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

test("record detail gallery renders as masonry with original aspect ratios", async ({
  page,
}) => {
  // act-1 시드: 치수 저장 이미지(1600x1200) 1장 + 레거시(null) 이미지 1장
  await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });

  const gallery = page.getByTestId("record-detail-gallery");
  await expect(gallery).toBeVisible();

  // CSS multi-column masonry 컨테이너인지 확인
  await expect(gallery).toHaveClass(/columns-1/);
  await expect(gallery).toHaveClass(/lg:columns-3/);

  // 치수 저장 이미지: width/height 속성으로 원본 비율 렌더링 (크롭 없음)
  const measuredImage = gallery.locator('img[width="1600"][height="1200"]');
  await expect(measuredImage).toHaveCount(1);

  // 레거시 이미지: 폴백 비율 프레임 (aspect-ratio 스타일)
  const legacyFrame = gallery.locator('div[style*="aspect-ratio"]');
  await expect(legacyFrame).toHaveCount(1);
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
