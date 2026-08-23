import { expect, test, type Page } from "@playwright/test";
import { instant } from "@next/playwright";

/*
  Instant Navigation 회귀 테스트 (Next.js 16.3).

  `instant()` 는 네비게이션 락을 잡는다. 락이 걸린 동안 라우터는 **프리페치해 둔
  App Shell 만** 그리고 동적 구간은 콜백이 끝날 때까지 서스펜드된 채로 둔다.
  따라서 콜백 안에서 보이는 것은 전부 셸에 들어 있던 UI 다.

  이 테스트가 지키려는 계약은 두 가지다.

    1. 이동이 즉시 일어난다 — 요청 시점 작업을 기다리지 않는다.
    2. 그때 보이는 화면이 **쓸모 있다** — 빈 스켈레톤 한 장이 아니라 헤더·푸터·
       페이지 제목·돌아가기 링크처럼 사용자가 바로 읽고 누를 수 있는 것이 있어야 한다.

  2번이 없으면 "즉시 비어 있는 화면"도 통과해 버리므로, 모든 케이스에서 공용
  크롬(헤더)과 라우트별 고정 UI 를 함께 확인한다.

  라우트가 이 계약을 만족한다는 선언은 각 page.tsx 의 `export const instant = true`
  이며, 빌드가 이를 검증한다. 이 스펙은 빌드가 볼 수 없는 것 — 실제로 그려지는
  내용이 충분한가 — 를 확인한다.
*/

/**
 * 하이드레이션이 끝날 때까지 기다린다.
 *
 * `networkidle` 은 쓰지 않는다. e2e 에서 이미지 호스트(images.mock.local)는 존재하지
 * 않아 요청이 끝나지 않고, 그래서 네트워크가 영영 idle 이 되지 않는다.
 * 대신 데스크톱 내비가 하이드레이션 직후 CSS 전용 열기 클래스를 떼어내는 것을
 * 신호로 쓴다 — `tests/e2e/site-header.spec.ts` 와 같은 방식이고, 마크업은 모바일
 * 뷰포트에도 (숨겨진 채로) 존재하므로 두 프로젝트에서 모두 동작한다.
 */
const settle = async (page: Page): Promise<void> => {
  await expect(page.getByTestId("public-nav-desktop-archive-submenu")).not.toHaveClass(
    /parent-hovered/,
  );
};

/** 모든 라우트의 App Shell 이 공통으로 담고 있어야 하는 크롬. */
const expectSharedShell = async (page: Page): Promise<void> => {
  await expect(page.getByTestId("public-header")).toBeVisible();
  await expect(page.getByTestId("public-logo-link")).toBeVisible();
};

/**
 * 헤더에서 목적지 링크에 닿을 수 있는 상태를 만든다.
 *
 * 모바일 프로젝트(412px)는 햄버거를 열어야 하고, 데스크톱은 하위 메뉴가 있는
 * 항목만 클릭으로 펼치면 된다. 여는 동작은 네비게이션이 아니므로 반드시
 * instant 스코프 **바깥**에서 한다.
 *
 * `parentTestId` 가 없으면 하위 메뉴가 없는 최상위 항목이라는 뜻이다 —
 * 데스크톱에서 그 항목을 클릭하면 그대로 이동해 버리므로 아무것도 하지 않는다.
 */
const openHeaderMenu = async (page: Page, parentTestId?: string): Promise<void> => {
  const toggle = page.getByTestId("public-nav-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.getByTestId("public-nav-mobile")).toBeVisible();
    return;
  }

  if (!parentTestId) {
    return;
  }

  await page.getByTestId(`public-nav-desktop-${parentTestId}`).click();
  await expect(
    page.getByTestId(`public-nav-desktop-${parentTestId}-submenu`),
  ).toHaveAttribute("data-open", "true");
};

/** 지금 화면에 떠 있는 헤더 내비(데스크톱 또는 모바일)에서 링크를 누른다. */
const clickHeaderLink = async (page: Page, name: string): Promise<void> => {
  const mobileNav = page.getByTestId("public-nav-mobile");
  if (await mobileNav.isVisible()) {
    await mobileNav.getByRole("link", { name, exact: true }).click();
    return;
  }

  await page
    .getByTestId("public-nav-desktop")
    .getByRole("link", { name, exact: true })
    .click();
};

