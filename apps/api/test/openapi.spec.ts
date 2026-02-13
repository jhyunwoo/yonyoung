import { describe, expect, it } from "vitest";
import app from "../src";

describe("openapi docs", () => {
  it("serves openapi json", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    expect(json.openapi).toBe("3.1.0");
    expect(Object.keys(json.paths)).toContain("/v1/public/hero");
    expect(Object.keys(json.paths)).toContain("/v1/admin/activities");
  });

  it("serves swagger ui", async () => {
    const res = await app.request("/docs");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("SwaggerUIBundle");
  });
});
