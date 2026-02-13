import { describe, expect, it } from "vitest";
import { unwrapData } from "../api-result";

describe("api-result", () => {
  it("returns data from success envelope", async () => {
    const response = {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 1 } })
    } as Response;

    const data = await unwrapData<{ id: number }>(response as never);
    expect(data.id).toBe(1);
  });

  it("throws message from error envelope", async () => {
    const response = {
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Unauthorized" } })
    } as Response;

    await expect(unwrapData(response as never)).rejects.toThrow("Unauthorized");
  });
});
