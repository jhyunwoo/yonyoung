import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ImgHTMLAttributes } from "react";

afterEach(() => {
  cleanup();
});

type MockNextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number | `${number}`;
  placeholder?: "blur" | "empty" | `data:image/${string}`;
  blurDataURL?: string;
};

vi.mock("next/image", () => ({
  default: (props: MockNextImageProps) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    delete imageProps.unoptimized;
    delete imageProps.quality;
    delete imageProps.placeholder;
    delete imageProps.blurDataURL;

    return createElement("img", imageProps);
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement("a", { ...props, href }, children),
}));

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/*
  jsdom 은 IntersectionObserver 를 구현하지 않는다. 공개 헤더의 스크롤 상태와
  등장 애니메이션 옵저버가 이걸 쓰므로, 관찰만 받아 두고 아무것도 통지하지 않는
  최소 스텁을 둔다(초기 상태 = 관찰 콜백 미호출 = 스크롤 안 됨/미노출).
*/
if (typeof window !== "undefined" && typeof window.IntersectionObserver !== "function") {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    constructor() {}
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: IntersectionObserverStub,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: IntersectionObserverStub,
  });
}

if (
  typeof window !== "undefined" &&
  (typeof window.localStorage === "undefined" ||
    typeof window.localStorage.clear !== "function")
) {
  const storage = (() => {
    const entries = new Map<string, string>();

    return {
      get length() {
        return entries.size;
      },
      clear: () => {
        entries.clear();
      },
      getItem: (key: string) => {
        return entries.get(String(key)) ?? null;
      },
      key: (index: number) => {
        return [...entries.keys()][index] ?? null;
      },
      removeItem: (key: string) => {
        entries.delete(String(key));
      },
      setItem: (key: string, value: string) => {
        entries.set(String(key), String(value));
      },
    } satisfies Storage;
  })();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}
