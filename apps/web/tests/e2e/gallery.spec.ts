import { expect, test, type Locator, type Page } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./support/overflow-check";

/**
 * act-1 시드는 가로 3장(3:2, 3:2, 4:3) + 세로 2장(2:3) + 레거시 1장으로 구성돼 있다.
 * 데스크탑(컨텐츠 폭 1136px, refAspect 1.5)에서는 첫 행에 가로 3장이 들어간다.
 *
 * 주의: e2e 에서 이미지는 절대 로드되지 않는다(CSP img-src 에 images.mock.local 없음 +
 * 호스트 미존재). 따라서 자연 크기나 onLoad 보정에 의존하지 말고 박스 측정만 사용한다.
 */

type TileBox = { x: number; y: number; width: number; height: number };

const readTileBoxes = async (gallery: Locator): Promise<TileBox[]> => {
  const tiles = gallery.locator("li");
  const count = await tiles.count();
  const boxes: TileBox[] = [];

  for (let index = 0; index < count; index += 1) {
    const box = await tiles.nth(index).boundingBox();
    expect(box, `타일 ${index} 의 boundingBox 를 읽지 못했다`).not.toBeNull();
    boxes.push(box as TileBox);
  }

  return boxes;
};

/** DOM 순서를 유지한 채 같은 행(y 좌표가 비슷한 것)끼리 묶는다 */
const groupIntoRows = (boxes: TileBox[]): TileBox[][] => {
  const rows: TileBox[][] = [];

  for (const box of boxes) {
    const lastRow = rows.at(-1);
    if (lastRow && Math.abs((lastRow[0]?.y ?? 0) - box.y) <= 2) {
      lastRow.push(box);
      continue;
    }
    rows.push([box]);
  }

  return rows;
};

const openGallery = async (page: Page): Promise<Locator> => {
  await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });
  const gallery = page.getByTestId("record-detail-gallery");
  await expect(gallery).toBeVisible();
  return gallery;
};

test("갤러리가 justified rows 로 배치된다", async ({ page }, testInfo) => {
  const gallery = await openGallery(page);

  const layout = await gallery.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return { display: style.display, flexWrap: style.flexWrap };
  });
  expect(layout.display).toBe("flex");
  expect(layout.flexWrap).toBe("wrap");

  const rows = groupIntoRows(await readTileBoxes(gallery));
  expect(rows.length).toBeGreaterThan(0);

  for (const row of rows) {
    // justified: 한 행 안의 사진 높이는 모두 같다
    const heights = row.map((box) => box.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);

    // row-major: 한 행 안에서 DOM 순서대로 왼쪽 → 오른쪽
    for (let index = 1; index < row.length; index += 1) {
      expect(row[index]?.x ?? 0).toBeGreaterThan(row[index - 1]?.x ?? 0);
    }
  }

  // 마지막이 아닌 행은 컨테이너 폭을 가득 채운다
  const galleryBox = await gallery.boundingBox();
  expect(galleryBox).not.toBeNull();
  for (const row of rows.slice(0, -1)) {
    const lastTile = row.at(-1);
    const rowRight = (lastTile?.x ?? 0) + (lastTile?.width ?? 0);
    expect(Math.abs(rowRight - ((galleryBox?.x ?? 0) + (galleryBox?.width ?? 0)))).toBeLessThan(
      2,
    );
  }

  // 데스크탑은 한 행에 3장, 모바일은 1장
  expect(rows[0]?.length).toBe(testInfo.project.name === "mobile-chromium" ? 1 : 3);

  await assertNoHorizontalOverflow(page, "활동 기록 상세 갤러리");
});

test("사진 순서가 DOM 상에서 sortOrder 를 따른다", async ({ page }) => {
  const gallery = await openGallery(page);

  const testIds = await gallery.locator("li button").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid")),
  );

  expect(testIds).toEqual([
    "gallery-photo-button-act-1-img-1",
    "gallery-photo-button-act-1-img-2",
    "gallery-photo-button-act-1-img-3",
    "gallery-photo-button-act-1-img-4",
    "gallery-photo-button-act-1-img-5",
    "gallery-photo-button-act-1-img-6",
  ]);
});

test("사진을 클릭하면 라이트박스가 열리고 좌우로 이동한다", async ({ page }) => {
  await openGallery(page);

  await page.getByTestId("gallery-photo-button-act-1-img-1").click();

  const lightbox = page.getByTestId("gallery-lightbox");
  await expect(lightbox).toBeVisible();
  await expect(page.getByTestId("gallery-lightbox-counter")).toHaveText("1 / 6");

  await page.getByTestId("gallery-lightbox-next").click();
  await expect(page.getByTestId("gallery-lightbox-counter")).toHaveText("2 / 6");

  await page.getByTestId("gallery-lightbox-prev").click();
  await expect(page.getByTestId("gallery-lightbox-counter")).toHaveText("1 / 6");

  // 처음에서 이전으로 가면 마지막으로 순환
  await page.getByTestId("gallery-lightbox-prev").click();
  await expect(page.getByTestId("gallery-lightbox-counter")).toHaveText("6 / 6");
});

test("라이트박스가 화면 전체를 덮는다", async ({ page }) => {
  await openGallery(page);
  await page.getByTestId("gallery-photo-button-act-1-img-1").click();

  // 갤러리의 container-type 때문에 portal 로 body 에 붙이지 않으면 여기서 갇힌다
  const box = await page.getByTestId("gallery-lightbox").boundingBox();
  const viewport = page.viewportSize();
  expect(box?.x ?? -1).toBeLessThanOrEqual(1);
  expect(box?.y ?? -1).toBeLessThanOrEqual(1);
  expect(Math.abs((box?.width ?? 0) - (viewport?.width ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((box?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThanOrEqual(2);
});

test("닫기 버튼 · Escape · 사진 밖 영역 클릭으로 라이트박스를 닫는다", async ({ page }) => {
  await openGallery(page);
  const lightbox = page.getByTestId("gallery-lightbox");
  const firstPhoto = page.getByTestId("gallery-photo-button-act-1-img-1");

  await firstPhoto.click();
  await page.getByTestId("gallery-lightbox-close").click();
  await expect(lightbox).toBeHidden();

  await firstPhoto.click();
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();

  await firstPhoto.click();
  await expect(lightbox).toBeVisible();
  // 사진 프레임 클릭은 닫지 않는다
  await page.getByTestId("gallery-lightbox-frame").click();
  await expect(lightbox).toBeVisible();
  // 사진 바깥 어두운 영역(좌상단 모서리) 클릭은 닫는다
  await page.mouse.click(6, 6);
  await expect(lightbox).toBeHidden();
});

test("전시회 상세 갤러리도 동일하게 동작한다", async ({ page }) => {
  await page.goto("/archive/exhibitions/exh-1", { waitUntil: "domcontentloaded" });

  const gallery = page.getByTestId("exhibition-detail-gallery");
  await expect(gallery).toBeVisible();
  await expect(gallery).toHaveClass(/photo-gallery/);

  await page.getByTestId("gallery-photo-button-exh-1-img-1").click();
  await expect(page.getByTestId("gallery-lightbox")).toBeVisible();

  // 사진이 한 장이면 좌우 버튼과 카운터를 렌더링하지 않는다
  await expect(page.getByTestId("gallery-lightbox-prev")).toHaveCount(0);
  await expect(page.getByTestId("gallery-lightbox-next")).toHaveCount(0);
  await expect(page.getByTestId("gallery-lightbox-counter")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gallery-lightbox")).toBeHidden();
});
