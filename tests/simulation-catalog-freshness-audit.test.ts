import { describe, expect, it } from 'vitest';
import {
  auditCurrentCatalogFreshness,
} from '../src/lib/simulation/modules/catalog-freshness-audit';

describe('expanded catalog freshness audit', () => {
  it('reports every GSMArena row in exactly one freshness bucket', () => {
    const audit =
      auditCurrentCatalogFreshness();

    const total =
      audit.verified2025To2026 +
      audit.crossSourceVerified2025To2026 +
      audit.yearUnverified +
      audit.outsideTargetWindow;

    expect(total).toBe(
      audit.totalGsmArenaRecords,
    );

    expect(
      audit.totalGsmArenaRecords,
    ).toBeGreaterThanOrEqual(1000);
  });

  it('never treats release-order position alone as proof of release year', () => {
    const audit =
      auditCurrentCatalogFreshness();

    expect(
      audit.rows
        .filter(
          (row) =>
            !row.releaseDate,
        )
        .every(
          (row) =>
            row.status ===
              'current-catalog-year-unverified' ||
            row.status ===
              'cross-source-verified-2025-2026',
        ),
    ).toBe(true);
  });
});
