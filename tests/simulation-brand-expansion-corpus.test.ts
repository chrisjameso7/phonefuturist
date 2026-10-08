import { describe, expect, it } from 'vitest';
import { buildBrandExpansionCorpus } from '../src/lib/simulation/modules/brand-expansion-corpus';
import { validateDeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('brand expansion corpus import', () => {
  it('imports the multi-brand cohort into the canonical corpus', () => {
    const corpus = buildBrandExpansionCorpus();

    expect(corpus.devices.length).toBeGreaterThanOrEqual(10);
    expect(corpus.measurements.length).toBeGreaterThan(20);
    expect(validateDeviceCorpus(corpus)).toEqual([]);
  });

  it('keeps Honor regional battery variants separate', () => {
    const corpus = buildBrandExpansionCorpus();
    const honor = corpus.devices.filter(
      (device) => device.variant.identity.modelName === 'Magic7 Pro',
    );

    expect(honor).toHaveLength(2);
    expect(honor[0].variant.id).not.toBe(honor[1].variant.id);
    expect(honor[0].variant.battery?.capacityMah)
      .not.toBe(honor[1].variant.battery?.capacityMah);
  });
});
