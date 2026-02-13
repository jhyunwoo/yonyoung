"use client";

import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import type { JSONContent } from "@tiptap/core";

interface RichTextEditorProps {
  content: JSONContent;
  onChange: (next: JSONContent) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none"
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    }
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content as JSONContent);
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="rounded border px-2 py-1 text-xs">
          Bold
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="rounded border px-2 py-1 text-xs">
          Italic
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="rounded border px-2 py-1 text-xs">
          Bullet
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="rounded border px-2 py-1 text-xs">
          Number
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
