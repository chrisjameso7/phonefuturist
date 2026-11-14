import { describe, expect, it } from 'vitest';
import { simulateDevice } from '../src/lib/simulation/engine';
import { buildPredictionSnapshot } from '../src/lib/simulation/modules/prediction-snapshot-builder';

describe('prediction snapshot builder', () => {
  it('freezes deterministic and resolved calibrated outputs with versions', () => {
    const simulation = simulateDevice({
      formFactor: 'phone',
      name: 'Future Phone',
      displays: {
        primary: {
          diagonalInches: 6.8,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3200,
        },
      },
      battery: {
        cells: [
          {
            capacityMah: 5700,
            nominalVoltageV: 3.9,
          },
        ],
      },
    });

    const snapshot =
      buildPredictionSnapshot({
        id: 'prediction-1',
        createdAt:
          '2026-01-01T00:00:00.000Z',
        deviceName: 'Future Phone',
        simulation,
        corpusVersion:
          'calibration-registry-0.3.0',
        simulatorVersion:
          'interactive-leaks-beta',
        experiences: {
          wiredFullChargeMinutes: 55,
          sustainedPerformancePercent: 62,
          peakBenchmarkScore: 12000,
          peakBenchmarkLabel:
            'Geekbench 6 multi-core',
          peakBenchmarkProvenance:
            'assumption-adjusted',
        },
      });

    expect(snapshot.id).toBe(
      'prediction-1',
    );
    expect(snapshot.engineVersion).toBe(
      simulation.engineVersion,
    );
    expect(snapshot.corpusVersion).toBe(
      'calibration-registry-0.3.0',
    );

    const capacity =
      snapshot.metrics.find(
        (metric) =>
          metric.key ===
          'battery_capacity_mah',
      );

    expect(capacity?.value).toBe(5700);
    expect(capacity?.provenance).toBe(
      'deterministic',
    );

    const peak =
      snapshot.metrics.find(
        (metric) =>
          metric.key ===
          'peak_benchmark_score',
      );

    expect(peak?.value).toBe(12000);
    expect(peak?.provenance).toBe(
      'assumption-adjusted',
    );
  });

  it('omits unresolved experience domains instead of inventing zero values', () => {
    const simulation = simulateDevice({
      formFactor: 'phone',
      displays: {
        primary: {},
      },
    });

    const snapshot =
      buildPredictionSnapshot({
        id: 'prediction-empty',
        createdAt:
          '2026-01-01T00:00:00.000Z',
        deviceName: 'Sparse Concept',
        simulation,
        experiences: {},
      });

    expect(
      snapshot.metrics.some(
        (metric) =>
          metric.key ===
          'wired_full_charge_minutes',
      ),
    ).toBe(false);

    expect(
      snapshot.metrics.some(
        (metric) =>
          metric.key ===
          'display_panel_power_w',
      ),
    ).toBe(false);

    expect(
      snapshot.metrics.every(
        (metric) =>
          metric.value !== 0,
      ),
    ).toBe(true);
  });

  it('deep-copies assumptions into the frozen snapshot', () => {
    const simulation = simulateDevice({
      formFactor: 'phone',
      displays: {
        primary: {},
      },
    });

    const assumptions = {
      soc: {
        upliftPercent: 15,
      },
    };

    const snapshot =
      buildPredictionSnapshot({
        id: 'prediction-copy',
        createdAt:
          '2026-01-01T00:00:00.000Z',
        deviceName: 'Future Phone',
        simulation,
        assumptions,
      });

    (
      assumptions.soc as {
        upliftPercent: number;
      }
    ).upliftPercent = 99;

    expect(
      (
        snapshot.assumptions?.soc as {
          upliftPercent: number;
        }
      ).upliftPercent,
    ).toBe(15);
  });
});
