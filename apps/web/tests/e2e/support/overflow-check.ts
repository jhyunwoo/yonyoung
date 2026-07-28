import { expect, type Page } from "@playwright/test";

/**
 * 가로 스크롤(레이아웃 깨짐) 회귀 검사.
 *
 * 공백 없는 긴 URL·이메일이 flex/grid 트랙을 밀어내면 문서 전체에 가로 스크롤이
 * 생긴다. 문서 폭으로 먼저 판정하고, 실패했을 때만 원인 요소를 수집해
 * 에러 메시지에 담는다(정상 경로에서는 DOM 전수 조사를 하지 않는다).
 */
const TOLERANCE_PX = 1;

type OverflowCulprit = {
  selector: string;
  right: number;
  text: string;
};

const readOverflowCulprits = async (page: Page): Promise<OverflowCulprit[]> =>
  page.evaluate((tolerance) => {
    const limit = document.documentElement.clientWidth + tolerance;
    const culprits: OverflowCulprit[] = [];

    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= limit) {
        continue;
      }

      const testId = element.getAttribute("data-testid");
      const className =
        typeof element.className === "string" ? element.className : "";
      culprits.push({
        selector: [
          element.tagName.toLowerCase(),
          testId ? `[data-testid="${testId}"]` : "",
          className ? `.${className.trim().split(/\s+/).slice(0, 4).join(".")}` : "",
        ].join(""),
        right: Math.round(rect.right),
        text: (element.textContent ?? "").trim().slice(0, 60),
      });
    }

    return culprits.slice(0, 10);
  }, TOLERANCE_PX);

export const assertNoHorizontalOverflow = async (
  page: Page,
  context: string,
): Promise<void> => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  if (scrollWidth <= clientWidth + TOLERANCE_PX) {
    return;
  }

  const culprits = await readOverflowCulprits(page);
  const detail = culprits
    .map((culprit) => `  - ${culprit.selector} (right=${culprit.right}) "${culprit.text}"`)
    .join("\n");

  expect(
    scrollWidth,
    `${context}: 가로 스크롤 발생 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})\n${detail}`,
  ).toBeLessThanOrEqual(clientWidth + TOLERANCE_PX);
};
