import type {
  DeviceCorpus,
} from './device-corpus';
import {
  mergeDeviceCorpora,
} from './corpus-merge';
import {
  buildTechApiDeviceCatalog,
} from './techapi-device-catalog';
import {
  buildGsmArenaCurrentIdentityCorpus,
} from './gsmarena-current-identity-corpus';

export const EXPANDED_DEVICE_CATALOG_VERSION =
  'expanded-device-catalog-0.1.0';

export interface ExpandedDeviceCatalogStats {
  rawDeviceRecords: number;
  sourceCount: number;
  measurementCount: number;
}

export function buildExpandedDeviceCatalog(): DeviceCorpus {
  return mergeDeviceCorpora(
    [
      buildTechApiDeviceCatalog(),
      buildGsmArenaCurrentIdentityCorpus(),
    ],
    EXPANDED_DEVICE_CATALOG_VERSION,
  ).corpus;
}

export function expandedDeviceCatalogStats():
  ExpandedDeviceCatalogStats {
  const corpus =
    buildExpandedDeviceCatalog();

  return {
    rawDeviceRecords:
      corpus.devices.length,
    sourceCount:
      corpus.sources.length,
    measurementCount:
      corpus.measurements.length,
  };
}
