import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";

/*
  프로젝트별 뷰포트(모바일 프로젝트는 412px)와 무관하게 데스크톱 내비게이션을
  검증해야 하므로 컨텍스트를 직접 만든다. 768px 이상이어야 햄버거 메뉴가 아니라
  데스크톱 내비가 나온다.
*/
/*
  하이드레이션 전에는 부모 링크 클릭이 그냥 이동한다 — JS 없는 환경을 위한
  폴백이라 의도한 동작이다. domcontentloaded 는 그 시점을 보장하지 않아서,
  병렬 실행으로 느려지면 클릭 테스트가 간헐적으로 이동해 버린다.

  데스크톱 내비는 하이드레이션되는 순간 CSS 전용 열기 클래스를 떼어내므로
  (site-header-desktop-nav.tsx), 그 클래스가 사라진 것을 신호로 쓴다.
*/
const waitForNavHydration = async (page: Page) => {
  await expect(page.getByTestId("public-nav-desktop-archive-submenu")).not.toHaveClass(
    /parent-hovered/,
  );
};

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
  await waitForNavHydration(page);
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
 * Chromium 은 탭한 요소에 sticky hover 를 남긴다. 하이드레이션 이후에는
 * parent-hovered 클래스를 떼어내므로 그 hover 가 하위 메뉴를 열어 두지 못하지만,
 * 그래도 "탭이 열었는지"는 toBeVisible 이 아니라 data-open 으로 확인한다.
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

/**
 * 두 번째 탭은 닫는다. 하이드레이션 이후 data-open 이 유일한 근거이므로
 * sticky hover 가 남아 있어도 화면과 상태가 어긋나지 않아야 한다.
 */
test("a second tap on the trigger closes the dropdown", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: true,
  });

  try {
    const trigger = page.getByTestId("public-nav-desktop-archive");
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");

    await trigger.tap();
    await expect(submenu).toHaveAttribute("data-open", "true");

    await trigger.tap();

    await expect(submenu).toHaveAttribute("data-open", "false");
    await expect(submenu).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expectStayedOnHome(page);
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
 * 하위 메뉴가 있는 항목의 부모 클릭은 이동이 아니라 "열기"다. 예전에는 마우스
 * 클릭이 그대로 이동해서, hover 로 펼쳐진 메뉴를 클릭이 앞질러 없애 버렸다 —
 * 전시회를 고르려 해도 활동 기록으로 끌려갔다.
 */
test("mouse click on a dropdown trigger opens the submenu instead of navigating", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");

    await page.getByTestId("public-nav-desktop-archive").click();

    await expect(submenu).toHaveAttribute("data-open", "true");
    await expect(submenu).toBeVisible();
    await expectStayedOnHome(page);

    await submenu.getByRole("link", { name: "전시회" }).click();
    await expect(page).toHaveURL(/\/archive\/exhibitions$/);
  } finally {
    await context.close();
  }
});

/**
 * 마우스가 트리거 위에 그대로 있는 상태에서 닫혀야 한다. CSS 로 여는 경로를
 * 하이드레이션 이후까지 남겨 두면 :hover 가 계속 열어 둬서, 상태는 닫힘인데
 * 화면은 펼쳐진 채로 어긋난다.
 */
test("a second mouse click closes the dropdown while the pointer stays on the trigger", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const trigger = page.getByTestId("public-nav-desktop-archive");
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");

    await trigger.click();
    await expect(submenu).toHaveAttribute("data-open", "true");

    await trigger.click();

    await expect(submenu).toHaveAttribute("data-open", "false");
    await expect(submenu).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  } finally {
    await context.close();
  }
});

/** 키보드 Enter 도 이동이 아니라 열기여야 하고, 이동은 하위 항목이 담당한다. */
test("keyboard Enter on a dropdown trigger opens the submenu instead of navigating", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");

    await page.getByTestId("public-nav-desktop-archive").focus();
    await page.keyboard.press("Enter");

    await expect(submenu).toHaveAttribute("data-open", "true");
    await expectStayedOnHome(page);

    // 트리거 다음 순서는 하위 항목이다: 활동 기록 → 전시회.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(submenu.getByRole("link", { name: "전시회" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/archive\/exhibitions$/);
  } finally {
    await context.close();
  }
});

/** 하위 메뉴가 있는 항목은 전부 같은 규칙을 따라야 한다 — ARCHIVE 도 ABOUT 도. */
test("about dropdown behaves the same as archive", async ({ browser }, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    const submenu = page.getByTestId("public-nav-desktop-about-submenu");

    await page.getByTestId("public-nav-desktop-about").click();

    await expect(submenu).toHaveAttribute("data-open", "true");
    await expectStayedOnHome(page);

    await submenu.getByRole("link", { name: "PHOTOGRAPHERS" }).click();
    await expect(page).toHaveURL(/\/about\/photographers$/);
  } finally {
    await context.close();
  }
});

/**
 * 하위 페이지에서도 같은 동작이어야 한다. 헤더는 전 페이지 공용이지만, 활성
 * 항목(밑줄 고정)에서 클릭 처리가 달라지는 회귀를 막는다.
 */
test("the dropdown still opens on click from inside the archive section", async ({
  browser,
}, testInfo) => {
  const { context, page } = await openDesktopContext(browser, testInfo, {
    hasTouch: false,
  });

  try {
    await page.goto("/archive/exhibitions", { waitUntil: "domcontentloaded" });
    await waitForNavHydration(page);

    const submenu = page.getByTestId("public-nav-desktop-archive-submenu");
    await page.getByTestId("public-nav-desktop-archive").click();

    await expect(submenu).toHaveAttribute("data-open", "true");
    await page.waitForTimeout(700);
    expect(new URL(page.url()).pathname).toBe("/archive/exhibitions");

    await submenu.getByRole("link", { name: "활동 기록" }).click();
    await expect(page).toHaveURL(/\/archive\/records$/);
  } finally {
    await context.close();
  }
});
