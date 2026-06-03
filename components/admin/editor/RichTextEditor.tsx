"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface Props {
    value: string;
    onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: Props) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        editorProps: {
            attributes: {
                class: "min-h-[300px] p-4 text-white focus:outline-none",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="border-b border-gray-700 p-2 flex gap-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className="px-2 py-1 text-sm bg-gray-700 rounded"
                >
                    B
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className="px-2 py-1 text-sm bg-gray-700 rounded"
                >
                    I
                </button>

                <button
                    type="button"
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    className="px-2 py-1 text-sm bg-gray-700 rounded"
                >
                    Lista
                </button>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}
