import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import type { Block } from '../../lib/editorial';

type Props = {
  blocks: Block[];
  disabled?: boolean;
  onChange: (blocks: Block[]) => void;
};

function textContent(node: any): string {
  if (!node?.content) return '';

  return node.content
    .map((child: any) => child.text ?? textContent(child))
    .join('');
}

function blocksToContent(blocks: Block[]) {
  return {
    type: 'doc',
    content: blocks.map((block) => {
      if (block.type === 'heading') {
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: block.text
            ? [{ type: 'text', text: block.text }]
            : [],
        };
      }

      if (block.type === 'quote') {
        return {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: block.text
                ? [{ type: 'text', text: block.text }]
                : [],
            },
          ],
        };
      }

      if (block.type === 'list') {
        const items = block.text
          .split('\n')
          .filter(Boolean)
          .map((text) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text }],
              },
            ],
          }));

        return {
          type: 'bulletList',
          content: items.length
            ? items
            : [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph' }],
                },
              ],
        };
      }

      if (block.type === 'link') {
        return {
          type: 'paragraph',
          content: block.text
            ? [
                {
                  type: 'text',
                  text: block.text,
                  marks: block.url
                    ? [
                        {
                          type: 'link',
                          attrs: {
                            href: block.url,
                            target: '_blank',
                            rel: 'noopener noreferrer nofollow',
                          },
                        },
                      ]
                    : [],
                },
              ]
            : [],
        };
      }

      if (block.type === 'image') {
        return {
          type: 'image',
          attrs: {
            src: block.url ?? '',
            alt: block.alt ?? '',
            title: block.caption || null,
          },
        };
      }

      return {
        type: 'paragraph',
        content: block.text
          ? [{ type: 'text', text: block.text }]
          : [],
      };
    }),
  };
}

function contentToBlocks(doc: any): Block[] {
  const blocks: Block[] = [];

  for (const node of doc.content ?? []) {
    if (node.type === 'heading') {
      blocks.push({
        type: 'heading',
        text: textContent(node),
      });

      continue;
    }

    if (node.type === 'blockquote') {
      blocks.push({
        type: 'quote',
        text:
          node.content
            ?.map((paragraph: any) => textContent(paragraph))
            .join('\n') ?? '',
      });

      continue;
    }

    if (
      node.type === 'bulletList' ||
      node.type === 'orderedList'
    ) {
      blocks.push({
        type: 'list',
        text:
          node.content
            ?.map((item: any) => textContent(item))
            .join('\n') ?? '',
      });

      continue;
    }

    if (node.type === 'image') {
      blocks.push({
        type: 'image',
        text: '',
        url: node.attrs?.src ?? '',
        alt: node.attrs?.alt ?? '',
        caption: node.attrs?.title ?? '',
      });

      continue;
    }

    const text = textContent(node);

    const linked = node.content?.find((child: any) =>
      child.marks?.some(
        (mark: any) => mark.type === 'link',
      ),
    );

    if (linked) {
      const link = linked.marks.find(
        (mark: any) => mark.type === 'link',
      );

      blocks.push({
        type: 'link',
        text,
        url: link?.attrs?.href ?? '',
      });
    } else {
      blocks.push({
        type: 'paragraph',
        text,
      });
    }
  }

  return blocks.length
    ? blocks
    : [{ type: 'paragraph', text: '' }];
}

function normalizeBlocks(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (block.type === 'image') {
      return {
        type: 'image',
        text: '',
        url: block.url ?? '',
        alt: block.alt ?? '',
        caption: block.caption ?? '',
      };
    }

    if (block.type === 'link') {
      return {
        type: 'link',
        text: block.text ?? '',
        url: block.url ?? '',
      };
    }

    return {
      type: block.type,
      text: block.text ?? '',
    } as Block;
  });
}

function sameBlocks(a: Block[], b: Block[]) {
  return (
    JSON.stringify(normalizeBlocks(a)) ===
    JSON.stringify(normalizeBlocks(b))
  );
}

