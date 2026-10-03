import { describe, expect, it } from "vitest";
import { toFreshPublicReadPath } from "@/server/http/fresh-public-read";

describe("toFreshPublicReadPath", () => {
  it("쿼리가 없으면 ?fresh=1, 있으면 &fresh=1을 붙인다", () => {
    expect(toFreshPublicReadPath("/api/public/activities")).toBe(
      "/api/public/activities?fresh=1",
    );
    expect(toFreshPublicReadPath("/api/public/attachments?scope=site_donate")).toBe(
      "/api/public/attachments?scope=site_donate&fresh=1",
    );
  });
});
