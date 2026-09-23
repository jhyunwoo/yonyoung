import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { captureBrowserException } from "@/lib/observability/sentry-client";
import HomeErrorPage from "../../app/(home)/error";

vi.mock("@/lib/observability/sentry-client", () => ({
  captureBrowserException: vi.fn().mockResolvedValue(undefined),
}));

describe("Sentry error boundary", () => {
  it("reports the original error and retains the retry action", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(),
    });
    const error = new Error("render failure");
    const reset = vi.fn();
    render(<HomeErrorPage error={error} reset={reset} />);
    expect(captureBrowserException).toHaveBeenCalledWith(error);
    screen.getByTestId("home-error-reset").click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
