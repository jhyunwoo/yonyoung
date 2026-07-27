import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MasonryGallery,
  type MasonryGalleryItem,
} from "@/app/(home)/_components/masonry-gallery";

// next/image는 jsdom에서 로더 설정이 필요하므로 순수 <img>로 대체해 분기 로직만 검증한다
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as Record<string, string>)} />;
  },
}));

const makeItems = (): MasonryGalleryItem[] => [
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

describe("MasonryGallery", () => {
  afterEach(() => {
    cleanup();
  });

  it("CSS 컬럼 기반 masonry 컨테이너로 렌더링된다", () => {
    const { container } = render(
      <MasonryGallery
        items={makeItems()}
        fallbackAspectRatio="4 / 3"
        data-testid="test-gallery"
      />,
    );

    const gallery = container.querySelector('[data-testid="test-gallery"]');
    expect(gallery).not.toBeNull();
    expect(gallery?.className).toContain("columns-1");
    expect(gallery?.className).toContain("sm:columns-2");
    expect(gallery?.className).toContain("lg:columns-3");
  });

  it("치수가 저장된 이미지는 width/height 속성으로 원본 비율 렌더링된다", () => {
    render(<MasonryGallery items={makeItems()} fallbackAspectRatio="4 / 3" />);

    const image = screen.getByAltText("가로 사진");
    expect(image.getAttribute("width")).toBe("1600");
    expect(image.getAttribute("height")).toBe("1200");
  });

  it("치수 미상(레거시) 이미지는 폴백 비율 프레임으로 렌더링된다", () => {
    render(<MasonryGallery items={makeItems()} fallbackAspectRatio="4 / 3" />);

    const legacyImage = screen.getByAltText("레거시 사진");
    const frame = legacyImage.closest("div");
    expect(frame?.getAttribute("style")).toContain("aspect-ratio: 4 / 3");
  });

  it("onLoad에서 실제 비율을 측정하면 프레임 비율이 보정된다", () => {
    render(<MasonryGallery items={makeItems()} fallbackAspectRatio="4 / 3" />);

    const legacyImage = screen.getByAltText("레거시 사진") as HTMLImageElement;
    Object.defineProperty(legacyImage, "naturalWidth", { value: 1000 });
    Object.defineProperty(legacyImage, "naturalHeight", { value: 2000 });
    fireEvent.load(legacyImage);

    const frame = legacyImage.closest("div");
    expect(frame?.getAttribute("style")).toContain("aspect-ratio: 1000 / 2000");
  });
});
