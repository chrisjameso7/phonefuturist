import type { DeviceCorpus } from './device-corpus';
import { buildLegacyWorkloadCorpus } from './legacy-workload-corpus';
import { buildLegacyChargingCorpus } from './legacy-charging-corpus';
import { buildBrandExpansionCorpus } from './brand-expansion-corpus';
import { buildCurrentGenerationCorpus } from './current-generation-corpus';
import { mergeDeviceCorpora } from './corpus-merge';
import { buildChargingModeCorpus } from './charging-mode-corpus';
import { buildCameraReferenceCorpus } from './camera-reference-corpus';
import { buildCameraOutcomeCorpus } from './camera-outcome-corpus';
import { buildPerformanceReferenceCorpus } from './performance-reference-corpus';
import { enrichCorpusWithBatteryEnergyEvidence } from './battery-energy-evidence';

export const CALIBRATION_REGISTRY_VERSION = 'calibration-registry-0.3.0';

let cached: DeviceCorpus | undefined;

export function buildCalibrationRegistry(): DeviceCorpus {
  if (cached) return cached;

  const merged = mergeDeviceCorpora(
    [
      buildLegacyWorkloadCorpus(),
      buildLegacyChargingCorpus(),
      buildBrandExpansionCorpus(),
      buildCurrentGenerationCorpus(),
      buildChargingModeCorpus(),
      buildCameraReferenceCorpus(),
      buildCameraOutcomeCorpus(),
      buildPerformanceReferenceCorpus(),
    ],
    CALIBRATION_REGISTRY_VERSION,
  );

  cached =
    enrichCorpusWithBatteryEnergyEvidence(
      merged.corpus,
    ).corpus;
  return cached;
}

export function clearCalibrationRegistryCache() {
  cached = undefined;
}
