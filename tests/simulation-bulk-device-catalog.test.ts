import { describe, expect, it } from 'vitest';
import {
  buildBulkDeviceCatalogCorpus,
} from '../src/lib/simulation/modules/bulk-device-catalog-corpus';
import {
  techApiCatalogCount,
} from '../src/lib/simulation/modules/techapi-device-catalog';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('bulk device catalog corpus compatibility alias', () => {
  it('resolves to the canonical TechAPI 1000-device snapshot', () => {
    const corpus =
      buildBulkDeviceCatalogCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    expect(
      techApiCatalogCount().devices,
    ).toBe(1000);

    expect(corpus.devices).toHaveLength(1000);
  });

  it('keeps catalog specifications separate from measured evidence', () => {
    const corpus =
      buildBulkDeviceCatalogCorpus();

    expect(
      corpus.measurements,
    ).toHaveLength(0);

    expect(
      corpus.sources.map(
        (source) =>
          source.publisher,
      ),
    ).toContain('TechAPI');
  });
});
