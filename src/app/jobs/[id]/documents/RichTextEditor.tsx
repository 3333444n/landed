"use client";

import { useEffect, useState } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { normalizeSegments } from "@/modules/documents/formatting";
import type { TextSegment } from "@/modules/documents/contracts";
import styles from "./documents.module.css";

/** Only the three supported marks cross the editor boundary; HTML is never saved. */
function editorContent(segments: TextSegment[]): JSONContent {
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }];
  for (const segment of segments) {
    const lines = segment.text.split("\n");
    lines.forEach((text, index) => {
      if (index) paragraphs.push({ type: "paragraph", content: [] });
      if (text)
        paragraphs
          .at(-1)!
          .content!.push({ type: "text", text, marks: segment.marks.map((type) => ({ type })) });
    });
  }
  return { type: "doc", content: paragraphs };
}

function editorSegments(editor: Editor): TextSegment[] {
  const segments: TextSegment[] = [];
  editor.state.doc.forEach((paragraph, _offset, index) => {
    if (index) segments.push({ text: "\n", marks: [] });
    paragraph.descendants((node) => {
      if (node.isText)
        segments.push({
          text: node.text ?? "",
          marks: node.marks.flatMap(({ type }) =>
            type.name === "bold" || type.name === "italic" || type.name === "underline"
              ? [type.name]
              : [],
          ),
        });
      if (node.type.name === "hardBreak") segments.push({ text: "\n", marks: [] });
    });
  });
  return normalizeSegments(segments);
}

export function RichTextEditor({
  label,
  initialSegments,
  disabled = false,
  className = "",
}: {
  label: string;
  initialSegments: TextSegment[];
  disabled?: boolean;
  className?: string;
}) {
  const [segments, setSegments] = useState(() => normalizeSegments(initialSegments));
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: false,
    enableInputRules: false,
    enablePasteRules: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        link: false,
        trailingNode: false,
      }),
    ],
    content: editorContent(initialSegments),
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": `Text of ${label}`,
        "aria-multiline": "true",
        class: styles.richInput ?? "",
      },
    },
    onUpdate: ({ editor }) => setSegments(editorSegments(editor)),
  });
  useEffect(() => {
    if (!editor) return;
    // Tiptap's autofocus defers selection to an animation frame, which can overwrite
    // the user's first selection/deletion. EditorContent has mounted before this effect.
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.view.focus();
  }, [editor]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  return (
    <div className={`${styles.richEditor} ${className}`}>
      <input type="hidden" name="text" value={segments.map((segment) => segment.text).join("")} />
      <input type="hidden" name="segments" value={JSON.stringify(segments)} />
      {editor ? (
        <>
          <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }}>
            <div className={styles.floatingFormat}>
              <FormattingControls editor={editor} disabled={disabled} />
            </div>
          </BubbleMenu>
        </>
      ) : null}
      <EditorContent editor={editor} />
      <p className={styles.formatHint}>
        Select text to format. Use ⌘/Ctrl+B, I or U. Clear formatting keeps the field’s default
        style.
      </p>
    </div>
  );
}

function FormattingControls({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
    }),
  });
  return (
    <div className={styles.formatControls} role="group" aria-label="Selection formatting">
      {(["bold", "italic", "underline"] as const).map((mark) => (
        <button
          key={mark}
          type="button"
          disabled={disabled}
          aria-pressed={active[mark]}
          aria-label={mark.charAt(0).toUpperCase() + mark.slice(1)}
          title={mark.charAt(0).toUpperCase() + mark.slice(1)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleMark(mark).run()}
        >
          {mark === "bold" ? <strong>B</strong> : mark === "italic" ? <em>I</em> : <u>U</u>}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
      >
        Clear formatting
      </button>
    </div>
  );
}
