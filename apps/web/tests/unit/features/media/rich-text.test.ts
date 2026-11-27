import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
  summarizeRichTextHtml,
} from "@/features/media/rich-text/rich-text";

// 문자열 포함 여부가 아니라 브라우저가 실제로 해석하는 속성 목록으로 검증한다.
const readAnchorAttributeNames = (html: string): string[][] =>
  [...new JSDOM(html).window.document.querySelectorAll("a")].map((anchor) =>
    anchor.getAttributeNames().sort(),
  );

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

  it("decodes html entities once so summaries read as plain text", () => {
    const html =
      "<p>월간 연영회 &lt;9월 호&gt;이 발행! &#x27;쉼&#39; &quot;컷&quot; A&amp;B &amp;lt;</p>";
    expect(summarizeRichTextHtml(html, 200)).toBe(
      "월간 연영회 <9월 호>이 발행! '쉼' \"컷\" A&B &lt;",
    );
  });

  it("decodes common named punctuation the way browsers render it", () => {
    expect(
      summarizeRichTextHtml(
        "<p>첫 전시 &mdash; 다시 &ldquo;시작&rdquo;&hellip; &#8212;</p>",
      ),
    ).toBe("첫 전시 \u2014 다시 \u201c시작\u201d\u2026 \u2014");
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

  it("does not let a rel= inside the href value break out of the attribute", () => {
    const sanitized = sanitizeRichTextHtml(
      `<p><a href="https://example.com/?rel='x' onmouseover=alert(document.domain)//">link</a></p>`,
    );

    expect(readAnchorAttributeNames(sanitized)).toEqual([["href", "rel"]]);
    expect(sanitized).toContain(
      `href="https://example.com/?rel='x' onmouseover=alert(document.domain)//"`,
    );
  });

  it("escapes double quotes carried in a single-quoted href", () => {
    const sanitized = sanitizeRichTextHtml(
      `<p><a href='https://example.com/" onmouseover=alert(1) x="'>link</a></p>`,
    );

    expect(readAnchorAttributeNames(sanitized)).toEqual([["href", "rel"]]);
  });

  it("adds rel to every link, including an href that contains an unquoted rel=", () => {
    const sanitized = sanitizeRichTextHtml(
      '<a href="https://example.com/?rel=1">a</a><a href="https://example.com/" rel="opener">b</a>',
    );

    expect(sanitized).toBe(
      '<a href="https://example.com/?rel=1" rel="noopener noreferrer nofollow">a</a>' +
        '<a href="https://example.com/" rel="noopener noreferrer nofollow">b</a>',
    );
  });
});