export default function RichArticleEditor({
  blocks,
  disabled = false,
  onChange,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  /*
   * Prevent programmatic content synchronization from being
   * mistaken for a user edit.
   */
  const syncingRef = useRef(false);

  /*
   * Keep the latest parent blocks available to Tiptap's
   * update callback without rebuilding the editor.
   */
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,

      Link.configure({
        openOnClick: false,
      }),

      Image.configure({
        inline: false,
        allowBase64: false,
      }),

      Placeholder.configure({
        placeholder: 'Start writing your article...',
      }),
    ],

    content: blocksToContent(blocks),
    editable: !disabled,
    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      if (syncingRef.current) {
        return;
      }

      const nextBlocks = contentToBlocks(
        editor.getJSON(),
      );

      /*
       * Tiptap can emit updates that do not represent an
       * actual article change. Ignore those updates so the
       * saved draft stays clean and Publish remains enabled.
       */
      if (
        sameBlocks(
          nextBlocks,
          blocksRef.current,
        )
      ) {
        return;
      }

      onChange(nextBlocks);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  /*
   * Synchronize Tiptap whenever the parent supplies a new
   * saved revision.
   *
   * setContent(..., false) explicitly prevents Tiptap from
   * emitting an update event for this programmatic change.
   */
  useEffect(() => {
    if (!editor) return;

    const editorBlocks = contentToBlocks(
      editor.getJSON(),
    );

    if (sameBlocks(editorBlocks, blocks)) {
      return;
    }

    syncingRef.current = true;

    editor.commands.setContent(
  blocksToContent(blocks),
  {
    emitUpdate: false,
  },
);

    syncingRef.current = false;
  }, [editor, blocks]);

  if (!editor) return null;

  const addLink = () => {
    const previous =
      editor.getAttributes('link').href ?? '';

    const url = window.prompt(
      'Link URL',
      previous,
    );

    if (url === null) return;

    if (!url.trim()) {
      editor
        .chain()
        .focus()
        .unsetLink()
        .run();

      return;
    }

    const cleanUrl = url.trim();

    if (!cleanUrl.startsWith('https://')) {
      window.alert(
        'PhoneFuturist links must use HTTPS.',
      );

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: cleanUrl,
      })
      .run();
  };

  const addImage = () => {
    const url = window.prompt(
      'Image URL (HTTPS)',
    );

    if (url === null) return;

    const cleanUrl = url.trim();

    if (!cleanUrl.startsWith('https://')) {
      window.alert(
        'PhoneFuturist images must use an HTTPS URL.',
      );

      return;
    }

    const alt = window.prompt(
      'Alt text: briefly describe the image for accessibility.',
      '',
    );

    if (alt === null) return;

    const caption = window.prompt(
      'Caption (optional)',
      '',
    );

    if (caption === null) return;

    editor
      .chain()
      .focus()
      .setImage({
        src: cleanUrl,
        alt: alt.trim(),
        title: caption.trim() || undefined,
      })
      .run();
  };

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    if (!allowedTypes.includes(file.type)) {
      window.alert(
        'Use a JPEG, PNG, WebP, or AVIF image.',
      );

      return;
    }

    if (file.size === 0) {
      window.alert(
        'The selected image is empty.',
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert(
        'Images must be 10 MB or smaller.',
      );

      return;
    }

    const alt = window.prompt(
      'Alt text: briefly describe the image for accessibility.',
      '',
    );

    if (alt === null) return;

    const caption = window.prompt(
      'Caption (optional)',
      '',
    );

    if (caption === null) return;

    setUploadingImage(true);

    try {
      const form = new FormData();

      form.append('file', file);

      const response = await fetch(
        '/studio/media',
        {
          method: 'POST',
          body: form,
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'Image upload failed.',
        );
      }

      if (!result?.url) {
        throw new Error(
          'The upload completed but no image URL was returned.',
        );
      }

      editor
        .chain()
        .focus()
        .setImage({
          src: result.url,
          alt: alt.trim(),
          title:
            caption.trim() || undefined,
        })
        .run();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Image upload failed. Please try again.',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
          disabled={disabled}
        >
          Bold
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          disabled={disabled}
        >
          Italic
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setParagraph()
              .run()
          }
          disabled={disabled}
        >
          Paragraph
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 2,
              })
              .run()
          }
          disabled={disabled}
        >
          H2
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 3,
              })
              .run()
          }
          disabled={disabled}
        >
          H3
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
          disabled={disabled}
        >
          Bullets
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
          disabled={disabled}
        >
          Numbered
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
          disabled={disabled}
        >
          Quote
        </button>

        <button
          type="button"
          onClick={addLink}
          disabled={disabled}
        >
          Link
        </button>

        <button
          type="button"
          onClick={() =>
            imageInputRef.current?.click()
          }
          disabled={
            disabled || uploadingImage
          }
        >
          {uploadingImage
            ? 'Uploading...'
            : 'Upload image'}
        </button>

        <button
          type="button"
          onClick={addImage}
          disabled={
            disabled || uploadingImage
          }
        >
          Image URL
        </button>

        <input
          ref={imageInputRef}
          className="rich-editor-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={uploadImage}
          hidden
        />

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .undo()
              .run()
          }
          disabled={
            disabled ||
            !editor.can().undo()
          }
        >
          Undo
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .redo()
              .run()
          }
          disabled={
            disabled ||
            !editor.can().redo()
          }
        >
          Redo
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}