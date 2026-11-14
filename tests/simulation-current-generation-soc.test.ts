import { describe, expect, it } from 'vitest';
import { buildCurrentGenerationCorpus } from '../src/lib/simulation/modules/current-generation-corpus';

describe('current-generation SoC enrichment', () => {
  it('loads complete canonical SoC variants for enriched flagships', () => {
    const corpus = buildCurrentGenerationCorpus();

    const vivo = corpus.devices.find(
      (device) =>
        device.variant.id ===
        'vivo-x300-ultra-global-6600',
    );
    const oppo = corpus.devices.find(
      (device) =>
        device.variant.id ===
        'oppo-find-x9-pro-global-7500',
    );

    expect(vivo?.variant.soc).toEqual({
      vendor: 'Qualcomm',
      name: 'Snapdragon 8 Elite Gen 5',
    });

    expect(oppo?.variant.soc).toEqual({
      vendor: 'MediaTek',
      name: 'Dimensity 9500',
    });
  });

  it('never creates a partial SoC variant', () => {
    const corpus = buildCurrentGenerationCorpus();

    expect(
      corpus.devices
        .map((device) => device.variant.soc)
        .filter(Boolean)
        .every(
          (soc) =>
            Boolean(soc?.vendor) &&
            Boolean(soc?.name),
        ),
    ).toBe(true);
  });
});
