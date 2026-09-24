import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { safeHttps, type Block } from '../../lib/editorial';
import { blocksToContent, contentToBlocks, sameBlocks } from '../../lib/rich-content';

const EditorialImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), ...Object.fromEntries(['credit','sourceName','sourceUrl','rightsNote','ownership'].map(key=>[key,{default:'',rendered:false}])) };
  },
});

type Props = {
  blocks: Block[];
  disabled?: boolean;
  onChange: (blocks: Block[]) => void;
  onUploadingChange?: (uploading:boolean) => void;
};

export default function RichArticleEditor({
  blocks,
  disabled = false,
  onChange,
  onUploadingChange,
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
      StarterKit.configure({ link: false, codeBlock: false, horizontalRule: false, underline: false, heading: { levels: [2, 3] } }),

      Link.configure({
        openOnClick: false,
      }),

      EditorialImage.configure({
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
    injectCSS: false,
    shouldRerenderOnTransaction: true,

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

    if (!safeHttps(cleanUrl)) {
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

    if (!safeHttps(cleanUrl)) {
      window.alert(
        'PhoneFuturist images must use an HTTPS URL.',
      );

      return;
    }

    editor
      .chain()
      .focus()
      .setImage({
        src: cleanUrl,
        alt: '',
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

    setUploadingImage(true);
    onUploadingChange?.(true);

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
          alt: '',
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
      onUploadingChange?.(false);
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
      {editor.isActive('image') && <fieldset disabled={disabled || uploadingImage} className="studio-fields">
        <legend>Selected image attribution</legend>
        {([
          ['alt','Alt text (accessibility)'], ['title','Caption'], ['credit','Image credit / photographer'],
          ['sourceName','Source name'], ['sourceUrl','Source URL (HTTPS)'], ['rightsNote','Rights / license note'],
        ] as const).map(([key,label])=><label key={key}>{label}<input value={editor.getAttributes('image')[key] ?? ''} maxLength={key==='sourceUrl'?2048:key==='alt'?1000:2000} onChange={e=>editor.commands.updateAttributes('image',{[key]:e.target.value})}/></label>)}
        <label>Ownership<select value={editor.getAttributes('image').ownership ?? ''} onChange={e=>editor.commands.updateAttributes('image',{ownership:e.target.value})}><option value="">Not designated</option><option value="external">External editorial image</option><option value="phonefuturist">PhoneFuturist-owned graphic or screenshot</option></select></label>
        <p>All image details are optional. Alt text helps accessibility; captions and credits appear beneath the image.</p>
      </fieldset>}
    </div>
  );
}
