import { describe, expect, it } from 'vitest';
import {
  buildExpandedDeviceCatalog,
  expandedDeviceCatalogStats,
} from '../src/lib/simulation/modules/expanded-device-catalog';
import {
  findDeviceByName,
} from '../src/lib/simulation/modules/device-lookup';

describe('expanded device catalog', () => {
  it('combines the canonical TechAPI thousand-device snapshot with the GSMArena expansion', () => {
    const stats =
      expandedDeviceCatalogStats();

    expect(
      stats.rawDeviceRecords,
    ).toBeGreaterThanOrEqual(2000);

    expect(
      stats.measurementCount,
    ).toBe(0);
  });

  it('keeps every catalog source marked as catalog evidence', () => {
    const corpus =
      buildExpandedDeviceCatalog();

    expect(
      corpus.sources.every(
        (source) =>
          source.sourceRole ===
          'catalog',
      ),
    ).toBe(true);
  });

  it('supports lookup across both catalog families', () => {
    const corpus =
      buildExpandedDeviceCatalog();

    const s26 =
      findDeviceByName(
        corpus,
        'Samsung Galaxy S26 Ultra',
      );

    const nothing =
      findDeviceByName(
        corpus,
        'Nothing Phone 4a Pro',
      );

    expect(s26.length).toBeGreaterThan(0);
    expect(nothing.length).toBeGreaterThan(0);
  });
});
