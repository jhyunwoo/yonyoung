import { describe, expect, it } from "vitest";

import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
  summarizeRichTextHtml,
} from "@/features/media/rich-text/rich-text";

describe("features/media/rich-text", () => {
  it("detects meaningful html content", () => {
    expect(hasMeaningfulRichTextHtml("<p>Hello</p>")).toBe(true);
    expect(hasMeaningfulRichTextHtml("<p>&nbsp;</p><div> </div>")).toBe(false);
  });

  it("summarizes stripped rich text", () => {
    const html = "<p>Hello&nbsp;World</p><p>Second line</p>";
    expect(summarizeRichTextHtml(html, 5)).toBe("Hello...");
    expect(summarizeRichTextHtml(html, 100)).toBe("Hello World Second line");
  });

  it("sanitizes dangerous tags, attributes, and javascript links", () => {
    const sanitized = sanitizeRichTextHtml(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">bad</a>',
    );

    expect(sanitized).toContain("<p>Hello</p>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick=");
    expect(sanitized).not.toContain("javascript:alert");
  });

  it("keeps safe link protocols and normalizes external link attributes", () => {
    const sanitized = sanitizeRichTextHtml(
      '<a href=" HTTPS://example.com/path " target="_blank">site</a><a href="mailto:test@example.com" target="_self" rel="custom">mail</a><a>plain</a>',
    );

    expect(sanitized).toContain('href="HTTPS://example.com/path"');
    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer nofollow"');
    expect(sanitized).toContain('href="mailto:test@example.com"');
    expect(sanitized).not.toContain('target="_self"');
    expect(sanitized).toContain("<a>plain</a>");
  });

  it("allows only positive table span attributes", () => {
    const sanitized = sanitizeRichTextHtml(
      '<table><tbody><tr><td colspan="2" rowspan="0">cell</td><th colspan="abc" rowspan="3">head</th></tr></tbody></table>',
    );

    expect(sanitized).toContain('colspan="2"');
    expect(sanitized).toContain('rowspan="3"');
    expect(sanitized).not.toContain('rowspan="0"');
    expect(sanitized).not.toContain('colspan="abc"');
  });
});
