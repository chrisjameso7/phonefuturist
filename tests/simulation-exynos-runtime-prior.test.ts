import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';

describe('future Exynos runtime priors', () => {
  it('anchors an Exynos 2700 concept to measured Exynos 2600 WiFi peers', () => {
    const registry = buildCalibrationRegistry();

    const result = resolveCorpusRuntimeBand(
      registry,
      {
        formFactor: 'phone',
        displays: {
          primary: {
            diagonalInches: 6.9,
            resolutionWidthPx: 1440,
            resolutionHeightPx: 3120,
            refreshRateHz: 120,
          },
        },
        battery: {
          cells: [
            {
              capacityMah: 5700,
            },
          ],
        },
      },
      'web_browsing',
      {},
      {
        manufacturer: 'Samsung',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(
      result.estimate?.sameSocFamilyReferences,
    ).toBe(0);
    expect(
      result.estimate?.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(
      result.estimate?.referenceCount,
    ).toBeGreaterThanOrEqual(2);

    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeGreaterThan(220);
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeLessThan(300);

    expect(
      result.estimate?.publisherCount,
    ).toBe(1);
    expect(
      result.estimate?.protocolFamilyCount,
    ).toBe(1);
  });

  it('keeps the single-device H264 Exynos runtime evidence from pretending to be a same-vendor cohort', () => {
    const registry = buildCalibrationRegistry();

    const result = resolveCorpusRuntimeBand(
      registry,
      {
        formFactor: 'phone',
        displays: {
          primary: {
            diagonalInches: 6.9,
            resolutionWidthPx: 1440,
            resolutionHeightPx: 3120,
            refreshRateHz: 120,
          },
        },
        battery: {
          cells: [
            {
              capacityMah: 5700,
            },
          ],
        },
      },
      'video_playback',
      {},
      {
        manufacturer: 'Samsung',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
      },
    );

    if (result.status === 'resolved') {
      expect(
        result.estimate?.evidenceScope,
      ).not.toBe('same-soc-vendor');
    }
  });
});
