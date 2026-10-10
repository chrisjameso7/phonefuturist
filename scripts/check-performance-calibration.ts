import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestGpuStability } from '../src/lib/simulation/modules/performance-backtest';

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
