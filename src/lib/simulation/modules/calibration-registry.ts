import type { DeviceCorpus } from './device-corpus';
import { buildLegacyWorkloadCorpus } from './legacy-workload-corpus';
import { buildBrandExpansionCorpus } from './brand-expansion-corpus';
import { buildCurrentGenerationCorpus } from './current-generation-corpus';
import { mergeDeviceCorpora } from './corpus-merge';
import { buildChargingModeCorpus } from './charging-mode-corpus';
import { buildCameraReferenceCorpus } from './camera-reference-corpus';

export const CALIBRATION_REGISTRY_VERSION = 'calibration-registry-0.1.0';

let cached: DeviceCorpus | undefined;

export function buildCalibrationRegistry(): DeviceCorpus {
  if (cached) return cached;

  const merged = mergeDeviceCorpora(
    [
      buildLegacyWorkloadCorpus(),
      buildBrandExpansionCorpus(),
      buildCurrentGenerationCorpus(),
      buildChargingModeCorpus(),
      buildCameraReferenceCorpus(),
    ],
    CALIBRATION_REGISTRY_VERSION,
  );

  cached = merged.corpus;
  return cached;
}

export function clearCalibrationRegistryCache() {
  cached = undefined;
}
