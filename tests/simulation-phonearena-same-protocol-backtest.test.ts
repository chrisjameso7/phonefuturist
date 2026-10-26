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
  it('holds out all model aliases, not only the current variant ID', () => {
    const corpus = fixture();
    const alias = structuredClone(corpus.devices[0]);
    alias.variant.id = 'one-alias';
    alias.variant.identity.modelName = '  ONE 256GB  ';
    corpus.devices.push(alias);
    corpus.measurements.push({...corpus.measurements[0],id:'alias-web',deviceVariantId:'one-alias',value:1});
    const result = backtestPhoneArenaSameProtocolRuntime(corpus);
    const original = result.rows.filter(row => row.deviceVariantId === 'one');
    expect(original).toHaveLength(3);
    expect(original.every(row=>!row.referenceVariantIds.includes('one-alias'))).toBe(true);
    expect(result.rows.filter(row=>row.deviceVariantId==='one-alias').every(row=>!row.referenceVariantIds.includes('one'))).toBe(true);
  });

  it('holds out every measurement for the target device and isolates protocols', () => {
    const result = backtestPhoneArenaSameProtocolRuntime(fixture());
    expect(result.evaluatedRows).toBe(9);
    expect(result.skippedRows).toBe(0);
    expect(result.mapePercent).toBeCloseTo(0, 8);
    expect(result.rows.every(r => r.referenceCount === 2)).toBe(true);
    expect(result.rows.every(r => r.independentReferenceDeviceCount === 2)).toBe(true);
    expect(result.rows.every(r => !r.referenceVariantIds.includes(r.deviceVariantId))).toBe(true);
    expect(result.rows.every(r => r.energyBasis === 'mah')).toBe(true);
  });

  it('cannot use newer or undated phones when evaluating a historical target', () => {
    const dated = fixture();
    dated.devices[0].releaseDate = '2025-01-01';
    dated.devices[1].releaseDate = '2025-06-01';
    dated.devices[2].releaseDate = '2026-01-01';
    const result = backtestPhoneArenaSameProtocolRuntime(
      dated, 'sparse', 'past-devices-only',
    );
    // First device has no older reference; the other two have 1 and 2.
    expect(result.evaluatedRows).toBe(6);
    expect(result.skippedRows).toBe(3);
    expect(result.validationScheme).toBe('past-devices-only');
    expect(result.rows.every(r =>
      !!r.targetReleaseDate && !!r.latestReferenceReleaseDate &&
      r.latestReferenceReleaseDate < r.targetReleaseDate
    )).toBe(true);
    expect(result.rows.every(r => !r.referenceVariantIds.includes(r.deviceVariantId))).toBe(true);
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
    let specCoverage: Record<string, number>;
    let historical: ReturnType<typeof backtestPhoneArenaSameProtocolRuntime>;

    beforeAll(() => {
      const corpus = buildCalibrationRegistry();
      const ids = new Set(corpus.measurements
        .filter(m => m.sourceId === PHONEARENA && m.workload === 'web_browsing')
        .map(m => m.deviceVariantId));
      const targetDevices = corpus.devices.filter(d => ids.has(d.variant.id));
      specCoverage = {
        targetDeviceCount: targetDevices.length,
        withSocName: targetDevices.filter(d => !!d.variant.soc?.name).length,
        withDisplaySize: targetDevices.filter(d => !!d.display?.diagonalInches).length,
        withDisplayRefresh: targetDevices.filter(d => !!d.display?.refreshRateHz).length,
        withNominalVoltage: targetDevices.filter(d => !!d.variant.battery?.nominalVoltageV).length,
        withBatteryEnergyWh: targetDevices.filter(d => !!(d.variant.battery?.typicalEnergyWh ?? d.variant.battery?.ratedEnergyWh)).length,
      };
      sparse = backtestPhoneArenaSameProtocolRuntime(corpus, 'sparse');
      enriched = backtestPhoneArenaSameProtocolRuntime(corpus, 'spec-enriched');
      historical = backtestPhoneArenaSameProtocolRuntime(corpus, 'sparse', 'past-devices-only');
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
          const errors = rows.map(row => row.absolutePercentageError).sort((a, b) => a - b);
          const signedError = rows.map(row =>
            100 * (row.predictedHours - row.observedHours) / row.observedHours);
          return {
            workload,
            count: rows.length,
            mapePercent: rows.length
              ? rows.reduce((sum, row) => sum + row.absolutePercentageError, 0) / rows.length : null,
            within20Percent: rows.length
              ? 100 * rows.filter(row => row.absolutePercentageError <= 20).length / rows.length : null,
            meanSignedErrorPercent: rows.length
              ? signedError.reduce((sum, value) => sum + value, 0) / rows.length : null,
            p90AbsoluteErrorPercent: errors.length
              ? errors[Math.ceil(errors.length * 0.9) - 1] : null,
            worst: [...rows].sort((x, y) => y.absolutePercentageError - x.absolutePercentageError)
              .slice(0, 3).map(row => ({
                deviceVariantId: row.deviceVariantId,
                observedHours: row.observedHours,
                predictedHours: row.predictedHours,
                absolutePercentageError: row.absolutePercentageError,
              })),
          };
        }),
        whRows: mode.rows.filter(row => row.energyBasis === 'wh').length,
        targetVoltageEvidenceRows: mode.rows.filter(row => row.targetHasVoltage).length,
        selectedReferenceEnergyRows: mode.rows.filter(row => row.energyReferenceCount > 0).length,
        evaluatedWithOneIndependentReference: mode.rows.filter(row => row.independentReferenceDeviceCount === 1).length,
        evaluatedWithAtLeastTwoIndependentReferences: mode.rows.filter(row => row.independentReferenceDeviceCount >= 2).length,
      });
      console.info('PHONEARENA_RUNTIME_SPEC_COVERAGE', JSON.stringify(specCoverage));
      console.info('PHONEARENA_SAME_PROTOCOL_SPARSE', JSON.stringify(cohort(sparse)));
      console.info('PHONEARENA_SAME_PROTOCOL_ENRICHED', JSON.stringify(cohort(enriched)));
      console.info('PHONEARENA_SPEC_BRIDGE', JSON.stringify(enriched.specBridgeStats));
      console.info('PHONEARENA_PAST_DEVICES_ONLY', JSON.stringify(cohort(historical)));
      // Report quality honestly; never alter the independent cross-lab holdout
      // or assert a target threshold without evidence.
      expect(Number.isFinite(sparse.mapePercent)).toBe(true);
      expect(Number.isFinite(enriched.mapePercent)).toBe(true);
      expect(historical.evaluatedRows).toBeGreaterThanOrEqual(20);
      if (process.env.ENFORCE_SIMULATION_ACCURACY === '1') {
        // Require a real historical, same-laboratory quality milestone.
        // These gates are intentionally not tuned to the cross-protocol
        // PhoneArena-vs-other-labs mismatch.
        expect(historical.mapePercent, 'Historical same-protocol runtime MAPE must be <=20%')
          .toBeLessThanOrEqual(20);
        expect(historical.within20Percent, 'At least 80% of historical predictions must be within 20%')
          .toBeGreaterThanOrEqual(80);
        // A good average must not conceal a broken gaming, video or browsing
        // cohort. Require reasonable coverage within every workload.
        for (const workload of ['web_browsing', 'video_playback', 'gaming'] as const) {
          const rows = historical.rows.filter(row => row.workload === workload);
          const within20 = 100 * rows.filter(row =>
            row.absolutePercentageError <= 20).length / rows.length;
          expect(rows.length, workload + ': insufficient historical observations')
            .toBeGreaterThanOrEqual(20);
          expect(within20, workload + ': fewer than 70% within 20%')
            .toBeGreaterThanOrEqual(70);
        }
      }
      expect(historical.rows.every(r => !!r.targetReleaseDate && !!r.latestReferenceReleaseDate && r.latestReferenceReleaseDate < r.targetReleaseDate)).toBe(true);
    }, 120_000);
  });
});
