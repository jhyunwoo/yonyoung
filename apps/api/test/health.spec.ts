import { describe, expect, it } from "vitest";
import app from "../src";

describe("health endpoint", () => {
  it("responds with ok payload", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { status: string } };
    expect(json.data.status).toBe("ok");
  });
});
