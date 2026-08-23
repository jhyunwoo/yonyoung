#!/usr/bin/env node
/*
  공개/대시보드 라우트의 런타임 성능을 재는 스크립트.

  production 빌드(`next start`)와 mock API 가 이미 떠 있다고 가정한다.
  개발 서버 수치는 프로덕션 동작과 무관하므로 절대 사용하지 않는다.

  사용:
    node scripts/perf/measure.mjs --out perf-after.json [--base http://127.0.0.1:3005]
                                  [--mock http://127.0.0.1:4010] [--profile mobile|desktop]

  재는 것:
    - 콜드 로드: TTFB / FCP / LCP / CLS, 초기 JS 전송량, 요청 수
    - 웜 클라이언트 네비게이션: "쓸모 있는 셸"이 보이기까지의 시간과 본문 완성 시간
    - 네비게이션 1회당 브라우저 요청 수(프리페치 포함)
    - 네비게이션 1회당 웹→API 업스트림 호출 수(mock API 계측기에서 읽는다)
*/
import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const readFlag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const BASE_URL = readFlag("base", "http://127.0.0.1:3005").replace(/\/+$/, "");
const MOCK_URL = readFlag("mock", "http://127.0.0.1:4010").replace(/\/+$/, "");
const OUT = readFlag("out", "perf.json");
const PROFILE = readFlag("profile", "mobile");
const RUNS = Number(readFlag("runs", "3"));

/** Slow 4G 에 가까운 조건. 저사양 기기 목표를 확인하기 위한 기본값이다. */
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};
const CPU_THROTTLE = PROFILE === "mobile" ? 4 : 1;

const COLD_ROUTES = [
  { route: "/", ready: '[data-testid="home-hero"]' },
  { route: "/archive/records", ready: '[data-testid="archive-records-grid"]' },
  { route: "/archive/records/act-1", ready: '[data-testid="record-detail-gallery"]' },
  { route: "/archive/exhibitions", ready: '[data-testid="archive-exhibitions-grid"]' },
  {
    route: "/archive/exhibitions/exh-1",
    ready: '[data-testid="exhibition-detail-gallery"]',
  },
  { route: "/about", ready: '[data-testid="about-page"]' },
  { route: "/linktree", ready: '[data-testid="linktree-groups"]' },
  { route: "/donate", ready: "main h1" },
];

/*
  웜 네비게이션 시나리오.

  shell   = 목적지 라우트의 재사용 가능한 프레임(App Shell)이 보이는 시점
  content = URL 별 실제 콘텐츠가 채워진 시점

  `via` 는 측정 전에 거쳐 갈 경로, `open` 은 헤더 메뉴를 열어야 하는 경우다.
  모바일 프로필(412px)은 데스크톱 내비가 숨겨져 있으므로 링크를 누르는 방법이
  뷰포트마다 다르다 — `clickHeaderLink` 가 그 차이를 흡수한다.
*/
const NAVIGATIONS = [
  {
    name: "home -> records",
    from: "/",
    click: { testId: "home-cta-archive" },
    shell: "h1:has-text('활동 기록')",
    content: '[data-testid="archive-records-grid"]',
  },
  {
    name: "records -> record detail",
    from: "/archive/records",
    click: { testId: "archive-record-card-act-1" },
    shell: "a:has-text('활동 기록으로 돌아가기')",
    content: '[data-testid="record-detail-gallery"]',
  },
  {
    name: "record detail A -> list -> record detail B",
    from: "/archive/records/act-1",
    via: { selector: "a:has-text('활동 기록으로 돌아가기')" },
    click: { testId: "archive-record-card-act-2" },
    shell: "a:has-text('활동 기록으로 돌아가기')",
    content: '[data-testid="record-detail-gallery"]',
  },
  {
    name: "home -> exhibitions",
    from: "/",
    open: "archive",
    click: { headerLink: "전시회" },
    shell: "h1:has-text('전시회')",
    content: '[data-testid="archive-exhibitions-grid"]',
  },
  {
    name: "exhibitions -> exhibition detail",
    from: "/archive/exhibitions",
    click: { testId: "archive-exhibition-card-exh-1" },
    shell: "a:has-text('전시 아카이브로 돌아가기')",
    content: '[data-testid="exhibition-detail-gallery"]',
  },
  {
    name: "home -> about",
    from: "/",
    click: { testId: "home-cta-about" },
    shell: "h1:has-text('연영회 소개')",
    content: '[data-testid="about-page"]',
  },
  {
    name: "home -> linktree",
    from: "/",
    open: null,
    click: { headerLink: "LINKTREE" },
    shell: "h1:has-text('LINKTREE')",
    content: '[data-testid="linktree-groups"]',
  },
];

