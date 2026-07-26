import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/features/seo/structured-data/json-ld";

describe("serializeJsonLd", () => {
  it("serializes structured data while escaping HTML tag openers", () => {
    const serialized = serializeJsonLd({
      "@context": "https://schema.org",
      description: "</script><script>alert('xss')</script>",
    });

    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("preserves arrays and nested schema values", () => {
    const serialized = serializeJsonLd({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
        },
      ],
    });

    expect(JSON.parse(serialized)).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [{ position: 1, name: "홈" }],
    });
  });
});
