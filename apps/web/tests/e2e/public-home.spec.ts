import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  seedPublicActivity,
  seedPublicExhibition,
  seedPublicGeneration,
  seedPublicLinktreeWithItems,
  seedPublicSupporter,
  uniqueText,
} from "./helpers";

test.describe("public home", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("홈 UI 구성/텍스트/CTA/데이터 노출이 정상 동작한다", async ({
    page,
    request,
    e2ePrefix,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generation = await seedPublicGeneration(request, {
      prefix: e2ePrefix,
      name: uniqueText(e2ePrefix, "home-generation"),
      startDate: Date.parse("2098-01-01T00:00:00.000Z"),
      endDate: Date.parse("2098-12-31T00:00:00.000Z"),
    });
    const activity = await seedPublicActivity(request, {
      prefix: e2ePrefix,
      generationId: generation.id,
      title: uniqueText(e2ePrefix, "home-activity"),
      activityDate: Date.parse("2099-03-01T00:00:00.000Z"),
    });
    const exhibition = await seedPublicExhibition(request, {
      prefix: e2ePrefix,
      generationId: generation.id,
      title: uniqueText(e2ePrefix, "home-exhibition"),
      startDate: Date.parse("2099-02-01T00:00:00.000Z"),
      endDate: Date.parse("2099-02-15T00:00:00.000Z"),
      place: `${e2ePrefix} hall`,
    });
    const supporter = await seedPublicSupporter(request, {
      prefix: e2ePrefix,
      name: uniqueText(e2ePrefix, "home-supporter"),
      expiresAt: Date.parse("2099-12-31T00:00:00.000Z"),
    });
    const linktree = await seedPublicLinktreeWithItems(request, {
      prefix: e2ePrefix,
      groupName: uniqueText(e2ePrefix, "home-link-group"),
      items: [
        {
          name: uniqueText(e2ePrefix, "home-link-item"),
          link: `https://example.com/${e2ePrefix}/home-link-item`,
        },
      ],
    });

    await page.goto("/");

    await expect(page.getByTestId("public-header")).toBeVisible();
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByTestId("public-footer")).toBeVisible();
    await expect(
      page.getByTestId("home-hero").getByRole("heading", { name: "연영회" }),
    ).toBeVisible();

    await expect(page.getByTestId("home-hero-exhibition-meta")).toContainText(
      exhibition.title,
    );
    await expect(page.getByTestId("home-activities-grid")).toContainText(activity.title);
    await expect(page.getByTestId("home-supporters-grid")).toContainText(supporter.name);
    await expect(page.getByTestId("home-quicklinks-grid")).toContainText(
      linktree.items[0]!.name,
    );

    await page.getByTestId("home-cta-archive").click();
    await expect(page).toHaveURL(/\/archive$/);
    await expect(
      page.getByRole("heading", { name: "연영회의 활동과 전시 기록" }),
    ).toBeVisible();

    await page.goto("/");
    await page.getByTestId("home-cta-about").click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(
      page.getByRole("heading", { name: "카메라를 넘어 시선을 나누는 동아리" }),
    ).toBeVisible();

    await page.goto("/");
    await page.getByTestId("home-cta-archive-bottom").click();
    await expect(page).toHaveURL(/\/archive$/);

    await cleanupByPrefix(request, e2ePrefix);
  });
});
