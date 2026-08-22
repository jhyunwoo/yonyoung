import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("framer-motion", () => {
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, tagName: string) => {
        return ({ children, ...props }: Record<string, unknown>) =>
          createElement(tagName, props, children);
      },
    },
  );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    motion: motionProxy,
    useReducedMotion: () => true,
  };
});

import {
  PhotoGallery,
  type PhotoGalleryItem,
} from "@/app/(home)/_components/photo-gallery";

const makeItems = (): PhotoGalleryItem[] => [
  {
    key: "with-dimensions",
    imageUrl: "https://images.mock.local/landscape.jpg",
    alt: "가로 사진",
    width: 1600,
    height: 1200,
  },
  {
    key: "legacy-without-dimensions",
    imageUrl: "https://images.mock.local/legacy.jpg",
    alt: "레거시 사진",
    width: null,
    height: null,
  },
];

const renderGallery = (items: PhotoGalleryItem[] = makeItems()) => {
  return render(
    <PhotoGallery
      items={items}
      fallbackAspect={4 / 3}
      refAspect={1.5}
      data-testid="test-gallery"
    />,
  );
};

const getTiles = (): HTMLElement[] => screen.getAllByRole("listitem");

/** 타일에도 같은 alt 의 이미지가 있으므로 반드시 라이트박스 프레임 안에서 찾는다 */
const getLightboxImage = (alt: string): HTMLElement =>
  within(screen.getByTestId("gallery-lightbox-frame")).getByAltText(alt);

const getPreloadImage = (key: string): HTMLElement =>
  screen.getByTestId(`gallery-preload-${key}`);

describe("PhotoGallery 레이아웃", () => {
  it("justified rows 컨테이너로 렌더링되고 CSS 컬럼을 쓰지 않는다", () => {
    renderGallery();

    const gallery = screen.getByTestId("test-gallery");
    expect(gallery.className).toContain("photo-gallery");
    expect(gallery.className).not.toContain("columns-");
    expect(gallery.style.getPropertyValue("--gallery-ref-aspect")).toBe("1.5");
  });

  it("사진을 입력 순서 그대로(가로 우선) 배치한다", () => {
    renderGallery();

    const tileAlts = getTiles().map(
      (tile) => tile.querySelector("img")?.getAttribute("alt"),
    );
    expect(tileAlts).toEqual(["가로 사진", "레거시 사진"]);
  });

  it("치수가 저장된 이미지는 원본 비율을 그대로 쓴다", () => {
    renderGallery();

    // 1600 / 1200 = 1.3333
    expect(getTiles()[0]?.style.getPropertyValue("--photo-aspect")).toBe("1.3333");
  });

  it("치수 미상 이미지는 폴백 비율로 시작해 onLoad 측정값으로 보정된다", () => {
    renderGallery();

    expect(getTiles()[1]?.style.getPropertyValue("--photo-aspect")).toBe("1.3333");

    const legacyImage = screen.getByAltText("레거시 사진");
    Object.defineProperty(legacyImage, "naturalWidth", { value: 1000 });
    Object.defineProperty(legacyImage, "naturalHeight", { value: 2000 });
    fireEvent.load(legacyImage);

    // 1000 / 2000 = 0.5
    expect(getTiles()[1]?.style.getPropertyValue("--photo-aspect")).toBe("0.5000");
  });
});

