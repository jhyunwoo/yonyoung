import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";

/*
  프로젝트별 뷰포트(모바일 프로젝트는 412px)와 무관하게 데스크톱 내비게이션을
  검증해야 하므로 컨텍스트를 직접 만든다. 768px 이상이어야 햄버거 메뉴가 아니라
  데스크톱 내비가 나온다.
*/
const openDesktopContext = async (
  browser: Browser,
  testInfo: TestInfo,
  { hasTouch }: { hasTouch: boolean },
) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1280, height: 800 },
    hasTouch,
  });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  return { context, page };
};

/*
  "이동하지 않았다"는 폴링으로 확인할 수 없다. toHaveURL 은 조건이 처음
  만족되는 순간 통과하므로, 이동이 아직 커밋되기 전에 찍히면 그냥 지나간다.
  이동이 일어날 시간을 준 뒤 한 번만 확인해야 한다.
*/
const expectStayedOnHome = async (page: Page) => {
  await page.waitForTimeout(700);
  expect(new URL(page.url()).pathname).toBe("/");
};

/**
 * 터치스크린을 겸한 데스크톱(2-in-1, 터치 모니터)은 마우스가 붙어 있어도
 * hover: none 을 보고한다. Tailwind 의 group-hover 는 @media (hover: hover)
 * 안에 들어가므로, 그런 환경에서는 :hover 가 실제로 걸리는데도 드롭다운이
 * 열리지 않았다. hasTouch 로 그 조건을 재현한다.
 */
test("archive dropdown opens on hover when the browser reports hover: none", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: true,
  });

  try {
    // 재현 조건 자체가 유지되는지 먼저 확인한다. 이게 true 로 바뀌면
    // 이 테스트는 회귀를 더 이상 잡지 못한다.
    const reportsHover = await page.evaluate(
      () => window.matchMedia("(hover: hover)").matches,
    );
    expect(reportsHover).toBe(false);

    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");
    await expect(submenu).toBeHidden();

    await page.getByTestId("public-nav-desktop-archive").hover();

    await expect(submenu).toBeVisible();
    await expect(submenu.getByRole("link", { name: "활동 기록" })).toBeVisible();
    await expect(submenu.getByRole("link", { name: "전시회" })).toBeVisible();
  } finally {
    await context.close();
  }
});

/**
 * 마우스가 없는 터치 기기는 hover 가 아예 없어서 CSS 로는 하위 메뉴에 닿을
 * 방법이 없다. 탭이 부모 링크로 이동해 버리면 전시회는 데스크톱 내비에서
 * 영영 도달 불가능해진다.
 *
 * 주의: Chromium 은 탭한 요소에 sticky hover 를 남기고, parent-hovered 는
 * 미디어 게이트가 없으므로 하위 메뉴는 상태와 무관하게 "보이는" 상태가 된다.
 * 그래서 toBeVisible 만으로는 이 기능의 회귀를 잡지 못한다. 실제로 탭이
 * 열었는지는 data-open 으로 확인해야 한다.
 */
test("archive dropdown opens on tap instead of navigating away", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: true,
  });

  try {
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");
    await expect(submenu).toHaveAttribute("data-open", "false");

    await page.getByTestId("public-nav-desktop-archive").tap();

    await expect(submenu).toHaveAttribute("data-open", "true");
    await expect(submenu).toBeVisible();
    await expectStayedOnHome(page);

    await submenu.getByRole("link", { name: "전시회" }).tap();
    await expect(page).toHaveURL(/\/archive\/exhibitions$/);
  } finally {
    await context.close();
  }
});

test("tapping outside closes the tap-opened dropdown", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: true,
  });

  try {
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");
    await page.getByTestId("public-nav-desktop-archive").tap();
    await expect(submenu).toHaveAttribute("data-open", "true");

    // 헤더 바깥의 빈 영역을 탭한다. 여기서도 sticky hover 가 트리거에서 떨어진다.
    await page.touchscreen.tap(40, 600);

    await expect(submenu).toHaveAttribute("data-open", "false");
    await expect(submenu).toBeHidden();
  } finally {
    await context.close();
  }
});

/**
 * aria-expanded 는 하위 메뉴를 여는 세 경로(마우스 hover / 키보드 focus /
 * 터치 탭) 전부에서 실제 상태와 맞아야 한다. 하나라도 상태를 안 거치고 CSS 로만
 * 열리면 화면은 펼쳐져 있는데 보조기술에는 "접힘"이라고 알려주게 된다.
 */
test("aria-expanded tracks every path that opens the dropdown", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: true,
  });

  try {
    const trigger = page.getByTestId("public-nav-desktop-archive");
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");

    // aria-controls 가 실제로 존재하는 요소를 가리켜야 한다.
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      "public-nav-desktop-archive-submenu",
    );
    await expect(submenu).toHaveAttribute("id", "public-nav-desktop-archive-submenu");

    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // 1. 마우스 hover
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(0, 400);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // 2. 키보드 focus
    await trigger.focus();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId("public-logo-link").focus();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // 3. 터치 탭
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.touchscreen.tap(40, 600);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  } finally {
    await context.close();
  }
});

/** 하위 메뉴가 없는 항목에는 aria-expanded 가 붙으면 안 된다. */
test("nav items without a submenu carry no aria-expanded", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const linktree = page.getByTestId("public-nav-desktop-linktree");
    await expect(linktree).toBeVisible();
    expect(await linktree.getAttribute("aria-expanded")).toBeNull();
    expect(await linktree.getAttribute("aria-controls")).toBeNull();
  } finally {
    await context.close();
  }
});

/**
 * 포커스는 ARCHIVE 에, 마우스는 ABOUT 에 있을 수 있다. 열림 상태를 "지금 열린
 * 항목" 하나로 들고 있으면 이 조합에서 한쪽 aria-expanded 가 틀어진다.
 */
test("aria-expanded stays correct when focus and hover are on different items", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const archive = page.getByTestId("public-nav-desktop-archive");
    const about = page.getByTestId("public-nav-desktop-about");

    await archive.focus();
    await about.hover();

    await expect(archive).toHaveAttribute("aria-expanded", "true");
    await expect(about).toHaveAttribute("aria-expanded", "true");
  } finally {
    await context.close();
  }
});

/**
 * 터치 대응 때문에 마우스 클릭 동작이 바뀌면 안 된다. 마우스는 hover 로 이미
 * 하위 메뉴를 볼 수 있으므로 부모 링크는 지금까지처럼 그냥 이동해야 한다.
 */
test("mouse click on a dropdown trigger still navigates", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    await page.getByTestId("public-nav-desktop-archive").click();
    await expect(page).toHaveURL(/\/archive\/records$/);
  } finally {
    await context.close();
  }
});
