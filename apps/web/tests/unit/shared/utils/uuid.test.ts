import { describe, expect, it } from "vitest";

import { isUuid } from "@/shared/utils/uuid";

describe("shared/utils/uuid", () => {
  it("accepts the UUIDs the API issues", () => {
    expect(isUuid("3f2b8c1e-7d4a-4f6b-9c2e-1a5d8e7f6b40")).toBe(true);
    expect(isUuid("3F2B8C1E-7D4A-4F6B-9C2E-1A5D8E7F6B40")).toBe(true);
  });

  it("rejects ids the API would answer with 400", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("3f2b8c1e-7d4a-4f6b-9c2e-1a5d8e7f6b40/extra")).toBe(false);
    expect(isUuid("3f2b8c1e7d4a4f6b9c2e1a5d8e7f6b40")).toBe(false);
  });
});
