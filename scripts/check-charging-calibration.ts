import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { buildLegacyChargingCorpus } from '../src/lib/simulation/modules/legacy-charging-corpus';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestChargingCorpus } from '../src/lib/simulation/modules/charging-backtest';

const corpus = buildChargingModeCorpus();
const result = backtestChargingCorpus(corpus);

const broad = buildLegacyChargingCorpus();
const unified = buildCalibrationRegistry();

const broadBrands = new Set(
  broad.devices.map(
    (device) =>
      device.variant.identity.manufacturer,
  ),
);

const broadMeasuredDevices = new Set(
  broad.measurements.map(
    (measurement) =>
      measurement.deviceVariantId,
  ),
);

const broadPublishers = new Set(
  broad.sources.map(
    (source) => source.publisher,
  ),
);

const broadFullChargeRows =
  broad.measurements.filter(
    (measurement) =>
      measurement.metric ===
      'wiredFullChargeMinutes',
  ).length;

const broadP30Rows =
  broad.measurements.filter(
    (measurement) =>
      measurement.metric ===
      'charge30mPercent',
  ).length;

const unifiedChargingRows =
  unified.measurements.filter(
    (measurement) =>
      measurement.workload ===
      'charging' &&
      measurement.evidenceKind ===
      'measured',
  );

console.log('');
console.log('Charging Corpus Coverage');
console.log('------------------------');
console.log(
  `Broad 2025–2026 references: ${broad.devices.length}`,
);
console.log(
  `Devices with measured charging rows: ${broadMeasuredDevices.size}`,
);
console.log(
  `Brands represented: ${broadBrands.size}`,
);
console.log(
  `Primary/secondary publishers represented in provenance: ${broadPublishers.size}`,
);
console.log(
  `Measured full-charge rows: ${broadFullChargeRows}`,
);
console.log(
  `Measured 30-minute rows: ${broadP30Rows}`,
);
console.log(
  `Unified-registry measured charging rows: ${unifiedChargingRows.length}`,
);
console.log(
  `Unified calibration registry: ${unified.version}`,
);

if (
  broad.devices.length < 100 ||
  broadBrands.size < 15 ||
  broadFullChargeRows < 100 ||
  broadP30Rows < 100
) {
  console.error('');
  console.error(
    'FAIL: Broad charging corpus coverage fell below the minimum expected beta baseline.',
  );
  process.exitCode = 1;
}



function format(value: number | undefined, digits = 1) {
  return value === undefined ? 'n/a' : value.toFixed(digits);
}

console.log('');
console.log('Interactive Leaks Charging Calibration Backtest');
console.log('------------------------------------------------');
console.log(`Health:       ${result.health}`);
console.log(`Evaluated:    ${result.evaluatedModes}`);
console.log(`Skipped:      ${result.skippedModes}`);
console.log(`Coverage:     ${format(result.coveragePercent)}%`);
console.log(`MAE:          ${format(result.maeMinutes)} min`);
console.log(`MAPE:         ${format(result.mapePercent)}%`);

if (result.worstMisses.length > 0) {
  console.log('');
  console.log('Worst misses');

  for (const row of result.worstMisses) {
    console.log(
      `  ${row.deviceVariantId} · ${row.testChargerWatts} W · ` +
      `${row.chargingStandard ?? 'unknown standard'} · ` +
      `actual ${format(row.actualFullChargeMinutes)} min · ` +
      `predicted ${format(row.predictedFullChargeMinutes)} min · ` +
      `error ${format(row.absolutePercentageError)}%`,
    );
  }
}

if (result.health === 'poor') {
  console.error('');
  console.error(
    'FAIL: Charging calibration backtest is poor. ' +
      'Review corpus evidence or estimator changes before shipping.',
  );
  process.exitCode = 1;
} else if (result.health === 'borderline') {
  console.warn('');
  console.warn(
    'WARN: Charging calibration backtest is borderline. ' +
      'Verification will continue, but the model should be reviewed.',
  );
} else if (result.health === 'insufficient') {
  console.warn('');
  console.warn(
    'WARN: Charging calibration backtest has insufficient held-out modes. ' +
      'Verification will continue until the corpus is large enough for a hard gate.',
  );
} else {
  console.log('');
  console.log('PASS: Charging calibration backtest is healthy.');
}
