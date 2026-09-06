import { expect, test } from "@playwright/test";

/**
 * 이미지 로딩 스켈레톤.
 *
 * 스켈레톤은 `globals.css` 의 `[data-image-skeleton]::before` 가 그리고,
 * `image-skeleton-observer.tsx` 아일랜드가 로드가 끝난 프레임에 `data-image-loaded`
 * 를 붙여 끈다. 유닛 테스트는 아일랜드 로직만 보므로, 여기서는 **프로덕션 빌드의
 * 실제 스타일시트와 아일랜드가 함께** 동작하는지를 본다.
 *
 * 주의: e2e 에서 게시물 이미지는 절대 로드되지 않는다 — CSP img-src 에
 * `images.mock.local` 이 없어 요청 전에 차단되고 곧바로 error 가 난다.
 * 그래서 "도착 전" 상태를 보려면 CSP 를 통과하는 동일 출처 이미지를 써야 한다.
 */

const FRAME = "[data-image-skeleton]";
const CLEARED = "[data-image-skeleton][data-image-loaded]";

const readBefore = (selector: string) => `(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  if (!node) return null;
  const style = getComputedStyle(node, "::before");
  return { content: style.content, animationName: style.animationName };
})()`;

test("이미지가 실패해도 스켈레톤이 남지 않는다", async ({ page }) => {
  await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });

  const frames = page.locator(FRAME);
  await expect(frames.first()).toBeAttached();
  const total = await frames.count();
  expect(total).toBeGreaterThan(0);

  // CSP 차단으로 전부 error 가 나는데, 그래도 마지막 한 장까지 걷혀야 한다
  await expect(page.locator(CLEARED)).toHaveCount(total);

  const before = await page.evaluate(readBefore(FRAME));
  expect(before).toEqual({ content: "none", animationName: "image-skeleton-sweep" });
});

test("도착 전에는 스윕 스켈레톤이 그려진다", async ({ page }) => {
  let releaseImage = () => {};
  const held = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });

  // 동일 출처라 CSP 를 통과한다 — 응답을 붙잡아 "아직 도착하지 않은" 상태를 만든다
  await page.route("**/__test/never-arrives.png", async (route) => {
    await held;
    await route.abort();
  });

  await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    const frame = document.createElement("div");
    frame.setAttribute("data-image-skeleton", "");
    frame.id = "skeleton-probe";
    frame.style.cssText = "position:relative;width:200px;height:150px";
    const image = document.createElement("img");
    image.src = "/__test/never-arrives.png";
    frame.append(image);
    // 이미지까지 붙인 뒤에 한 번에 넣는다 — 이미지 없는 프레임은 아일랜드가 즉시 걷는다
    document.body.append(frame);
  });

  const probe = page.locator("#skeleton-probe");
  await expect(probe).not.toHaveAttribute("data-image-loaded", /.*/);

  const before = await page.evaluate(readBefore("#skeleton-probe"));
  // content 가 none 이 아니면 ::before 가 실제로 생성됐다는 뜻이다
  expect(before).toEqual({ content: '""', animationName: "image-skeleton-sweep" });

  releaseImage();

  await expect(probe).toHaveAttribute("data-image-loaded", "");
  const afterward = await page.evaluate(readBefore("#skeleton-probe"));
  expect(afterward?.content).toBe("none");
});
