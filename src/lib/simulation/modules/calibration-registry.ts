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
import { buildGsmArenaCurrentIdentityCorpus } from './gsmarena-current-identity-corpus';
import { buildTechApiDeviceCatalog } from './techapi-device-catalog';
import { buildPhoneArenaCurrentBatteryCorpus } from './phonearena-current-battery-corpus';
import { buildPhoneArenaCurrentChargingCorpus } from './phonearena-current-charging-corpus';
import { buildGsmaBatteryV2ReferenceCorpus } from './gsmarena-battery-v2-reference-corpus';
import { buildGeekerwanSocCorpus } from './geekerwan-soc-corpus';
import { buildGeekerwanBatteryCorpus } from './geekerwan-battery-corpus';
import { buildGeekerwanChargingCurveCorpus } from './geekerwan-charging-curve-corpus';
import { buildNanoReviewSocCorpus } from './nanoreview-soc-corpus';
import { buildDxomarkCurrentBatteryCorpus } from './dxomark-current-battery-corpus';

export const CALIBRATION_REGISTRY_VERSION = 'calibration-registry-0.11.0';

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
      buildTechApiDeviceCatalog(),
      buildPhoneArenaCurrentBatteryCorpus(),
      buildPhoneArenaCurrentChargingCorpus(),
      buildGsmaBatteryV2ReferenceCorpus(),
      buildGeekerwanSocCorpus(),
      buildGeekerwanBatteryCorpus(),
      buildGeekerwanChargingCurveCorpus(),
      buildNanoReviewSocCorpus(),
      buildDxomarkCurrentBatteryCorpus(),
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
