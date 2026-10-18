import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cacheLifeMock, cacheTagMock } = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
}));

import { fetchGenerationsFromServer } from "@/features/dashboard/generation/generation-fetcher";

const generation = (id: string, sortOrder: number) => ({
  id,
  name: `${sortOrder}기`,
  sortOrder,
  startDate: 1,
  endDate: 2,
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("features/dashboard/generation/generation-fetcher", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "http://127.0.0.1:4010";
    cacheLifeMock.mockClear();
    cacheTagMock.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns generation list from array response and caches it long", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([generation("gen-59", 59)]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGenerationsFromServer()).resolves.toEqual([
      generation("gen-59", 59),
    ]);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      "http://127.0.0.1:4010/api/public/generations?fresh=1",
    );
    expect(cacheTagMock).toHaveBeenCalledWith("admin:generations");
    expect(cacheLifeMock).toHaveBeenCalledTimes(1);
    expect(cacheLifeMock).toHaveBeenCalledWith("days");
  });

  it("returns generation list from data envelope response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ data: [generation("gen-58", 58)] })),
    );

    await expect(fetchGenerationsFromServer()).resolves.toEqual([
      generation("gen-58", 58),
    ]);
  });

  it("returns empty array with a short cache life on non-ok, invalid payload, or errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ hello: "world" })),
    );
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([generation("gen-59", 59), { id: "invalid" }])),
    );
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    expect(cacheLifeMock).toHaveBeenCalledTimes(4);
    expect(cacheLifeMock.mock.calls.every(([profile]) => profile === "minutes")).toBe(
      true,
    );
  });
});
