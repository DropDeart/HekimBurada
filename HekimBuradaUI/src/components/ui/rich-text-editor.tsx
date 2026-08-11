"use client";

import { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Bold, Italic, Link as LinkIcon, Palette, Unlink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * shadcn'de hazır bir zengin metin editörü yok — Tiptap üzerine minimal bir toolbar (kalın/italik/link)
 * ile kurulan bu bileşen onun yerini tutuyor. Admin panelde carousel slayt açıklaması gibi kısa,
 * biçimlendirilebilir metinler için kullanılıyor.
 */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, horizontalRule: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline text-brand" } }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextStyle,
      Color,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "min-h-[100px] px-3 py-2 text-sm outline-none [&_p]:mb-1.5 [&_p:last-child]:mb-0",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL'si", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) {
    return <div className={cn("h-[140px] rounded-lg border border-border bg-white", className)} />;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white",
        "[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        className
      )}
    >
      <div className="flex items-center gap-1 border-b border-border p-1">
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Kalın"
        >
          <Bold />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="İtalik"
        >
          <Italic />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("link") ? "secondary" : "ghost"}
          onClick={setLink}
          aria-label="Link ekle"
        >
          <LinkIcon />
        </Button>
        {editor.isActive("link") && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => editor.chain().focus().unsetLink().run()}
            aria-label="Linki kaldır"
          >
            <Unlink />
          </Button>
        )}
        <span className="mx-0.5 h-4 w-px bg-border" />
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => colorInputRef.current?.click()}
          aria-label="Metin rengi"
          style={{ color: (editor.getAttributes("textStyle").color as string | undefined) || undefined }}
        >
          <Palette />
        </Button>
        <input
          ref={colorInputRef}
          type="color"
          className="sr-only"
          value={(editor.getAttributes("textStyle").color as string | undefined) || "#000000"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        {editor.getAttributes("textStyle").color && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => editor.chain().focus().unsetColor().run()}
            aria-label="Metin rengini kaldır"
          >
            <X />
          </Button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
