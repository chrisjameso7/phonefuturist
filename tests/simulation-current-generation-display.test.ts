import { describe, expect, it } from 'vitest';
import { buildCurrentGenerationCorpus } from '../src/lib/simulation/modules/current-generation-corpus';

describe('current-generation display enrichment', () => {
  it('carries official display metadata into runtime controls', () => {
    const corpus = buildCurrentGenerationCorpus();

    const ids = [
      'apple-iphone-18-pro-max-5567',
      'google-pixel-11-pro-xl-5115',
      'vivo-x300-ultra-global-6600',
      'honor-magic8-pro-eu-6270',
      'oneplus-15-global-7300',
      'oppo-find-x9-pro-global-7500',
      'samsung-galaxy-s26-ultra-global-5000',
    ];

    for (const id of ids) {
      const device = corpus.devices.find(
        (row) => row.variant.id === id,
      );

      expect(device, id).toBeDefined();
      expect(
        device?.display?.resolutionWidthPx,
        id,
      ).toBeGreaterThan(0);
      expect(
        device?.display?.resolutionHeightPx,
        id,
      ).toBeGreaterThan(0);
      expect(
        device?.display?.refreshRateHz,
        id,
      ).toBeGreaterThan(0);
    }
  });
});
