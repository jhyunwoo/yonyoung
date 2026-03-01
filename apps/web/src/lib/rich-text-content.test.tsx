import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichTextContent } from "./rich-text-content";

describe("RichTextContent", () => {
  it("기본 클래스와 HTML을 렌더링한다", () => {
    const markup = renderToStaticMarkup(<RichTextContent html="<p>안녕하세요</p>" />);

    expect(markup).toContain("text-sm");
    expect(markup).toContain("dark:text-slate-200");
    expect(markup).toContain("dark:[&amp;_h2]:text-slate-100");
    expect(markup).toContain("<p>안녕하세요</p>");
  });

  it("추가 className을 병합한다", () => {
    const markup = renderToStaticMarkup(
      <RichTextContent html="<p>내용</p>" className="custom-class" />,
    );

    expect(markup).toContain("custom-class");
    expect(markup).toContain("text-sm");
  });
});