const VITALS_SCRIPT = `
window.__perf = { lcp: 0, cls: 0, fcp: 0, longTasks: 0, longTaskTime: 0 };
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.lcp = Math.max(window.__perf.lcp, entry.startTime);
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch {}
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__perf.cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch {}
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') window.__perf.fcp = entry.startTime;
    }
  }).observe({ type: 'paint', buffered: true });
} catch {}
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.longTasks += 1;
      window.__perf.longTaskTime += entry.duration;
    }
  }).observe({ type: 'longtask', buffered: true });
} catch {}
`;

/*
  하이드레이션 완료 대기.

  `networkidle` 은 쓰지 않는다 — e2e 이미지 호스트(images.mock.local)가 존재하지 않아
  요청이 끝나지 않고, 네트워크가 영영 idle 이 되지 않는다. 데스크톱 내비가 하이드레이션
  직후 CSS 전용 열기 클래스를 떼어내는 것을 신호로 쓴다(마크업은 모바일에도 숨겨진 채
  존재한다). tests/e2e 의 관례와 같다.
*/
const waitForHydration = async (page) => {
  await page
    .locator('[data-testid="public-nav-desktop-archive-submenu"]:not(.parent-hovered)')
    .waitFor({ state: "attached", timeout: 15_000 })
    .catch(() => {});
};

/** 헤더 메뉴를 연다. 모바일은 햄버거, 데스크톱은 하위 메뉴가 있는 항목만. */
const openHeaderMenu = async (page, parentTestId) => {
  const toggle = page.getByTestId("public-nav-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.getByTestId("public-nav-mobile").waitFor({ timeout: 10_000 });
    return;
  }
  if (parentTestId) {
    await page.getByTestId(`public-nav-desktop-${parentTestId}`).click();
  }
};

/** 지금 떠 있는 헤더 내비에서 링크를 누른다. */
const clickHeaderLink = async (page, name) => {
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

const performClick = async (page, click) => {
  if (click.testId) {
    await page.getByTestId(click.testId).click();
    return;
  }
  await clickHeaderLink(page, click.headerLink);
};

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? +((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1)
    : +sorted[middle].toFixed(1);
};

const resetUpstream = async () => {
  await fetch(`${MOCK_URL}/__test/upstream-requests`, { method: "DELETE" }).catch(
    () => {},
  );
};

const readUpstream = async () => {
  try {
    const response = await fetch(`${MOCK_URL}/__test/upstream-requests`);
    const body = await response.json();
    return body.counts ?? {};
  } catch {
    return {};
  }
};

const createContext = async (browser) => {
  const context = await browser.newContext({
    ...(PROFILE === "mobile" ? devices["Pixel 7"] : devices["Desktop Chrome"]),
    baseURL: BASE_URL,
  });
  return context;
};

const applyThrottling = async (page) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", NETWORK);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
  return client;
};

const trackRequests = (page) => {
  const stats = { total: 0, js: 0, jsBytes: 0, images: 0, rsc: 0, api: 0, byUrl: [] };
  page.on("request", (request) => {
    const url = request.url();
    stats.total += 1;
    stats.byUrl.push(`${request.method()} ${url.replace(BASE_URL, "")}`);
    if (url.includes("/_next/static/") && url.endsWith(".js")) stats.js += 1;
    if (url.includes("/api/")) stats.api += 1;
  });
  page.on("response", async (response) => {
    const url = response.url();
    const headers = response.headers();
    if (url.includes("/_next/static/") && url.endsWith(".js")) {
      const size = Number(headers["content-length"] ?? 0);
      stats.jsBytes += Number.isFinite(size) ? size : 0;
    }
    if ((headers["content-type"] ?? "").includes("text/x-component")) stats.rsc += 1;
    if ((headers["content-type"] ?? "").startsWith("image/")) stats.images += 1;
  });
  return stats;
};

const measureCold = async (browser, target) => {
  const samples = [];
  for (let run = 0; run < RUNS; run += 1) {
    const context = await createContext(browser);
    await context.addInitScript(VITALS_SCRIPT);
    const page = await context.newPage();
    await applyThrottling(page);
    const requests = trackRequests(page);

    const started = Date.now();
    const response = await page.goto(target.route, { waitUntil: "commit" });
    await page.waitForSelector(target.ready, { timeout: 30_000 }).catch(() => {});
    await waitForHydration(page);
    // LCP 는 상호작용/가시성 변경 전까지 갱신되므로 잠깐 안정화시킨다.
    await page.waitForTimeout(600);

    const perf = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        ...window.__perf,
        ttfb: navigation ? navigation.responseStart : null,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd : null,
      };
    });

    samples.push({
      status: response?.status() ?? 0,
      wall: Date.now() - started,
      ...perf,
      requests: requests.total,
      jsRequests: requests.js,
      jsBytes: requests.jsBytes,
      imageRequests: requests.images,
      rscRequests: requests.rsc,
    });
    await context.close();
  }

  const pick = (key) =>
    median(samples.map((sample) => sample[key]).filter((v) => typeof v === "number"));
  return {
    route: target.route,
    ttfbMs: pick("ttfb"),
    fcpMs: pick("fcp"),
    lcpMs: pick("lcp"),
    cls: median(samples.map((s) => +s.cls.toFixed(4))),
    longTasks: pick("longTasks"),
    longTaskMs: pick("longTaskTime"),
    requests: pick("requests"),
    jsRequests: pick("jsRequests"),
    jsKB: median(samples.map((s) => +(s.jsBytes / 1024).toFixed(1))),
    imageRequests: pick("imageRequests"),
  };
};

