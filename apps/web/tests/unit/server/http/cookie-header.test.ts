import { describe, expect, it, vi } from "vitest";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { readCookieHeader } from "@/server/http/cookie-header";

describe("server/http/cookie-header", () => {
  it("reads cookie headers from next/headers", async () => {
    cookiesMock.mockResolvedValue({ toString: () => "mock_session=abc123" });

    await expect(readCookieHeader()).resolves.toBe("mock_session=abc123");
  });

  it("returns null when the request has no cookies", async () => {
    cookiesMock.mockResolvedValue({ toString: () => "" });

    await expect(readCookieHeader()).resolves.toBeNull();
  });
});
