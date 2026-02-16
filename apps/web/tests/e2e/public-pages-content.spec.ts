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

test.describe("public pages content", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("about/archive/linktree/donate 페이지의 텍스트 및 사용자 액션이 정상 동작한다", async ({
    page,
    request,
    e2ePrefix,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generation = await seedPublicGeneration(request, {
      prefix: e2ePrefix,
      name: uniqueText(e2ePrefix, "page-generation"),
      sortOrder: 777001,
      startDate: Date.parse("2090-01-01T00:00:00.000Z"),
      endDate: Date.parse("2090-12-31T00:00:00.000Z"),
    });
    const activity = await seedPublicActivity(request, {
      prefix: e2ePrefix,
      generationId: generation.id,
      title: uniqueText(e2ePrefix, "page-activity"),
      description: `${e2ePrefix} archive activity description`,
      activityDate: Date.parse("2090-03-10T00:00:00.000Z"),
    });
    const exhibition = await seedPublicExhibition(request, {
      prefix: e2ePrefix,
      generationId: generation.id,
      title: uniqueText(e2ePrefix, "page-exhibition"),
      place: `${e2ePrefix} gallery`,
      description: `${e2ePrefix} archive exhibition description`,
      startDate: Date.parse("2090-04-01T00:00:00.000Z"),
      endDate: Date.parse("2090-04-20T00:00:00.000Z"),
    });
    const supporter = await seedPublicSupporter(request, {
      prefix: e2ePrefix,
      name: uniqueText(e2ePrefix, "page-supporter"),
      link: `https://example.com/${e2ePrefix}/donate-supporter`,
      expiresAt: Date.parse("2090-12-31T00:00:00.000Z"),
    });
    const linktree = await seedPublicLinktreeWithItems(request, {
      prefix: e2ePrefix,
      groupName: uniqueText(e2ePrefix, "page-link-group"),
      items: [
        {
          name: uniqueText(e2ePrefix, "page-link-item"),
          link: `https://example.com/${e2ePrefix}/page-link-item`,
        },
      ],
    });

    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "카메라를 넘어 시선을 나누는 동아리" })).toBeVisible();
    await expect(page.getByTestId("about-history")).toContainText(generation.name);

    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "연영회의 활동과 전시 기록" })).toBeVisible();
    await expect(page.getByTestId("archive-activities")).toContainText(activity.title);
    await expect(page.getByTestId("archive-exhibitions")).toContainText(exhibition.title);

    await page.goto("/linktree");
    await expect(page.getByRole("heading", { name: "연영회 공식 링크 모음" })).toBeVisible();
    await expect(page.getByTestId("linktree-groups")).toContainText(linktree.name);
    const linktreeItemCard = page.getByTestId(`linktree-item-card-${linktree.items[0]!.id}`);
    await expect(linktreeItemCard).toContainText(linktree.items[0]!.name);
    await expect(linktreeItemCard).toHaveAttribute("href", linktree.items[0]!.link);
    await expect(linktreeItemCard).toHaveAttribute("target", "_blank");

    await page.goto("/donate");
    await expect(page.getByRole("heading", { name: "연영회의 전시와 기록을 함께 만들어주세요" })).toBeVisible();
    await expect(page.getByText("기업 제휴")).toBeVisible();
    await expect(page.getByText("전시 스폰서십")).toBeVisible();
    await expect(page.getByText("문의 채널")).toBeVisible();

    const donateSupporterCard = page.getByTestId(`donate-supporter-card-${supporter.id}`);
    await expect(donateSupporterCard).toContainText(supporter.name);
    await expect(donateSupporterCard).toHaveAttribute("href", `https://example.com/${e2ePrefix}/donate-supporter`);
    await expect(donateSupporterCard).toHaveAttribute("target", "_blank");

    await cleanupByPrefix(request, e2ePrefix);
  });
});
