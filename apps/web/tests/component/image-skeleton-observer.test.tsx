import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";

import ImageSkeletonObserver from "@/app/(home)/_components/image-skeleton-observer";

type FrameOptions = {
  /** 브라우저가 이미 로드를 끝낸 이미지인지 (캐시에서 즉시 온 경우) */
  complete?: boolean;
};

const frames: HTMLElement[] = [];

/**
 * 스켈레톤 프레임 하나를 body 에 직접 만든다.
 *
 * 아일랜드는 document 전체를 보므로 RTL 컨테이너 안일 필요가 없고, 오히려 밖에
 * 두는 편이 "다른 라우트가 그린 마크업"이라는 실제 상황에 가깝다.
 */
const appendFrame = ({ complete = false }: FrameOptions = {}) => {
  const frame = document.createElement("div");
  frame.setAttribute("data-image-skeleton", "");

  const image = document.createElement("img");
  // jsdom 은 이미지를 실제로 받지 않아 complete 가 항상 false 다
  Object.defineProperty(image, "complete", { configurable: true, value: complete });
  frame.append(image);

  document.body.append(frame);
  frames.push(frame);
  return { frame, image };
};

const isCleared = (frame: HTMLElement) => frame.hasAttribute("data-image-loaded");

afterEach(() => {
  for (const frame of frames.splice(0)) {
    frame.remove();
  }
});

describe("ImageSkeletonObserver", () => {
  it("이미지 load 를 캡처 단계에서 받아 프레임의 스켈레톤을 해제한다", async () => {
    render(<ImageSkeletonObserver />);
    const { frame, image } = appendFrame();

    expect(isCleared(frame)).toBe(false);

    // load 는 버블링하지 않는다 — document 의 캡처 리스너가 잡아야 한다
    image.dispatchEvent(new Event("load"));

    await waitFor(() => expect(isCleared(frame)).toBe(true));
  });

  it("error 도 완료로 처리해 스켈레톤이 영영 남지 않게 한다", async () => {
    render(<ImageSkeletonObserver />);
    const { frame, image } = appendFrame();

    image.dispatchEvent(new Event("error"));

    await waitFor(() => expect(isCleared(frame)).toBe(true));
  });

  it("마운트 시점에 이미 로드가 끝나 있던 이미지는 즉시 해제한다", async () => {
    // 캐시된 이미지는 하이드레이션 전에 load 가 끝나 이벤트를 놓친다
    const { frame } = appendFrame({ complete: true });

    render(<ImageSkeletonObserver />);

    await waitFor(() => expect(isCleared(frame)).toBe(true));
  });

  it("나중에 DOM 에 추가된 프레임도 재스캔으로 해제한다", async () => {
    render(<ImageSkeletonObserver />);

    // 스트리밍으로 도착하거나 클라이언트 네비게이션으로 갈아끼워진 본문
    const { frame } = appendFrame({ complete: true });

    await waitFor(() => expect(isCleared(frame)).toBe(true));
  });

  it("이미지가 아예 없는 프레임은 기다리지 않고 해제한다", async () => {
    // 표시만 붙고 이미지가 없으면(조건부 렌더 실수) 스켈레톤이 영원히 남는다
    const frame = document.createElement("div");
    frame.setAttribute("data-image-skeleton", "");
    document.body.append(frame);
    frames.push(frame);

    render(<ImageSkeletonObserver />);

    await waitFor(() => expect(isCleared(frame)).toBe(true));
  });

  it("아직 로드되지 않은 이미지는 그대로 둔다", async () => {
    render(<ImageSkeletonObserver />);
    const { frame } = appendFrame();

    await waitFor(() => expect(document.body.contains(frame)).toBe(true));
    expect(isCleared(frame)).toBe(false);
  });

  it("언마운트하면 리스너를 정리해 더 이상 표시하지 않는다", async () => {
    const { unmount } = render(<ImageSkeletonObserver />);
    unmount();

    const { frame, image } = appendFrame();
    image.dispatchEvent(new Event("load"));

    await waitFor(() => expect(document.body.contains(frame)).toBe(true));
    expect(isCleared(frame)).toBe(false);
  });
});
