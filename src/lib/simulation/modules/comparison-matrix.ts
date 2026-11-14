import type { ExperienceComparison, ExperienceDelta } from './experience-comparison';

export const COMPARISON_MATRIX_VERSION = 'comparison-matrix-0.1.0';

export interface ComparisonMatrixRow {
  key: string;
  label: string;
  unit?: string;
  simulated?: number;
  released: Record<string, number | undefined>;
  deltaPercent: Record<string, number | undefined>;
  confidence: Record<string, number | undefined>;
}

export interface ComparisonMatrix {
  version: string;
  rows: ComparisonMatrixRow[];
}

function rowKey(delta: ExperienceDelta) {
  return `${delta.domain}:${delta.label}`;
}

export function buildComparisonMatrix(
  comparisons: ExperienceComparison[],
): ComparisonMatrix {
  const rows = new Map<string, ComparisonMatrixRow>();

  for (const comparison of comparisons) {
    if (comparison.status !== 'resolved' || !comparison.releasedVariantId) {
      continue;
    }

    for (const delta of comparison.deltas) {
      const key = rowKey(delta);
      const row = rows.get(key) ?? {
        key,
        label: delta.label,
        unit: delta.unit,
        simulated: delta.simulated,
        released: {},
        deltaPercent: {},
        confidence: {},
      };

      row.simulated ??= delta.simulated;
      row.released[comparison.releasedVariantId] = delta.released;
      row.deltaPercent[comparison.releasedVariantId] = delta.deltaPercent;
      row.confidence[comparison.releasedVariantId] = delta.confidence;
      rows.set(key, row);
    }
  }

  return {
    version: COMPARISON_MATRIX_VERSION,
    rows: [...rows.values()],
  };
}
