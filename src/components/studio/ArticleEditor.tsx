import { useEffect, useState } from 'react';
import {
  emptyArticle,
  sections,
  type ArticlePayload,
  type StudioArticle,
} from '../../lib/editorial';
import './studio.css';
import RichArticleEditor from './RichArticleEditor';

type Props = {
  article: StudioArticle | null;
  roles: string[];
  userId: string;
};

export default function ArticleEditor({
  article: initial,
  roles,
  userId,
}: Props) {
  const [article, setArticle] = useState(initial);
  const [draft, setDraft] = useState<ArticlePayload>(
    () => initial?.payload ?? emptyArticle(),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');

  const admin = roles.includes('admin');
  const editor = admin || roles.includes('editor');
  const publisher =
    admin || roles.includes('publisher');

  const canEdit =
    editor ||
    ((!article || article.creator_id === userId) &&
      roles.includes('writer'));

  useEffect(() => {
    if (!dirty) return;

    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', warn);

    return () =>
      window.removeEventListener(
        'beforeunload',
        warn,
      );
  }, [dirty]);

  function change<K extends keyof ArticlePayload>(
    key: K,
    value: ArticlePayload[K],
  ) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));

    setDirty(true);
  }

  async function act(action: string) {
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch('/studio/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: article?.id,
          version: article?.version,
          action,
          payload: ['save', 'create'].includes(action)
            ? draft
            : { reason },
        }),
      });

      if (
        !response.headers
          .get('content-type')
          ?.includes('application/json')
      ) {
        throw new Error(
          'Your session may have expired. Sign in again in another tab before retrying; keep this draft open.',
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? 'The request failed.',
        );
      }

      if (action === 'create') {
        setDirty(false);

        window.location.assign(
          '/studio/articles/' + result.data.id,
        );

        return;
      }

      const refreshed = await fetch(
        '/studio/api?id=' + article!.id,
      );

      if (!refreshed.ok) {
        throw new Error(
          'The action completed, but refresh failed. Reload before making further changes.',
        );
      }

      const current = await refreshed.json();

      setArticle(current.data);
      setDraft(current.data.payload);
      setDirty(false);
      setReason('');

      setMessage(
        action === 'save'
          ? 'Draft saved as a new revision.'
          : action === 'publish' ||
              action === 'override_publish'
            ? 'Published. The canonical article is now available.'
            : 'Action recorded.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Connection failed. Keep this page open; your unsaved text is retained.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-workspace">
      <div className="studio-top">
        <div>
          <span className="studio-state">
            {article?.state.replaceAll('_', ' ') ??
              'New draft'}
            {dirty ? ' · unsaved changes' : ''}
          </span>

          <h1>
            {article
              ? 'Edit article'
              : 'Write an article'}
          </h1>
        </div>

        <a href="/studio">All articles</a>
      </div>

      {message && (
        <p
          className="studio-message"
          role="status"
        >
          {message}
        </p>
      )}

      <p className="studio-help">
        Sources are optional. Add them when they support
        the article. Keep confidential identities,
        unpublished research and internal context in
        Private notes.
      </p>

      <div className="studio-columns">
        <main className="studio-editor-column">
          <fieldset
            disabled={!canEdit || busy}
            className="studio-fields"
          >
            <legend>Article</legend>

            <label>
              Headline

              <input
                maxLength={180}
                value={draft.title}
                onChange={(e) =>
                  change('title', e.target.value)
                }
              />
            </label>

            <label>
              Summary

              <textarea
                maxLength={500}
                rows={3}
                value={draft.summary}
                onChange={(e) =>
                  change('summary', e.target.value)
                }
              />
            </label>

            <div className="studio-pair">
              <label>
                Section

                <select
                  value={draft.section}
                  onChange={(e) =>
                    change(
                      'section',
                      e.target
                        .value as ArticlePayload['section'],
                    )
                  }
                >
                  {sections.map((section) => (
                    <option key={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Public byline

                <input
                  maxLength={160}
                  value={draft.byline}
                  onChange={(e) =>
                    change('byline', e.target.value)
                  }
                />
              </label>
            </div>

            <label>
              URL slug

              <input
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={draft.slug}
                onChange={(e) =>
                  change('slug', e.target.value)
                }
              />
            </label>

            <small>
              Lowercase words separated by hyphens.
              After publication, headline and slug edits
              do not change the canonical URL.
            </small>

            <div className="studio-section-heading">
              <div>
                <h2>Article body</h2>
                <p>
                  Write and format the complete article.
                </p>
              </div>
            </div>

            <RichArticleEditor
              blocks={draft.blocks}
              disabled={!canEdit || busy}
              onChange={(blocks) => {
                if (
                  JSON.stringify(blocks) ===
                  JSON.stringify(draft.blocks)
                ) {
                  return;
                }

                change('blocks', blocks);
              }}
            />

            <div className="studio-section-heading">
              <div>
                <h2>Sources</h2>
                <p>
                  Optional. Add public references when
                  they are relevant to the article.
                </p>
              </div>

              <span className="studio-count">
                {draft.sources.length}/30
              </span>
            </div>

            {draft.sources.length === 0 && (
              <p className="studio-empty">
                No sources added. You can still save and
                publish this article.
              </p>
            )}

            {draft.sources.map((source, index) => (
              <section
                className="studio-block"
                key={index}
              >
                <div className="studio-block-header">
                  <strong>
                    Source {index + 1}
                  </strong>

                  <button
                    type="button"
                    className="studio-secondary-action"
                    onClick={() =>
                      change(
                        'sources',
                        draft.sources.filter(
                          (_, itemIndex) =>
                            index !== itemIndex,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>

                <label>
                  Label

                  <input
                    maxLength={200}
                    value={source.label}
                    onChange={(e) =>
                      change(
                        'sources',
                        draft.sources.map(
                          (value, itemIndex) =>
                            index === itemIndex
                              ? {
                                  ...value,
                                  label:
                                    e.target.value,
                                }
                              : value,
                        ),
                      )
                    }
                  />
                </label>

                <label>
                  Source URL

                  <input
                    type="url"
                    maxLength={2048}
                    placeholder="https://"
                    value={source.url}
                    onChange={(e) =>
                      change(
                        'sources',
                        draft.sources.map(
                          (value, itemIndex) =>
                            index === itemIndex
                              ? {
                                  ...value,
                                  url:
                                    e.target.value,
                                }
                              : value,
                        ),
                      )
                    }
                  />
                </label>

                <label>
                  What this supports

                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={source.note}
                    onChange={(e) =>
                      change(
                        'sources',
                        draft.sources.map(
                          (value, itemIndex) =>
                            index === itemIndex
                              ? {
                                  ...value,
                                  note:
                                    e.target.value,
                                }
                              : value,
                        ),
                      )
                    }
                  />
                </label>
              </section>
            ))}

            <button
              type="button"
              className="studio-add-source"
              disabled={draft.sources.length >= 30}
              onClick={() =>
                change('sources', [
                  ...draft.sources,
                  {
                    label: '',
                    url: '',
                    note: '',
                  },
                ])
              }
            >
              Add source
            </button>

            <div className="studio-section-heading">
              <div>
                <h2>Editorial notes</h2>
                <p>
                  Internal information and revision
                  context.
                </p>
              </div>
            </div>

            <label>
              Private notes

              <textarea
                rows={5}
                maxLength={12000}
                value={draft.privateNotes}
                onChange={(e) =>
                  change(
                    'privateNotes',
                    e.target.value,
                  )
                }
              />
            </label>

            <label>
              Change classification

              <select
                value={draft.changeKind}
                onChange={(e) =>
                  change(
                    'changeKind',
                    e.target
                      .value as ArticlePayload['changeKind'],
                  )
                }
              >
                {[
                  'initial',
                  'minor',
                  'update',
                  'correction',
                ].map((kind) => (
                  <option key={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Public correction/update note

              <textarea
                rows={4}
                maxLength={2000}
                value={draft.correctionNote}
                onChange={(e) =>
                  change(
                    'correctionNote',
                    e.target.value,
                  )
                }
              />
            </label>
          </fieldset>

          {canEdit && (
            <div className="studio-save-row">
              <button
                className="studio-save"
                disabled={busy}
                onClick={() =>
                  act(
                    article
                      ? 'save'
                      : 'create',
                  )
                }
              >
                {busy
                  ? 'Working…'
                  : article
                    ? 'Save new revision'
                    : 'Create draft'}
              </button>

              {dirty && (
                <span className="studio-unsaved">
                  Unsaved changes
                </span>
              )}
            </div>
          )}
        </main>

        <aside className="studio-sidebar">
          <div className="studio-sidebar-inner">
            <h2>Publishing</h2>

            {article ? (
              <>
                <p>
                  Revision {article.current_revision} ·
                  Version {article.version}
                </p>

                {article.canonical_path && (
                  <a
                    className="studio-public-link"
                    href={article.canonical_path}
                  >
                    Open{' '}
                    {article.withdrawn
                      ? 'withdrawn'
                      : 'published'}{' '}
                    article ↗
                  </a>
                )}

                <div className="studio-actions">
                  {canEdit && (
                    <button
                      disabled={busy || dirty}
                      onClick={() =>
                        act('publish')
                      }
                    >
                      {article.public_revision
                        ? 'Publish new revision'
                        : 'Publish article'}
                    </button>
                  )}

                  {dirty && canEdit && (
                    <small>
                      Save your changes before
                      publishing.
                    </small>
                  )}

                  <label>
                    Publication note / action reason

                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={reason}
                      onChange={(e) =>
                        setReason(e.target.value)
                      }
                    />
                  </label>

                  {publisher &&
                    article.public_revision && (
                      <button
                        disabled={
                          busy ||
                          dirty ||
                          reason.trim().length < 10
                        }
                        onClick={() =>
                          act('withdraw')
                        }
                      >
                        Withdraw with public notice
                      </button>
                    )}
                </div>

                <div className="studio-sidebar-section">
                  <h2>Activity</h2>

                  <ol className="studio-history">
                    {article.events.map((event) => (
                      <li key={event.id}>
                        <strong>
                          {event.action.replaceAll(
                            '_',
                            ' ',
                          )}
                        </strong>

                        {' · revision '}
                        {event.revision}

                        <br />

                        <time>
                          {new Date(
                            event.recorded_at,
                          )
                            .toISOString()
                            .slice(0, 16)
                            .replace('T', ' ')}{' '}
                          UTC
                        </time>

                        {event.message && (
                          <p>
                            {event.message}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="studio-sidebar-section">
                  <h2>Saved revisions</h2>

                  <ol className="studio-history">
                    {article.revisions.map(
                      (revision) => (
                        <li
                          key={
                            revision.revision
                          }
                        >
                          Revision{' '}
                          {revision.revision}:{' '}
                          {revision.title}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              </>
            ) : (
              <p>
                Create the draft when you're ready.
                Drafts are private and never appear on
                the publication.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}