import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestGpuStability } from '../src/lib/simulation/modules/performance-backtest';
import { backtestPeakPerformance } from '../src/lib/simulation/modules/peak-performance-backtest';

const corpus = buildCalibrationRegistry();
const result = backtestGpuStability(corpus);

console.log('');
console.log('Interactive Leaks Sustained GPU Calibration');
console.log('-------------------------------------------');
console.log(`Evaluated devices: ${result.evaluatedDevices}`);
console.log(`Skipped devices:   ${result.skippedDevices}`);
console.log(
  `MAE:               ${result.maePoints?.toFixed(2) ?? 'n/a'} percentage points`,
);

if (result.worstMisses.length) {
  console.log('');
  console.log('Worst sustained-GPU misses');

  for (const row of result.worstMisses) {
    console.log(
      `  ${row.deviceVariantId} · actual ${row.actualPercent.toFixed(1)}% · predicted ${row.predictedPercent.toFixed(1)}% · error ${row.absoluteErrorPoints.toFixed(1)} pts · ${row.referenceCount} used · scope ${row.evidenceScope} · same-family ${row.sameSocFamilyReferences} · same-vendor ${row.sameSocVendorReferences} · similarity ${(row.averageSimilarity * 100).toFixed(0)}% · coverage ${(row.averageCoverage * 100).toFixed(0)}%`,
    );
  }
}

if (result.evaluatedDevices < 4) {
  console.warn('');
  console.warn(
    'WARN: Sustained GPU calibration sample is still too small for a hard quality gate.',
  );
} else {
  console.log('');
  console.log(
    'INFO: Sustained GPU evidence is active. Keep this diagnostic until the corpus spans more devices and protocol families.',
  );
}


const peak = backtestPeakPerformance(corpus);

console.log('');
console.log('Interactive Leaks Peak Benchmark Calibration');
console.log('-------------------------------------------');
console.log(
  `Evaluated measurements: ${peak.evaluatedMeasurements}`,
);
console.log(
  `MAE:                   ${peak.maePoints?.toFixed(1) ?? 'n/a'} points`,
);
console.log(
  `MAPE:                  ${peak.mapePercent?.toFixed(2) ?? 'n/a'}%`,
);
console.log(
  `Median APE:            ${peak.medianAbsolutePercentError?.toFixed(2) ?? 'n/a'}%`,
);

if (peak.rows.length) {
  console.log('');
  console.log('Worst peak-benchmark misses');

  for (const row of [...peak.rows]
    .sort(
      (a, b) =>
        b.absolutePercentError -
        a.absolutePercentError,
    )
    .slice(0, 8)) {
    console.log(
      `  ${row.domain} · ${row.deviceVariantId} · actual ${row.actual.toFixed(0)} · predicted ${row.predicted.toFixed(0)} · error ${row.absolutePercentError.toFixed(1)}% · ${row.referenceCount} refs · scope ${row.evidenceScope ?? 'unknown'}`,
    );
  }
}

if (peak.evaluatedMeasurements < 8) {
  console.warn('');
  console.warn(
    'WARN: Peak benchmark calibration sample is still small. Keep the scorecard diagnostic rather than enforcing an arbitrary error threshold.',
  );
} else {
  console.log('');
  console.log(
    'INFO: Peak benchmark leave-one-out validation is active. No arbitrary pass/fail error threshold is enforced yet; expand the corpus first.',
  );
}
