import { describe, expect, it } from 'vitest';
import {
  buildBulkDeviceIdentityCorpus,
  makeBulkDeviceIdentityId,
  validateBulkDeviceIdentityFile,
  type BulkDeviceIdentityFile,
} from '../src/lib/simulation/modules/bulk-device-identity-corpus';

const file: BulkDeviceIdentityFile = {
  version: 'test',
  source: {
    id: 'gsmarena-catalog',
    publisher: 'GSMArena',
    url: 'https://www.gsmarena.com/makers.php3',
    protocol: 'Catalog identity only',
  },
  devices: [
    {
      id: 'samsung-galaxy-s26-ultra',
      manufacturer: 'Samsung',
      model: 'Galaxy S26 Ultra',
      sourceId: 'gsmarena-catalog',
      sourceUrl:
        'https://www.gsmarena.com/samsung_galaxy_s26_ultra_5g-14320.php',
      sourceTier: 'catalog',
      announcedYear: 2026,
    },
  ],
};

describe('bulk device identity corpus', () => {
  it('builds identity-only device rows without fabricating measurements', () => {
    const corpus =
      buildBulkDeviceIdentityCorpus(
        file,
      );

    expect(corpus.devices).toHaveLength(1);
    expect(corpus.measurements).toEqual([]);
    expect(
      corpus.devices[0].variant.identity
        .modelName,
    ).toBe('Galaxy S26 Ultra');
  });

  it('creates stable normalized ids', () => {
    expect(
      makeBulkDeviceIdentityId(
        'Nothing',
        'Phone (4a) Pro',
        'global',
      ),
    ).toBe(
      'nothing-phone-4a-pro-global',
    );
  });

  it('flags rows outside the requested 2025-2026 window', () => {
    const issues =
      validateBulkDeviceIdentityFile({
        ...file,
        devices: [
          {
            ...file.devices[0],
            announcedYear: 2024,
          },
        ],
      });

    expect(
      issues.some(
        (issue) =>
          issue.code ===
          'OUTSIDE_TARGET_WINDOW',
      ),
    ).toBe(true);
  });

  it('requires every row to reference the declared source', () => {
    const issues =
      validateBulkDeviceIdentityFile({
        ...file,
        devices: [
          {
            ...file.devices[0],
            sourceId: 'other',
          },
        ],
      });

    expect(
      issues.some(
        (issue) =>
          issue.code ===
          'MISSING_SOURCE',
      ),
    ).toBe(true);
  });
});
