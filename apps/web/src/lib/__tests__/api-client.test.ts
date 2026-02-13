import { describe, expect, it } from "vitest";
import { createBrowserApiClient, createServerApiClient } from "../api-client";

describe("api-client", () => {
  it("normalizes trailing slash for server base url", () => {
    const client = createServerApiClient("http://127.0.0.1:8787/");
    const url = client.v1.public.hero.$url();
    expect(url.href).toBe("http://127.0.0.1:8787/v1/public/hero");
  });

  it("builds proxy path client for browser", () => {
    const client = createBrowserApiClient("http://localhost/api/proxy/");
    const url = client.v1.public.activities.$url();
    expect(url.href).toBe("http://localhost/api/proxy/v1/public/activities");
  });
});
