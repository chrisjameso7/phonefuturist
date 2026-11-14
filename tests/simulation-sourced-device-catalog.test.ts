import { describe, expect, it } from 'vitest';
import {
  buildSourcedDeviceCatalog,
  getSourcedDeviceCatalogCount,
  searchSourcedDeviceCatalog,
} from '../src/lib/simulation/modules/sourced-device-catalog';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('sourced 1000-device catalog', () => {
  it('loads exactly 1000 catalog-only devices with no measurement rows', () => {
    const corpus =
      buildSourcedDeviceCatalog();

    expect(
      getSourcedDeviceCatalogCount(),
    ).toBe(1000);
    expect(corpus.devices).toHaveLength(
      1000,
    );
    expect(corpus.measurements).toEqual(
      [],
    );
    expect(
      corpus.sources.every(
        (source) =>
          source.sourceRole ===
          'catalog',
      ),
    ).toBe(true);
    expect(
      corpus.devices.every(
        (device) =>
          device.catalogTrust ===
          'source-backed-unverified',
      ),
    ).toBe(true);
  });

  it('passes corpus validation without ever using catalog sources as measurement evidence', () => {
    const issues =
      validateDeviceCorpus(
        buildSourcedDeviceCatalog(),
      );

    expect(issues).toEqual([]);
  });

  it('finds common phones by model name', () => {
    const iphone =
      searchSourcedDeviceCatalog(
        'iPhone 17',
        5,
      );
    const galaxy =
      searchSourcedDeviceCatalog(
        'Galaxy S26 Ultra',
        5,
      );

    expect(
      iphone.some(
        (match) =>
          match.device.variant.identity.modelName
            .toLowerCase()
            .includes('iphone 17'),
      ),
    ).toBe(true);

    expect(
      galaxy.some(
        (match) =>
          match.device.variant.identity.modelName
            .toLowerCase()
            .includes('s26 ultra'),
      ),
    ).toBe(true);
  });

  it('keeps source URLs in notes for provenance', () => {
    const match =
      searchSourcedDeviceCatalog(
        'Nothing Phone 1',
        1,
      )[0];

    expect(match).toBeDefined();
    expect(
      match.device.variant.notes?.some(
        (note) =>
          note.startsWith(
            'Source URL: https://',
          ),
      ),
    ).toBe(true);
  });
});
