import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestDisplayAwareRuntime } from '../src/lib/simulation/modules/display-runtime-backtest';

const corpus = buildCalibrationRegistry();
const result = backtestDisplayAwareRuntime(corpus);

console.log('');
console.log('Interactive Leaks Display Runtime Calibration');
console.log('---------------------------------------------');
console.log(
  `Display-enriched devices: ${result.displayEnrichedDevices}`,
);
console.log(`Evaluated rows:           ${result.evaluatedRows}`);
console.log(`Skipped rows:             ${result.skippedRows}`);

function printAggregate(
  title: string,
  aggregate: typeof result.overall,
) {
  console.log('');
  console.log(title);
  console.log(`  Rows:          ${aggregate.rows}`);
  console.log(
    `  Blind MAPE:    ${aggregate.blindMapePercent?.toFixed(2) ?? 'n/a'}%`,
  );
  console.log(
    `  Aware MAPE:    ${aggregate.awareMapePercent?.toFixed(2) ?? 'n/a'}%`,
  );
  console.log(
    `  Improvement:   ${aggregate.improvementPercent?.toFixed(2) ?? 'n/a'}%`,
  );
}

printAggregate('Overall', result.overall);
printAggregate('Web browsing', result.byWorkload.web_browsing);
printAggregate('Video playback', result.byWorkload.video_playback);
printAggregate('Gaming', result.byWorkload.gaming);

if (result.worstAwareMisses.length) {
  console.log('');
  console.log('Worst display-aware misses');

  for (const row of result.worstAwareMisses) {
    console.log(
      `  ${row.deviceVariantId} · ${row.workload} · actual ${row.actualMahPerHour.toFixed(1)} mAh/h · aware ${row.awarePredictedMahPerHour.toFixed(1)} · error ${row.awareAbsolutePercentError.toFixed(1)}% · similarity ${(row.awareSimilarity * 100).toFixed(0)}% · coverage ${(row.awareCoverage * 100).toFixed(0)}%`,
    );
  }
}

if (
  result.evaluatedRows < 18 ||
  result.displayEnrichedDevices < 7
) {
  console.warn('');
  console.warn(
    'WARN: Display runtime calibration sample is still too small for a hard quality gate.',
  );
} else if (
  result.overall.improvementPercent !== undefined &&
  result.overall.improvementPercent < 0
) {
  console.warn('');
  console.warn(
    'WARN: Display-aware matching currently performs worse than the display-blind baseline. Do not convert display workload proxies into direct battery penalties yet.',
  );
} else {
  console.log('');
  console.log(
    'PASS: Display-aware runtime matching is at least directionally competitive with the blind baseline. Keep this diagnostic until the corpus is larger.',
  );
}
