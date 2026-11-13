import { describe, expect, it } from 'vitest';
import { buildLegacyWorkloadCorpus } from '../src/lib/simulation/modules/legacy-workload-corpus';
import { validateDeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('legacy workload corpus migration', () => {
  it('migrates the existing calibration dataset into the corpus model', () => {
    const corpus = buildLegacyWorkloadCorpus();
    const issues = validateDeviceCorpus(corpus);

    expect(corpus.devices.length).toBeGreaterThan(100);
    expect(corpus.measurements.length).toBeGreaterThan(150);
    expect(corpus.sources.length).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });

  it('does not label gaming or video rows with the first workload on a shared source URL', () => {
    const corpus = buildLegacyWorkloadCorpus();
    const sources = new Map(corpus.sources.map(source => [source.id, source]));
    expect(corpus.measurements.length).toBeGreaterThan(150);
    for (const measurement of corpus.measurements) {
      const source = sources.get(measurement.sourceId);
      expect(source).toBeDefined();
      expect(source?.protocol).toBe(`legacy-${measurement.workload}-method-unspecified`);
    }
  });

  it('preserves uncertainty instead of inventing regional variant data', () => {
    const corpus = buildLegacyWorkloadCorpus();
    const device = corpus.devices[0];

    expect(device.variant.identity.region).toBeUndefined();
    expect(device.variant.identity.sku).toBeUndefined();
    expect(device.variant.soc).toBeUndefined();
  });
});
