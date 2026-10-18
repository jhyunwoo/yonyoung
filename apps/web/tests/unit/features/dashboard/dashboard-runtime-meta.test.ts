import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const { execFileMock, readFileMock, statMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(
    (
      _file: string,
      _args: string[],
      callback: (error: Error | null, result?: { stdout: string }) => void,
    ) => {
      callback(null, { stdout: "2026-01-02T03:04:05Z\n" });
    },
  ),
  readFileMock: vi.fn(async () => JSON.stringify({ version: "1.2.3" })),
  statMock: vi.fn(async () => ({ mtimeMs: 1 })),
}));

vi.mock("node:child_process", () => ({ execFile: execFileMock }));
vi.mock("node:fs/promises", () => ({ readFile: readFileMock, stat: statMock }));

import { readDashboardRuntimeMeta } from "@/features/dashboard/system/dashboard-runtime-meta";

describe("readDashboardRuntimeMeta", () => {
  it("web과 워크스페이스의 apps/api 디렉터리 기준 커밋 시각을 한 번만 읽는다", async () => {
    const first = await readDashboardRuntimeMeta();
    const second = await readDashboardRuntimeMeta();

    expect(second).toBe(first);
    expect(first).toEqual({
      web: { version: "1.2.3", updatedAt: Date.parse("2026-01-02T03:04:05Z") },
      api: { version: "1.2.3", updatedAt: Date.parse("2026-01-02T03:04:05Z") },
    });
    expect(execFileMock).toHaveBeenCalledTimes(2);
    expect(execFileMock.mock.calls.map(([, args]) => args)).toEqual([
      ["-C", process.cwd(), "log", "-1", "--format=%cI", "--", "."],
      [
        "-C",
        path.resolve(process.cwd(), "../api"),
        "log",
        "-1",
        "--format=%cI",
        "--",
        ".",
      ],
    ]);
  });
});