test.describe("Instant Navigation", () => {
  test("홈 → 활동 기록: 목록 셸이 즉시 보인다", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    await instant(page, async () => {
      await page.getByTestId("home-cta-archive").click();

      await expect(
        page.getByRole("heading", { name: "활동 기록", level: 1 }),
      ).toBeVisible();
      await expect(page.getByText("출사와 프로젝트, 교류 활동을")).toBeVisible();
      await expectSharedShell(page);
    });

    await expect(page).toHaveURL(/\/archive\/records$/);
  });

  test("활동 기록 → 활동 상세: 돌아가기 링크와 프레임이 즉시 보인다", async ({
    page,
  }) => {
    await page.goto("/archive/records");
    await settle(page);

    await instant(page, async () => {
      await page.getByTestId("archive-record-card-act-1").click();

      // 상세 본문은 URL 의존이라 스트리밍되지만, 프레임은 셸에 들어 있어야 한다.
      await expect(
        page.getByRole("link", { name: "활동 기록으로 돌아가기" }),
      ).toBeVisible();
      // 사전 렌더된 id 는 본문까지 셸에 들어 있고, 그렇지 않은 id 는 스켈레톤이
      // 자리를 잡는다. 어느 쪽이든 "빈 화면"이 아니어야 한다는 것이 계약이다.
      await expect(
        page
          .locator(
            '[data-testid="record-detail-skeleton"], [data-testid="record-detail-gallery"]',
          )
          .first(),
      ).toBeVisible();
      await expectSharedShell(page);
    });

    await expect(page.getByTestId("record-detail-gallery")).toBeVisible();
  });

  test("활동 상세 A → 목록 → 활동 상세 B: 같은 셸을 재사용한다", async ({ page }) => {
    await page.goto("/archive/records/act-1");
    await expect(page.getByTestId("record-detail-gallery")).toBeVisible();

    await page.getByRole("link", { name: "활동 기록으로 돌아가기" }).click();
    await expect(page.getByTestId("archive-records-grid")).toBeVisible();
    await settle(page);

    await instant(page, async () => {
      await page.getByTestId("archive-record-card-act-2").click();

      await expect(
        page.getByRole("link", { name: "활동 기록으로 돌아가기" }),
      ).toBeVisible();
      await expectSharedShell(page);
    });

    await expect(page).toHaveURL(/\/archive\/records\/act-2$/);
  });

  test("홈 → 전시회: 목록 셸이 즉시 보인다", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await openHeaderMenu(page, "archive");

    await instant(page, async () => {
      await clickHeaderLink(page, "전시회");

      await expect(page.getByRole("heading", { name: "전시회", level: 1 })).toBeVisible();
      await expectSharedShell(page);
    });

    await expect(page).toHaveURL(/\/archive\/exhibitions$/);
  });

  test("전시회 → 전시 상세: 돌아가기 링크와 프레임이 즉시 보인다", async ({ page }) => {
    await page.goto("/archive/exhibitions");
    await settle(page);

    await instant(page, async () => {
      await page.getByTestId("archive-exhibition-card-exh-1").click();

      await expect(
        page.getByRole("link", { name: "전시 아카이브로 돌아가기" }),
      ).toBeVisible();
      await expect(
        page
          .locator(
            '[data-testid="exhibition-detail-skeleton"], [data-testid="exhibition-detail-gallery"]',
          )
          .first(),
      ).toBeVisible();
      await expectSharedShell(page);
    });

    await expect(page.getByTestId("exhibition-detail-gallery")).toBeVisible();
  });

  test("홈 → 소개: 본문까지 즉시 보인다", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    await instant(page, async () => {
      await page.getByTestId("home-cta-about").click();

      await expect(
        page.getByRole("heading", { name: "연영회 소개", level: 1 }),
      ).toBeVisible();
      // 소개 페이지는 전부 캐시된 읽기라 본문 자체가 셸에 들어 있어야 한다.
      await expect(page.getByTestId("about-page")).toBeVisible();
      await expect(page.getByTestId("about-annual-activities")).toBeVisible();
      await expectSharedShell(page);
    });
  });

  test("홈 → 링크트리: 목록까지 즉시 보인다", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await openHeaderMenu(page);

    await instant(page, async () => {
      await clickHeaderLink(page, "LINKTREE");

      await expect(
        page.getByRole("heading", { name: "LINKTREE", level: 1 }),
      ).toBeVisible();
      await expect(page.getByTestId("linktree-groups")).toBeVisible();
      await expectSharedShell(page);
    });
  });
});
