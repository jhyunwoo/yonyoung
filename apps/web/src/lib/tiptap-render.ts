import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

export function renderTiptapJsonToHtml(contentJson: unknown): string {
  if (!contentJson || typeof contentJson !== "object") {
    return "";
  }

  try {
    return generateHTML(contentJson as Parameters<typeof generateHTML>[0], [StarterKit]);
  } catch {
    return "";
  }
}
