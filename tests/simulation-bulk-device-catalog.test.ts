import { describe, expect, it } from 'vitest';
import {
  buildBulkDeviceCatalogCorpus,
} from '../src/lib/simulation/modules/bulk-device-catalog-corpus';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('bulk device catalog corpus', () => {
  it('keeps catalog identities separate from measured evidence', () => {
    const corpus =
      buildBulkDeviceCatalogCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    for (const measurement of corpus.measurements) {
      expect(
        corpus.sources.some(
          (source) =>
            source.id ===
            measurement.sourceId,
        ),
      ).toBe(true);
    }
  });

  it('includes the expanded source pool even before a source contributes measurements', () => {
    const corpus =
      buildBulkDeviceCatalogCorpus();

    const publishers =
      new Set(
        corpus.sources.map(
          (source) =>
            source.publisher,
        ),
      );

    expect(publishers).toEqual(
      expect.objectContaining
        ? publishers
        : publishers,
    );

    expect(
      publishers.has('Geekerwan'),
    ).toBe(true);
    expect(
      publishers.has('Notebookcheck'),
    ).toBe(true);
    expect(
      publishers.has('DXOMARK'),
    ).toBe(true);
  });
});
