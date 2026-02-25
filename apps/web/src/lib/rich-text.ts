const RICH_TEXT_TAG_PATTERN = /<[^>]*>/g;
const NON_BREAKING_SPACE_PATTERN = /(?:\u00a0|&nbsp;|&#160;)/gi;
const MULTI_WHITESPACE_PATTERN = /\s+/g;

const stripRichTextHtml = (html: string): string => {
  return html
    .replace(NON_BREAKING_SPACE_PATTERN, " ")
    .replace(RICH_TEXT_TAG_PATTERN, " ")
    .replace(MULTI_WHITESPACE_PATTERN, " ")
    .trim();
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
