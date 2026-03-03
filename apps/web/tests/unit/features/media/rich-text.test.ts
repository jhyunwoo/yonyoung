import { describe, expect, it } from "vitest";

import {
  hasMeaningfulRichTextHtml,
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
});
