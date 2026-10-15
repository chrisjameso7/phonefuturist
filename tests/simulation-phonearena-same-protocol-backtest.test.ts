import { beforeAll, describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestPhoneArenaSameProtocolRuntime } from '../src/lib/simulation/modules/phonearena-same-protocol-backtest';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const PHONEARENA = 'phonearena-battery-current-2026-10';

function fixture(): DeviceCorpus {
  const ids = ['one', 'two', 'three'];
  return {
    version: 'same-protocol-test',
    sources: [
      { id: PHONEARENA, publisher: 'Example Lab', url: 'https://example.com/pa', protocol: '200-nit-runtime-test', protocolVersion: '1' },
      { id: 'other-lab', publisher: 'Other Lab', url: 'https://example.com/other', protocol: 'different-brightness' },
    ],
    devices: ids.map(id => ({
      variant: {
        id,
        identity: { manufacturer: 'Example', family: id, modelName: id },
        battery: { capacityMah: 5000, typicalEnergyWh: 20 },
      },
    })),
    measurements: [
      ...ids.flatMap(id => (['web_browsing', 'video_playback', 'gaming'] as const).map(workload => ({
        id: id + '-' + workload,
        deviceVariantId: id,
        workload,
        metric: 'runtime',
        value: 10,
        unit: 'hours',
        sourceId: PHONEARENA,
        evidenceKind: 'measured' as const,
      }))),
      { id: 'wrong-protocol', deviceVariantId: 'two', workload: 'web_browsing', metric: 'runtime', value: 100, unit: 'hours', sourceId: 'other-lab', evidenceKind: 'measured' },
    ],
  };
}

describe('PhoneArena same-protocol runtime leave-one-device-out backtest', () => {
  it('holds out every measurement for the target device and isolates protocols', () => {
    const result = backtestPhoneArenaSameProtocolRuntime(fixture());
    expect(result.evaluatedRows).toBe(9);
    expect(result.skippedRows).toBe(0);
    expect(result.mapePercent).toBeCloseTo(0, 8);
    expect(result.rows.every(r => r.referenceCount === 2)).toBe(true);
    expect(result.rows.every(r => !r.referenceVariantIds.includes(r.deviceVariantId))).toBe(true);
    expect(result.rows.every(r => r.energyBasis === 'mah')).toBe(true);
  });

  it('uses accepted measured energy for eligible same-protocol references', () => {
    const result = backtestPhoneArenaSameProtocolRuntime(fixture(), 'spec-enriched');
    expect(result.evaluatedRows).toBe(9);
    expect(result.mapePercent).toBeCloseTo(0, 8);
    expect(result.rows.every(r => r.energyBasis === 'wh')).toBe(true);
    expect(result.rows.every(r => r.energyReferenceCount === 2)).toBe(true);
  });

  describe('live corpus diagnostics', () => {
    let sparse: ReturnType<typeof backtestPhoneArenaSameProtocolRuntime>;
    let enriched: ReturnType<typeof backtestPhoneArenaSameProtocolRuntime>;

    beforeAll(() => {
      const corpus = buildCalibrationRegistry();
      sparse = backtestPhoneArenaSameProtocolRuntime(corpus, 'sparse');
      enriched = backtestPhoneArenaSameProtocolRuntime(corpus, 'spec-enriched');
    }, 120_000);

    it('reports independent same-protocol errors without reusing the held-out device', () => {
      expect(sparse.totalMeasurements).toBeGreaterThanOrEqual(100);
      expect(sparse.evaluatedRows).toBeGreaterThanOrEqual(100);
      expect(sparse.rows.every(r => !r.referenceVariantIds.includes(r.deviceVariantId))).toBe(true);
      expect(sparse.rows.every(r => r.referenceCount > 0)).toBe(true);
      const cohort = (mode: typeof sparse) => ({
        evaluated: mode.evaluatedRows,
        skipped: mode.skippedRows,
        mapePercent: mode.mapePercent,
        within20Percent: mode.within20Percent,
        byWorkload: (['web_browsing', 'video_playback', 'gaming'] as const).map(workload => {
          const rows = mode.rows.filter(row => row.workload === workload);
          return {
            workload,
            count: rows.length,
            mapePercent: rows.length ? rows.reduce((sum, row) => sum + row.absolutePercentageError, 0) / rows.length : null,
          };
        }),
        whRows: mode.rows.filter(row => row.energyBasis === 'wh').length,
        targetVoltageEvidenceRows: mode.rows.filter(row => row.targetHasVoltage).length,
        selectedReferenceEnergyRows: mode.rows.filter(row => row.energyReferenceCount > 0).length,
      });
      console.info('PHONEARENA_SAME_PROTOCOL_SPARSE', JSON.stringify(cohort(sparse)));
      console.info('PHONEARENA_SAME_PROTOCOL_ENRICHED', JSON.stringify(cohort(enriched)));
      // Report quality honestly; never alter the independent cross-lab holdout
      // or assert a target threshold without evidence.
      expect(Number.isFinite(sparse.mapePercent)).toBe(true);
      expect(Number.isFinite(enriched.mapePercent)).toBe(true);
    }, 120_000);
  });
});
