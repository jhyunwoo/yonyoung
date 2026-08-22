"use client";

import { useEffect, useState } from "react";

import { Button } from "@/app/(dashboard)/_components/ui/button";
import { Dialog } from "@/app/(dashboard)/_components/ui/dialog";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Input } from "@/app/(dashboard)/_components/ui/input";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

export const EMPTY_RICH_TEXT_HTML = "<p></p>";

const ToolbarButton = ({
  label,
  onClick,
  active = false,
  disabled = false,
}: ToolbarButtonProps) => {
  return (
    <button
      type="button"
      data-testid="rich-text-toolbar-button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 text-xs font-semibold transition ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-hairline-strong bg-surface text-ink-secondary hover:bg-canvas-soft"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );
};

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  minHeight = 220,
}: RichTextEditorProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value.length > 0 ? value : EMPTY_RICH_TEXT_HTML,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = value.length > 0 ? value : EMPTY_RICH_TEXT_HTML;
    if (editor.getHTML() === nextContent) {
      return;
    }

    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const openLinkDialog = () => {
    if (!editor || disabled) {
      return;
    }

    const previousLink = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(previousLink ?? "https://");
    setIsLinkDialogOpen(true);
  };

  const applyLink = () => {
    setIsLinkDialogOpen(false);
    if (!editor) {
      return;
    }

    const trimmedLink = linkDraft.trim();
    if (trimmedLink.length === 0) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmedLink }).run();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-hairline bg-surface-sunken p-2">
        <ToolbarButton
          label="H2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="H3"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive("heading", { level: 3 })}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="굵게"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="기울임"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="밑줄"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive("underline")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="글머리"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="번호"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="인용"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="코드블록"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive("codeBlock")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="링크"
          onClick={openLinkDialog}
          active={editor?.isActive("link")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="표 추가"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="행 추가"
          onClick={() => editor?.chain().focus().addRowAfter().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
        <ToolbarButton
          label="열 추가"
          onClick={() => editor?.chain().focus().addColumnAfter().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
        <ToolbarButton
          label="표 삭제"
          onClick={() => editor?.chain().focus().deleteTable().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
      </div>

      {/* 열을 여러 개 추가한 표는 좁은 화면에서 편집 영역보다 넓어진다.
          페이지 전체가 밀리지 않도록 편집 영역 안에서만 가로 스크롤시킨다. */}
      <div
        className="overflow-x-auto rounded-lg border border-hairline-strong bg-surface px-3 py-2"
        style={{ minHeight }}
      >
        <EditorContent
          editor={editor}
          className="prose-editor text-sm text-ink outline-none [&_.ProseMirror]:wrap-anywhere [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-hairline-strong [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:bg-canvas-soft [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:text-ink [&_.ProseMirror_a]:text-primary-text [&_.ProseMirror_a]:underline [&_.ProseMirror_table]:my-2 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-hairline-strong [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-hairline-strong [&_.ProseMirror_th]:bg-surface-sunken [&_.ProseMirror_th]:p-2"
          style={{ minHeight }}
        />
      </div>

      {/* window.prompt 를 대체한다. 기본 prompt 는 스타일도 포커스 동작도
          제어할 수 없고, 주소를 지워서 링크를 해제하는 방법을 알려줄 자리가 없었다. */}
      <Dialog
        open={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        title="링크 주소"
        description="주소를 비우고 저장하면 링크가 해제됩니다."
        size="sm"
        testId="rich-text-link-dialog"
        footer={
          <>
            <Button
              data-testid="rich-text-link-cancel"
              variant="secondary"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              data-testid="rich-text-link-apply"
              variant="primary"
              onClick={applyLink}
            >
              적용
            </Button>
          </>
        }
      >
        <Field label="링크 주소">
          {(control) => (
            <Input
              {...control}
              type="url"
              inputMode="url"
              value={linkDraft}
              placeholder="https://example.com"
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
              }}
            />
          )}
        </Field>
      </Dialog>
    </div>
  );
}
