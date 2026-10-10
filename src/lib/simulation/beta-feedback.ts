export const BETA_FEEDBACK_VERSION =
  'beta-feedback-0.1.0';

export type BetaFeedbackCategory =
  | 'wrong-result'
  | 'broken'
  | 'feature-request'
  | 'confusing'
  | 'other';

export type BetaFeedbackSimulatorMode =
  | 'simple'
  | 'advanced';

export interface BetaFeedbackVersions {
  simulatorVersion?: string;
  engineVersion?: string;
  corpusVersion?: string;
}

export interface BetaFeedbackSubmission {
  category: BetaFeedbackCategory;
  message: string;
  expectedBehavior?: string;
  simulatorMode: BetaFeedbackSimulatorMode;
  versions: BetaFeedbackVersions;
  snapshot: unknown;
}

export interface ValidatedBetaFeedbackSubmission {
  category: BetaFeedbackCategory;
  message: string;
  expectedBehavior?: string;
  simulatorMode: BetaFeedbackSimulatorMode;
  versions: BetaFeedbackVersions;
  snapshot: unknown;
}

const CATEGORIES = new Set<BetaFeedbackCategory>([
  'wrong-result',
  'broken',
  'feature-request',
  'confusing',
  'other',
]);

const MODES = new Set<BetaFeedbackSimulatorMode>([
  'simple',
  'advanced',
]);

function text(
  value: unknown,
  maxLength: number,
  required = false,
) {
  if (typeof value !== 'string') {
    return required ? undefined : '';
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function safeVersions(
  value: unknown,
): BetaFeedbackVersions {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const row = value as Record<string, unknown>;

  return {
    ...(typeof row.simulatorVersion === 'string'
      ? {
          simulatorVersion:
            row.simulatorVersion.trim().slice(0, 80),
        }
      : {}),
    ...(typeof row.engineVersion === 'string'
      ? {
          engineVersion:
            row.engineVersion.trim().slice(0, 80),
        }
      : {}),
    ...(typeof row.corpusVersion === 'string'
      ? {
          corpusVersion:
            row.corpusVersion.trim().slice(0, 120),
        }
      : {}),
  };
}

function snapshotIsSafe(value: unknown) {
  if (value === undefined) return false;

  try {
    const serialized = JSON.stringify(value);

    return (
      serialized.length > 0 &&
      serialized.length <= 120_000
    );
  } catch {
    return false;
  }
}

export function validateBetaFeedbackSubmission(
  value: unknown,
):
  | {
      ok: true;
      value: ValidatedBetaFeedbackSubmission;
    }
  | {
      ok: false;
      error: string;
    } {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {
      ok: false,
      error: 'Feedback payload must be an object.',
    };
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.category !== 'string' ||
    !CATEGORIES.has(
      row.category as BetaFeedbackCategory,
    )
  ) {
    return {
      ok: false,
      error: 'Feedback category is invalid.',
    };
  }

  if (
    typeof row.simulatorMode !== 'string' ||
    !MODES.has(
      row.simulatorMode as BetaFeedbackSimulatorMode,
    )
  ) {
    return {
      ok: false,
      error: 'Simulator mode is invalid.',
    };
  }

  const message = text(row.message, 4000, true);

  if (!message) {
    return {
      ok: false,
      error: 'Feedback message is required.',
    };
  }

  const expectedBehavior = text(
    row.expectedBehavior,
    4000,
  );

  if (!snapshotIsSafe(row.snapshot)) {
    return {
      ok: false,
      error:
        'Simulation snapshot is missing or too large.',
    };
  }

  return {
    ok: true,
    value: {
      category:
        row.category as BetaFeedbackCategory,
      message,
      ...(expectedBehavior
        ? { expectedBehavior }
        : {}),
      simulatorMode:
        row.simulatorMode as BetaFeedbackSimulatorMode,
      versions: safeVersions(row.versions),
      snapshot: row.snapshot,
    },
  };
}

export function createBetaFeedbackReference(
  id = crypto.randomUUID(),
) {
  const compact = id
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  return {
    id,
    reference: `PF-BETA-${compact}`,
  };
}
