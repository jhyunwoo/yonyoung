import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("home exposes club identity and search metadata without JavaScript", async ({
  page,
  baseURL,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("연영회 | 연세대학교 사진 동아리");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "연세대학교 사진 동아리",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /정기 출사.*사진 세미나/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${baseURL}`,
  );
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const organization = schemas
    .map((schema) => JSON.parse(schema))
    .find((schema) => schema["@type"] === "Organization");
  expect(organization).toMatchObject({
    name: "연영회",
    foundingDate: "1966",
    description: await page.locator('meta[name="description"]').getAttribute("content"),
  });
  await page.getByRole("link", { name: "사진 동아리 활동 소개", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "대학교 사진 동아리에서는 어떤 활동을 하나요?" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${baseURL}/about`,
  );
});

test("search crawlers can discover public pages", async ({ request, baseURL }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  for (const path of ["/", "/about", "/about/recruiting"]) {
    expect(xml).toContain(`<loc>${baseURL}${path}</loc>`);
  }
  expect(xml).not.toContain("/dashboard");
});
