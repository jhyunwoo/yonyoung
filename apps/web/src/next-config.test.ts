import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("nextConfig", () => {
  it("캐시 컴포넌트를 활성화한다", () => {
    expect(nextConfig.cacheComponents).toBe(true);
  });
});
