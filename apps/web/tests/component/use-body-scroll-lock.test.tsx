import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "@/app/(home)/_components/hooks/use-body-scroll-lock";

describe("useBodyScrollLock", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("잠그는 동안 hidden 이고, 풀면 잠그기 전 값으로 돌아간다", () => {
    document.body.style.overflow = "scroll";
    const { rerender, unmount } = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    });

    expect(document.body.style.overflow).toBe("hidden");

    rerender({ locked: false });
    expect(document.body.style.overflow).toBe("scroll");

    rerender({ locked: true });
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("잠그지 않은 채 마운트되면 다른 곳의 잠금을 건드리지 않는다", () => {
    document.body.style.overflow = "hidden";
    const { unmount } = renderHook(() => useBodyScrollLock(false));

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("겹쳐 잠가도 나중 것이 먼저 풀리면 앞의 잠금이 유지된다", () => {
    const outer = renderHook(() => useBodyScrollLock(true));
    const inner = renderHook(() => useBodyScrollLock(true));

    inner.unmount();
    expect(document.body.style.overflow).toBe("hidden");
    outer.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
