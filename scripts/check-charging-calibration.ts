import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { backtestChargingCorpus } from '../src/lib/simulation/modules/charging-backtest';

const corpus = buildChargingModeCorpus();
const result = backtestChargingCorpus(corpus);

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