describe("PhotoGallery 라이트박스", () => {
  it("사진을 클릭하면 확대 보기가 열린다", async () => {
    const user = userEvent.setup();
    renderGallery();

    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    expect(screen.getByTestId("gallery-lightbox")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("1 / 2");
    expect(screen.getByTestId("gallery-lightbox-frame").querySelector("img")).toHaveAttribute(
      "alt",
      "가로 사진",
    );
  });

  it("좌우 버튼으로 순환 이동한다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    await user.click(screen.getByTestId("gallery-lightbox-next"));
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("2 / 2");

    // 마지막에서 다음으로 가면 처음으로 순환
    await user.click(screen.getByTestId("gallery-lightbox-next"));
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("1 / 2");

    // 처음에서 이전으로 가면 마지막으로 순환
    await user.click(screen.getByTestId("gallery-lightbox-prev"));
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("2 / 2");
  });

  it("화살표 키로도 이동한다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("2 / 2");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("1 / 2");
  });

  it("닫기 버튼으로 닫힌다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    await user.click(screen.getByTestId("gallery-lightbox-close"));

    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();
  });

  it("사진 밖 어두운 영역을 클릭하면 닫힌다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    await user.click(screen.getByTestId("gallery-lightbox-backdrop"));

    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();
  });

  it("Escape 키로 닫힌다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByTestId("gallery-lightbox")).toBeNull();
  });

  it("사진이 한 장뿐이면 좌우 이동 버튼과 카운터를 렌더링하지 않는다", async () => {
    const user = userEvent.setup();
    const [singleItem] = makeItems();
    renderGallery(singleItem ? [singleItem] : []);

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    expect(screen.getByTestId("gallery-lightbox")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-lightbox-prev")).toBeNull();
    expect(screen.queryByTestId("gallery-lightbox-next")).toBeNull();
    expect(screen.queryByTestId("gallery-lightbox-counter")).toBeNull();
  });

  it("사진이 로드되기 전에는 스켈레톤을 보여준다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    expect(screen.getByTestId("gallery-lightbox-skeleton")).toBeInTheDocument();

    fireEvent.load(getLightboxImage("가로 사진"));

    expect(screen.queryByTestId("gallery-lightbox-skeleton")).toBeNull();
  });

  it("이미지 로드에 실패해도 스켈레톤이 남지 않는다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    fireEvent.error(getLightboxImage("가로 사진"));

    expect(screen.queryByTestId("gallery-lightbox-skeleton")).toBeNull();
  });

  it("이미 본 사진으로 돌아오면 스켈레톤을 다시 보여주지 않는다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    fireEvent.load(getLightboxImage("가로 사진"));

    // 다음 사진은 아직 로드 전이라 스켈레톤이 다시 뜬다
    await user.click(screen.getByTestId("gallery-lightbox-next"));
    expect(screen.getByTestId("gallery-lightbox-skeleton")).toBeInTheDocument();

    await user.click(screen.getByTestId("gallery-lightbox-prev"));
    expect(screen.queryByTestId("gallery-lightbox-skeleton")).toBeNull();
  });

  it("닫으면 배경 스크롤 잠금이 풀린다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByTestId("gallery-lightbox-close"));
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("PhotoGallery 확대 이미지 미리 로딩", () => {
  const makeThreeItems = (): PhotoGalleryItem[] => [
    { key: "a", imageUrl: "https://images.mock.local/a.jpg", alt: "A", width: 1600, height: 1200 },
    { key: "b", imageUrl: "https://images.mock.local/b.jpg", alt: "B", width: 1600, height: 1200 },
    { key: "c", imageUrl: "https://images.mock.local/c.jpg", alt: "C", width: 1600, height: 1200 },
  ];

  it("라이트박스를 열면 앞뒤 사진만 미리 받아둔다", async () => {
    const user = userEvent.setup();
    renderGallery(makeThreeItems());

    await user.click(screen.getByTestId("gallery-photo-button-b"));

    // 현재 보고 있는 b 는 제외하고 앞뒤(a, c)만
    expect(getPreloadImage("a")).toBeInTheDocument();
    expect(getPreloadImage("c")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-preload-b")).toBeNull();
  });

  it("미리 받는 이미지는 라이트박스와 동일한 sizes 를 즉시 요청한다", async () => {
    const user = userEvent.setup();
    renderGallery(makeThreeItems());

    await user.click(screen.getByTestId("gallery-photo-button-b"));

    const preloaded = getPreloadImage("c");
    // sizes 나 loading 이 어긋나면 브라우저가 다른 후보를 골라 미리 받은 게 무효가 된다
    expect(preloaded).toHaveAttribute("loading", "eager");
    expect(preloaded.getAttribute("sizes")).toBe(
      getLightboxImage("B").getAttribute("sizes"),
    );
  });

  it("미리 받아둔 사진으로 이동하면 스켈레톤이 뜨지 않는다", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));
    fireEvent.load(getPreloadImage("legacy-without-dimensions"));

    await user.click(screen.getByTestId("gallery-lightbox-next"));

    expect(screen.getByTestId("gallery-lightbox-counter")).toHaveTextContent("2 / 2");
    expect(screen.queryByTestId("gallery-lightbox-skeleton")).toBeNull();
  });

  it("타일에 hover 하면 그 사진을 미리 받아두고, 열었을 때 스켈레톤이 없다", async () => {
    const user = userEvent.setup();
    renderGallery();

    expect(screen.queryByTestId("gallery-preload-layer")).toBeNull();

    await user.hover(screen.getByTestId("gallery-photo-button-with-dimensions"));
    fireEvent.load(getPreloadImage("with-dimensions"));

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    expect(screen.getByTestId("gallery-lightbox")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-lightbox-skeleton")).toBeNull();
  });

  it("사진이 한 장뿐이면 미리 받아둘 사진이 없다", async () => {
    const user = userEvent.setup();
    const [singleItem] = makeItems();
    renderGallery(singleItem ? [singleItem] : []);

    await user.click(screen.getByTestId("gallery-photo-button-with-dimensions"));

    expect(screen.getByTestId("gallery-lightbox")).toBeInTheDocument();
    expect(screen.queryByTestId("gallery-preload-layer")).toBeNull();
  });
});
