import { buildCalibrationRegistry } from './modules/calibration-registry';
import { buildBatteryChargingCoverageReport } from './modules/battery-charging-coverage';
import { validateChargingEvidence } from './modules/charging-evidence-validator';

export const BATTERY_CHARGING_AUDIT_VERSION = 'battery-charging-audit-0.1.0';

export function auditLiveBatteryChargingCorpus() {
  const corpus = buildCalibrationRegistry();

  return {
    version: BATTERY_CHARGING_AUDIT_VERSION,
    corpusVersion: corpus.version,
    coverage: buildBatteryChargingCoverageReport(corpus),
    evidenceIssues: validateChargingEvidence(corpus),
  };
}
