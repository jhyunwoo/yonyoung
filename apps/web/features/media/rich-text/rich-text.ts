import filterXss, { type IFilterXSSOptions } from "xss";

/** 에디터가 비어 있을 때 내보내는 HTML. */
export const EMPTY_RICH_TEXT_HTML = "<p></p>";

const RICH_TEXT_TAG_PATTERN = /<[^>]*>/g;
const NON_BREAKING_SPACE_PATTERN = /(?:\u00a0|&nbsp;|&#160;)/gi;
const MULTI_WHITESPACE_PATTERN = /\s+/g;
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;
const ALLOWED_ATTRS = {
  a: ["href", "target", "rel"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
} as const;
const ALLOWED_LINK_PREFIXES = ["http://", "https://", "mailto:"] as const;

const trim = (value: string): string => value.trim();

const normalizeWhitespace = (value: string): string => {
  return value
    .replace(NON_BREAKING_SPACE_PATTERN, " ")
    .replace(MULTI_WHITESPACE_PATTERN, " ")
    .trim();
};

const isAllowedLink = (value: string): boolean => {
  const normalized = trim(value).toLowerCase();
  return ALLOWED_LINK_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const readPositiveNumberAttribute = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return String(parsed);
};

const SANITIZE_OPTIONS: IFilterXSSOptions = {
  whiteList: Object.fromEntries(
    ALLOWED_TAGS.map((tag) => [
      tag,
      [...(ALLOWED_ATTRS[tag as keyof typeof ALLOWED_ATTRS] ?? [])],
    ]),
  ),
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
  css: false,
  safeAttrValue(tag, name, value) {
    if (tag === "a" && name === "href") {
      return isAllowedLink(value) ? trim(value) : "";
    }

    if (tag === "a" && name === "target") {
      return value === "_blank" ? "_blank" : "";
    }

    if (tag === "a" && name === "rel") {
      return "noopener noreferrer nofollow";
    }

    if ((tag === "th" || tag === "td") && (name === "colspan" || name === "rowspan")) {
      return readPositiveNumberAttribute(value);
    }

    return "";
  },
};

const ensureSafeLinkRel = (html: string): string => {
  return html.replace(/<a\b([^>]*?)>/gi, (fullMatch, attributes: string) => {
    if (!/\bhref\s*=/i.test(attributes)) {
      return fullMatch;
    }

    if (/\brel\s*=/i.test(attributes)) {
      return fullMatch.replace(
        /\brel\s*=\s*(['"]).*?\1/i,
        'rel="noopener noreferrer nofollow"',
      );
    }

    return `<a${attributes} rel="noopener noreferrer nofollow">`;
  });
};

export const sanitizeRichTextHtml = (html: string): string => {
  return ensureSafeLinkRel(filterXss(html, SANITIZE_OPTIONS));
};

const HTML_ENTITY_PATTERN = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi;
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// 한 번만 훑으므로 &amp;lt; 는 &lt; 로 남는다(이중 디코딩하지 않는다).
const decodeHtmlEntities = (text: string): string => {
  return text.replace(
    HTML_ENTITY_PATTERN,
    (entity, decimal?: string, hex?: string, name?: string) => {
      if (name) {
        return NAMED_HTML_ENTITIES[name.toLowerCase()] ?? entity;
      }

      const codePoint = Number.parseInt(decimal ?? hex ?? "", decimal ? 10 : 16);
      return codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
};

// 결과는 HTML이 아닌 일반 텍스트다. 메타 태그·React 텍스트처럼 다시 이스케이프되는 곳에만 쓴다.
const stripRichTextHtml = (html: string): string => {
  return normalizeWhitespace(
    decodeHtmlEntities(sanitizeRichTextHtml(html).replace(RICH_TEXT_TAG_PATTERN, " ")),
  );
};

export const hasMeaningfulRichTextHtml = (html: string): boolean => {
  return stripRichTextHtml(html).length > 0;
};

export const summarizeRichTextHtml = (html: string, maxLength = 120): string => {
  const text = stripRichTextHtml(html);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};
