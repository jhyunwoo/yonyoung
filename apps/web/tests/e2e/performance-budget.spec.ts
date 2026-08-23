import { expect, test, type Page } from "@playwright/test";

/*
  성능 예산 회귀 테스트.

  숫자를 "좋아 보이는 값"으로 두지 않고, 실제로 회귀를 잡을 수 있는 폭으로 잡는다.
  공개 라우트 초기 JS 예산 175KB 는 현재값(약 155KB, gzip)에 약 13% 여유를 둔 것이고,
  framer-motion 을 공개 번들에 다시 들이는 것 같은 변경(gzip 약 43KB)은 확실히 넘긴다.

  바이트는 브라우저가 실제로 받은 양(`encodedBodySize`)으로 잰다. 빌드 산출물을
  직접 압축해 재면 서버의 압축 설정과 어긋날 수 있다.
*/

/** 공개 라우트가 첫 화면에서 받아도 되는 스크립트 총량 (압축 후, byte). */
const PUBLIC_INITIAL_JS_BUDGET_BYTES = 175 * 1024;

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/photographers",
  "/archive/records",
  "/archive/records/act-1",
  "/archive/exhibitions",
  "/archive/exhibitions/exh-1",
  "/linktree",
  "/donate",
];

const readInitialScriptBytes = async (page: Page): Promise<number> => {
  return page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry): entry is PerformanceResourceTiming => "encodedBodySize" in entry)
      .filter(
        (entry) => entry.name.includes("/_next/static/") && entry.name.endsWith(".js"),
      )
      .reduce(
        (total, entry) => total + (entry.encodedBodySize || entry.transferSize || 0),
        0,
      ),
  );
};

test("공개 홈의 초기 JS 가 예산 안에 있다", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await expect(page.getByTestId("public-nav-desktop-archive-submenu")).not.toHaveClass(
    /parent-hovered/,
  );

  const bytes = await readInitialScriptBytes(page);
  expect(bytes).toBeGreaterThan(0);
  // 예산을 조정할 때 실제 값이 로그에 남아야 한다.
  console.log(`[perf] / initial JS = ${(bytes / 1024).toFixed(1)} KB`);
  expect(bytes).toBeLessThan(PUBLIC_INITIAL_JS_BUDGET_BYTES);
});

test("공개 라우트에 콘솔 에러와 런타임 예외가 없다", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.getByTestId("public-header")).toBeVisible();
  }

  /*
    이미지 호스트(images.mock.local)는 e2e 에서 존재하지 않으므로 로드 실패 로그는
    걸러낸다. 하이드레이션 불일치나 클라이언트 예외를 잡는 것이 목적이다.
  */
  const realProblems = problems.filter(
    (problem) =>
      !problem.includes("images.mock.local") &&
      !problem.includes("Failed to load resource") &&
      !problem.includes("ERR_NAME_NOT_RESOLVED"),
  );
  expect(realProblems).toEqual([]);
});

test("아카이브 목록의 프리페치가 카드 수만큼 늘어나지 않는다", async ({ page }) => {
  const prefetches: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const isPrefetch =
      request.headers()["next-router-prefetch"] !== undefined ||
      url.searchParams.has("_rsc");
    if (isPrefetch && url.pathname.startsWith("/archive/records")) {
      prefetches.push(`${url.pathname}${url.search}`);
    }
  });

  await page.goto("/archive/records", { waitUntil: "load" });
  await page.mouse.wheel(0, 4000);
  await expect(page.getByTestId("archive-records-grid")).toBeVisible();

  const cardCount = await page.getByTestId("archive-records-grid").locator("> a").count();
  expect(cardCount).toBeGreaterThan(0);

  /*
    상한이 **절대값**인 것이 요점이다. Partial Prefetching 이 켜져 있으면 카드들은
    라우트당 App Shell 을 공유하므로 프리페치 수가 카드 수를 따라 늘지 않는다.
    누군가 카드에 `prefetch={true}` 를 붙이면 URL 별 프리페치가 카드 수만큼 살아나고,
    시드가 조금만 커져도 이 상한을 넘는다. 그래서 시드가 늘어나도 이 숫자는
    **올리면 안 된다** — 올리는 순간 이 테스트는 아무것도 지키지 못한다.

    소스 레벨 가드(`tests/unit/app-shared/public-bundle-policy.test.ts`)가
    `prefetch={true}` 자체를 막고, 이 테스트는 런타임에서 그 결과를 확인한다.
  */
  const distinct = [...new Set(prefetches)];
  // 회귀 조사 시 실제 요청 목록이 로그에 남아야 한다.
  console.log(
    `[perf] archive prefetches=${distinct.length} cards=${cardCount} urls=${JSON.stringify(distinct)}`,
  );
  expect(distinct.length).toBeLessThanOrEqual(4);
});
