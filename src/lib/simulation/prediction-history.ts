import type {
  PredictionSnapshot,
  RealitySnapshot,
} from './prediction-validation';

export const PREDICTION_HISTORY_VERSION =
  'prediction-history-0.1.0';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function compactText(
  value: unknown,
  max: number,
) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > max
  ) {
    return undefined;
  }

  return trimmed;
}

function safeJsonSize(
  value: unknown,
  maxBytes = 160_000,
) {
  try {
    const serialized =
      JSON.stringify(value);

    return (
      serialized.length > 0 &&
      new TextEncoder().encode(
        serialized,
      ).length <= maxBytes
    );
  } catch {
    return false;
  }
}

function isoDate(value: unknown) {
  if (typeof value !== 'string') {
    return false;
  }

  const time = Date.parse(value);

  return Number.isFinite(time);
}

function validMetric(
  value: unknown,
  reality = false,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  if (
    !compactText(row.key, 120) ||
    !compactText(
      row.unit,
      40,
    ) ||
    typeof row.value !== 'number' ||
    !Number.isFinite(row.value)
  ) {
    return false;
  }

  if (
    !reality &&
    !compactText(
      row.label,
      180,
    )
  ) {
    return false;
  }

  if (
    reality &&
    !isoDate(row.measuredAt)
  ) {
    return false;
  }

  return true;
}

export function validatePredictionSnapshotForStorage(
  value: unknown,
):
  | {
      ok: true;
      value: PredictionSnapshot;
    }
  | {
      ok: false;
      error: string;
    } {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !safeJsonSize(value)
  ) {
    return {
      ok: false,
      error:
        'Prediction snapshot is invalid or too large.',
    };
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof row.id !== 'string' ||
    !UUID_RE.test(row.id)
  ) {
    return {
      ok: false,
      error:
        'Prediction snapshot id must be a UUID.',
    };
  }

  if (
    !compactText(
      row.deviceName,
      180,
    )
  ) {
    return {
      ok: false,
      error:
        'Prediction device name is invalid.',
    };
  }

  if (!isoDate(row.createdAt)) {
    return {
      ok: false,
      error:
        'Prediction creation time is invalid.',
    };
  }

  if (
    !Array.isArray(row.metrics) ||
    row.metrics.length > 100 ||
    !row.metrics.every(
      (metric) =>
        validMetric(
          metric,
          false,
        ),
    )
  ) {
    return {
      ok: false,
      error:
        'Prediction metrics are invalid.',
    };
  }

  return {
    ok: true,
    value:
      value as PredictionSnapshot,
  };
}

export function validateRealitySnapshotForStorage(
  value: unknown,
):
  | {
      ok: true;
      value: RealitySnapshot;
    }
  | {
      ok: false;
      error: string;
    } {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !safeJsonSize(value)
  ) {
    return {
      ok: false,
      error:
        'Reality snapshot is invalid or too large.',
    };
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof row.id !== 'string' ||
    !UUID_RE.test(row.id) ||
    typeof row.predictionId !==
      'string' ||
    !UUID_RE.test(
      row.predictionId,
    )
  ) {
    return {
      ok: false,
      error:
        'Reality and prediction ids must be UUIDs.',
    };
  }

  if (!isoDate(row.createdAt)) {
    return {
      ok: false,
      error:
        'Reality snapshot creation time is invalid.',
    };
  }

  if (
    !Array.isArray(row.metrics) ||
    row.metrics.length > 100 ||
    !row.metrics.length ||
    !row.metrics.every(
      (metric) =>
        validMetric(
          metric,
          true,
        ),
    )
  ) {
    return {
      ok: false,
      error:
        'Reality metrics are invalid.',
    };
  }

  return {
    ok: true,
    value:
      value as RealitySnapshot,
  };
}

export interface PredictionValidationAccessState {
  active?: boolean;
  verified?: boolean;
  roles?: unknown;
  mfa_required?: boolean;
  aal?: string;
}

export function canResolvePredictionReality(
  access:
    | PredictionValidationAccessState
    | null
    | undefined,
) {
  if (
    !access?.active ||
    !access.verified ||
    !Array.isArray(
      access.roles,
    )
  ) {
    return false;
  }

  const roles =
    new Set(
      access.roles.filter(
        (role):
          role is string =>
          typeof role ===
          'string',
      ),
    );

  const allowed =
    roles.has('admin') ||
    roles.has('publisher') ||
    roles.has('editor');

  if (!allowed) {
    return false;
  }

  return (
    !access.mfa_required ||
    access.aal === 'aal2'
  );
}
