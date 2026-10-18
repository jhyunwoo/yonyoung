import { expect, test, type Page } from "@playwright/test";

/**
 * 사진가 상세 모달.
 *
 * 시드: 59기에 김회장·이부회장·박부장·최부원, 58기에 김회장. 김회장은 두 기수에 모두
 * 있으므로 멤버 testid 는 기수 article 안에서 찾는다.
 */

const generation = (page: Page, id: string) =>
  page.getByTestId(`about-photographers-generation-${id}`);

const bodyOverflow = (page: Page) =>
  expect.poll(() => page.evaluate(() => document.body.style.overflow));

test.beforeEach(async ({ page }) => {
  await page.goto("/about/photographers", { waitUntil: "networkidle" });
  // 이 스펙은 모달 동작을 본다. 하이드레이션 전 클릭은 다루지 않으므로 끝날 때까지 기다린다.
  await page.getByTestId("about-photographers-member-button-user-vice").evaluate(
    (node) =>
      new Promise<void>((resolve) => {
        const check = () =>
          Object.keys(node).some((key) => key.startsWith("__reactProps"))
            ? resolve()
            : requestAnimationFrame(check);
        check();
      }),
  );
});

test("멤버를 누르면 기수·역할·협업 여부·링크가 담긴 모달이 열린다", async ({ page }) => {
  await generation(page, "gen-59")
    .getByTestId("about-photographers-member-button-user-vice")
    .click();

  const modal = page.getByTestId("about-photographers-member-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("role", "dialog");
  await expect(modal.getByRole("heading", { name: "이부회장" })).toBeVisible();
  await expect(modal).toContainText("59기 · 부회장");
  await expect(
    modal.getByTestId("about-photographers-member-collaboration-status"),
  ).toHaveText("가능");
  await expect(modal.getByRole("link", { name: "바로가기" })).toHaveAttribute(
    "href",
    "https://instagram.com/vice",
  );
  await expect(page.getByTestId("about-photographers-member-modal")).toHaveCount(1);
  await bodyOverflow(page).toBe("hidden");
});

test("다른 기수의 같은 멤버는 그 기수 이름으로 열린다", async ({ page }) => {
  await generation(page, "gen-58")
    .getByTestId("about-photographers-member-button-user-president")
    .click();

  const modal = page.getByTestId("about-photographers-member-modal");
  await expect(modal).toContainText("58기 · 회장");
});

test("Escape 로 닫으면 스크롤 잠금이 풀리고 포커스가 멤버 버튼에 남는다", async ({
  page,
}) => {
  const button = generation(page, "gen-59").getByTestId(
    "about-photographers-member-button-user-manager",
  );
  await button.focus();
  await page.keyboard.press("Enter");

  const modal = page.getByTestId("about-photographers-member-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("박부장");

  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await bodyOverflow(page).toBe("");
  await expect(button).toBeFocused();
});

test("닫기 버튼과 바깥 영역으로 닫힌다", async ({ page }) => {
  const button = generation(page, "gen-59").getByTestId(
    "about-photographers-member-button-user-member",
  );
  const modal = page.getByTestId("about-photographers-member-modal");

  await button.click();
  await expect(modal).toContainText("최부원");
  await page.getByTestId("about-photographers-member-modal-close").click();
  await expect(modal).toHaveCount(0);

  await button.click();
  await expect(modal).toBeVisible();
  await page
    .getByTestId("about-photographers-member-modal-close-overlay")
    .click({ position: { x: 5, y: 5 } });
  await expect(modal).toHaveCount(0);
  await bodyOverflow(page).toBe("");
});

test("멤버 타일은 이름과 아바타를 서버 HTML 에 담는다", async ({ request }) => {
  const html = await (await request.get("/about/photographers")).text();
  expect(html).toContain('data-testid="about-photographers-member-button-user-vice"');
  expect(html).toContain('aria-label="이부회장 상세 정보 보기"');
  expect(html).toContain('data-testid="about-photographers-member-avatar-user-vice"');
  expect(html).toContain('data-testid="about-photographers-member-name-user-vice"');
});
