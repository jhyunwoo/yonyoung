import { describe, expect, it } from "vitest";

import { apiVisitorInsightsSchema } from "@yonyoung/contracts/schemas";
import { apiUpdateSiteSettingsInputSchema } from "@yonyoung/contracts/site-settings";

describe("shared/contracts/api-schemas", () => {
  it("accepts donateAccountNumber with digits and dashes up to 50 chars", () => {
    const validAccountNumber = `${"1234-".repeat(9)}12345`; // length 50

    const parsed = apiUpdateSiteSettingsInputSchema.parse({
      donateAccountNumber: validAccountNumber,
    });

    expect(parsed.donateAccountNumber).toBe(validAccountNumber);
  });

  it("rejects donateAccountNumber longer than 50 chars", () => {
    const tooLongAccountNumber = `${"1234-".repeat(10)}1`; // length 51

    const parsed = apiUpdateSiteSettingsInputSchema.safeParse({
      donateAccountNumber: tooLongAccountNumber,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects donateAccountNumber containing characters other than digits and dash", () => {
    const parsed = apiUpdateSiteSettingsInputSchema.safeParse({
      donateAccountNumber: "123-45A-678",
    });

    expect(parsed.success).toBe(false);
  });

  it("방문자 인사이트 스키마는 코호트의 null 칸과 이탈 노드를 받는다", () => {
    const parsed = apiVisitorInsightsSchema.safeParse({
      range: {
        from: "2026-10-01",
        to: "2026-10-07",
        days: 7,
        granularity: "day",
      },
      previousRange: { from: "2026-09-24", to: "2026-09-30" },
      eventsTrackedSince: null,
      segmented: false,
      truncated: false,
      summary: {
        views: 0,
        visitors: 0,
        sessions: 0,
        pagesPerSession: 0,
        avgSessionMs: 0,
        bounceRate: 0,
        unmeasuredSessions: 0,
        newVisitors: 0,
        returningVisitors: 0,
        prev: {
          views: 0,
          visitors: 0,
          sessions: 0,
          pagesPerSession: 0,
          avgSessionMs: 0,
          bounceRate: 0,
        },
      },
      trend: [],
      hourly: [],
      referrerFlow: [],
      pathFlow: [{ step: 1, from: "home", to: "exit", sessions: 1 }],
      content: [],
      devices: [],
      audience: { member: 0, external: 0 },
      depth: [],
      duration: [],
      cohorts: [{ week: "2026-09-28", size: 1, retention: [1, null] }],
      referrerOptions: [],
    });
    expect(parsed.success).toBe(true);
  });
});
