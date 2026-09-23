import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { captureException } from "@sentry/nextjs";
import HomeErrorPage from "../../app/(home)/error";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("Sentry error boundary", () => {
  it("reports the original error and retains the retry action", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(),
    });
    const error = new Error("render failure");
    const reset = vi.fn();
    render(<HomeErrorPage error={error} reset={reset} />);
    expect(captureException).toHaveBeenCalledWith(error);
    screen.getByTestId("home-error-reset").click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