const measureNavigation = async (browser, scenario) => {
  const shellSamples = [];
  const contentSamples = [];
  let requestsDuringNav = 0;
  let prefetchRequests = 0;
  let upstream = {};

  for (let run = 0; run < RUNS; run += 1) {
    const context = await createContext(browser);
    const page = await context.newPage();
    await applyThrottling(page);

    await page.goto(scenario.from, { waitUntil: "load" });
    await waitForHydration(page);
    if (scenario.via) {
      await page.click(scenario.via.selector);
      await page.waitForSelector(scenario.via.ready ?? "body", { timeout: 20_000 });
      await waitForHydration(page);
    }
    // 프리페치가 자리 잡을 시간을 준 뒤 계측을 시작한다.
    await page.waitForTimeout(700);
    if (scenario.open !== undefined) {
      await openHeaderMenu(page, scenario.open);
    }

    const navRequests = [];
    const onRequest = (request) => navRequests.push(request.url());
    page.on("request", onRequest);
    await resetUpstream();

    const started = Date.now();
    await performClick(page, scenario.click);
    await page.waitForSelector(scenario.shell, { timeout: 30_000 }).catch(() => {});
    const shellAt = Date.now() - started;
    await page.waitForSelector(scenario.content, { timeout: 30_000 }).catch(() => {});
    const contentAt = Date.now() - started;

    upstream = await readUpstream();
    page.off("request", onRequest);
    shellSamples.push(shellAt);
    contentSamples.push(contentAt);
    requestsDuringNav = navRequests.length;
    prefetchRequests = navRequests.filter((url) => url.includes("_rsc=")).length;

    await context.close();
  }

  return {
    name: scenario.name,
    shellMs: median(shellSamples),
    contentMs: median(contentSamples),
    requestsDuringNav,
    rscRequestsDuringNav: prefetchRequests,
    upstreamApiCalls: Object.values(upstream).reduce((sum, n) => sum + n, 0),
    upstream,
  };
};

/** 목록 페이지가 카드 수만큼 프리페치를 쏘지 않는지 확인한다. */
const measurePrefetch = async (browser, route) => {
  const context = await createContext(browser);
  const page = await context.newPage();
  const prefetches = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("_rsc=") || request.headers()["next-router-prefetch"]) {
      prefetches.push(url.replace(BASE_URL, ""));
    }
  });
  await page.goto(route, { waitUntil: "load" });
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(2500);
  await context.close();
  return { route, prefetchRequests: prefetches.length, urls: [...new Set(prefetches)] };
};

const main = async () => {
  const browser = await chromium.launch();
  const result = {
    profile: PROFILE,
    cpuThrottle: CPU_THROTTLE,
    network: "slow-4g",
    runs: RUNS,
    measuredAt: new Date().toISOString(),
    cold: [],
    navigations: [],
    prefetch: [],
  };

  // 한 시나리오가 실패해도 나머지 결과를 잃지 않는다 — 측정은 재현 비용이 크다.
  const safely = async (label, run, onError) => {
    try {
      return await run();
    } catch (error) {
      process.stderr.write(`FAILED ${label}: ${error.message.split("\n")[0]}\n`);
      return onError;
    }
  };

  for (const target of COLD_ROUTES) {
    result.cold.push(
      await safely(`cold ${target.route}`, () => measureCold(browser, target), {
        route: target.route,
        failed: true,
      }),
    );
    process.stderr.write(`cold ${target.route}\n`);
  }
  for (const scenario of NAVIGATIONS) {
    result.navigations.push(
      await safely(`nav ${scenario.name}`, () => measureNavigation(browser, scenario), {
        name: scenario.name,
        failed: true,
      }),
    );
    process.stderr.write(`nav ${scenario.name}\n`);
  }
  for (const route of ["/archive/records", "/archive/exhibitions"]) {
    result.prefetch.push(
      await safely(`prefetch ${route}`, () => measurePrefetch(browser, route), {
        route,
        failed: true,
      }),
    );
  }

  await browser.close();
  await mkdir(path.dirname(path.resolve(OUT)), { recursive: true });
  await writeFile(path.resolve(OUT), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stderr.write(`wrote ${OUT}\n`);
};

await main();
