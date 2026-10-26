import { useEffect, useRef, useState } from 'react';

type Category =
  | 'wrong-result'
  | 'broken'
  | 'feature-request'
  | 'confusing'
  | 'other';

type Props = {
  snapshot: unknown;
  simulatorMode: 'simple' | 'advanced';
  versions: {
    simulatorVersion?: string;
    engineVersion?: string;
    corpusVersion?: string;
  };
};

export default function BetaFeedbackPanel({
  snapshot,
  simulatorMode,
  versions,
}: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  const [category, setCategory] =
    useState<Category>('wrong-result');
  const [message, setMessage] = useState('');
  const [expectedBehavior, setExpectedBehavior] =
    useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] =
    useState(false);

  async function submit() {
    if (!message.trim()) {
      setStatus('Tell us what you noticed first.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setStatus('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        '/api/simulator-feedback',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            category,
            message,
            expectedBehavior,
            simulatorMode,
            versions,
            snapshot,
          }),
        },
      );

      const body = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        error?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(
          body.error ??
            'Feedback could not be submitted.',
        );
      }

      setStatus(
        `Sent. Reference ${body.reference ?? 'created'}.`,
      );
      setMessage('');
      setExpectedBehavior('');
    } catch (error) {
      setStatus(
        controller.signal.aborted
          ? 'Submission could not be confirmed in time. Your message is still here; please try again later.'
          : error instanceof Error
          ? error.message
          : 'Feedback could not be submitted.',
      );
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="il-feedback-trigger"
        onClick={() => setOpen(true)}
      >
        Beta feedback
      </button>

      {open ? (
        <dialog
          ref={dialogRef}
          className="il-feedback-backdrop"
          aria-labelledby="il-feedback-title"
          aria-modal="true"
          aria-busy={submitting}
          onCancel={() => setOpen(false)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            className="il-feedback-modal"
          >
            <div className="il-feedback-head">
              <div>
                <span>Interactive Leaks Beta</span>
                <h2 id="il-feedback-title">
                  Tell us what you noticed
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close feedback"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <label className="il-field">
              <span>Feedback type</span>
              <select
                value={category}
                disabled={submitting}
                onChange={(event) =>
                  setCategory(
                    event.currentTarget
                      .value as Category,
                  )
                }
              >
                <option value="wrong-result">
                  Result looks wrong
                </option>
                <option value="broken">
                  Something is broken
                </option>
                <option value="feature-request">
                  Feature request
                </option>
                <option value="confusing">
                  Confusing / hard to understand
                </option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="il-field">
              <span>What did you notice?</span>
              <textarea
                rows={5}
                maxLength={4000}
                value={message}
                disabled={submitting}
                onChange={(event) =>
                  setMessage(
                    event.currentTarget.value,
                  )
                }
                placeholder="Example: 60 W charging looks too slow for this 5700 mAh configuration."
              />
            </label>

            <label className="il-field">
              <span>
                What did you expect instead?
              </span>
              <textarea
                rows={3}
                maxLength={4000}
                value={expectedBehavior}
                disabled={submitting}
                onChange={(event) =>
                  setExpectedBehavior(
                    event.currentTarget.value,
                  )
                }
                placeholder="Optional"
              />
            </label>

            <p className="il-feedback-disclosure">
              This report includes your current simulation
              configuration and calculated outputs so we can
              reproduce the issue. It does not include your
              password or private account credentials.
            </p>

            <div className="il-feedback-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
              >
                {submitting
                  ? 'Sending…'
                  : 'Send feedback'}
              </button>
            </div>

            {status ? (
              <p className="il-feedback-status" role="status">
                {status}
              </p>
            ) : null}
          </section>
        </dialog>
      ) : null}
    </>
  );
}
