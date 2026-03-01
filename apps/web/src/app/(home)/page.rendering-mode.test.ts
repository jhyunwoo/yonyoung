import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Home route viewport", () => {
  it("레이아웃에 정적 viewport 메타를 명시한다", async () => {
    const layoutPath = resolve(process.cwd(), "src/app/(home)/layout.tsx");
    const layoutSource = await readFile(layoutPath, "utf8");

    expect(layoutSource).toContain("export const viewport: Viewport = {");
    expect(layoutSource).toContain('width: "device-width"');
    expect(layoutSource).toContain("initialScale: 1");
  });
});
