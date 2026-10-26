import { writeFileSync } from 'node:fs';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
import { backtestPhoneArenaSameProtocolRuntime } from '../src/lib/simulation/modules/phonearena-same-protocol-backtest';
import { backtestAgainstPhoneArenaRuntime } from '../src/lib/simulation/modules/phonearena-runtime-holdout';
import { scoreValidationCohorts, scoreValidationPairs } from '../src/lib/simulation/modules/validation-accuracy';
import { estimatePeakPerformance } from '../src/lib/simulation/modules/peak-performance-estimator';
import type { SimulationInput } from '../src/lib/simulation/types';

const corpus = buildCalibrationRegistry();
const simulation: SimulationInput = {
  formFactor: 'phone', displays: { primary: { diagonalInches: 6.7, resolutionWidthPx: 1080, resolutionHeightPx: 2400, refreshRateHz: 120 } },
  // A hypothetical configuration, with no invented voltage or target Wh.
  battery: { cells: [{ capacityMah: 5500 }] },
};
const options = { simulation, dailyUseHours: { web_browsing: 2, video_playback: 2, gaming: 1 } };
const processorSensitivity = ['Exynos 2700', 'Snapdragon 8 Elite Extreme Gen 6', 'Unknown processor'].map(socName => {
  const result = simulateBatteryExperience(corpus, { ...options, socName });
  return { socName, activeUseHours: result.mixedUse?.expectedActiveUseHoursPerCharge, workloads: result.runtimes.map(({workload, expectedHours, energyBasis}) => ({workload, expectedHours, energyBasis})) };
});
const brightnessSensitivity = [undefined, 200, 400, 800, 1200].map(brightnessNits => {
  const result = simulateBatteryExperience(corpus, { ...options, brightnessNits });
  return { brightnessNits: brightnessNits ?? 'reference', activeUseHours: result.mixedUse?.expectedActiveUseHoursPerCharge, workloads: result.runtimes.map(({workload, expectedHours, referenceExpectedHours}) => ({workload, expectedHours, referenceExpectedHours})) };
});
const peakScenarios = (['geekbench6_single','geekbench6_multi'] as const).map(domain => {
  const result = estimatePeakPerformance(corpus, { domain, socName: 'Exynos 2700', socVendor: 'Samsung' });
  return { domain, status: result.status, referenceSoc: result.referenceSocName, referenceScore: result.baselineExpected, scenarioScore: result.adjustedExpected, assumedUpliftPercent: result.assumedGenerationUpliftPercent, assumptionApplied: result.assumptionApplied, note: result.note };
});
function reportScore(score: ReturnType<typeof scoreValidationPairs>) {
  return score ? { evaluated: score.evaluated, mapePercent: score.mapePercent,
    within20Count: score.within20Percent, within20Percent: score.coverageWithin20Percent,
    meets80QualityGate: score.meets80QualityGate } : undefined;
}
function calibration(mode: 'sparse'|'spec-enriched', scheme: 'leave-one-device-out'|'past-devices-only') {
  const result = backtestPhoneArenaSameProtocolRuntime(corpus, mode, scheme);
  const pairs = result.rows.map(row => ({ observed: row.observedHours, predicted: row.predictedHours }));
  return { mode, scheme, evaluated: result.evaluatedRows, skipped: result.skippedRows, protocol: result.protocol,
    targetLeakageDetected: result.rows.some(row => row.referenceVariantIds.includes(row.deviceVariantId) || row.referenceModelKeys.includes(row.targetModelKey)),
    score: reportScore(scoreValidationPairs(pairs)),
    workloads: scoreValidationCohorts(result.rows, row => row.workload, row => ({observed: row.observedHours,predicted:row.predictedHours}),20).map(({key,score,...rest}) => ({workload:key,...rest,score:reportScore(score)})),
  };
}
const sameProtocol = [calibration('sparse','leave-one-device-out'),calibration('spec-enriched','leave-one-device-out'),calibration('sparse','past-devices-only')];
const cross = backtestAgainstPhoneArenaRuntime(corpus);
const report = {
  corpusVersion: corpus.version,
  interpretation: 'Reconstructed estimates from repository data, not new laboratory measurements. Scenario inputs are hypothetical. Error percentiles describe historical error, not calibrated prediction intervals.',
  processorSensitivity, brightnessSensitivity, peakScenarios, sameProtocol,
  crossProtocolDiagnostic: { evaluated: cross.evaluatedRows, matched: cross.protocolMatchedRows, mismatched: cross.crossProtocolRows, mapePercent: cross.mapePercent, byWorkload: cross.byWorkload, note: cross.note },
};
const outputAt = process.argv.indexOf('--output');
if (outputAt >= 0 && process.argv[outputAt+1]) writeFileSync(process.argv[outputAt+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (process.argv.includes('--enforce')) {
  const historical = sameProtocol.find(row=>row.scheme==='past-devices-only')!;
  if (!historical.score?.meets80QualityGate || historical.workloads.some(row=>!row.sufficientSample || !row.score?.meets80QualityGate)) {
    console.error('Battery accuracy gate failed: require MAPE <=20% and >=80% of predictions within 20%, overall and per supported workload.');
    process.exitCode=1;
  }
}
