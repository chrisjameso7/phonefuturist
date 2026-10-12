import batchAJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-a.json';
import {
  buildBulkDeviceIdentityCorpus,
  type BulkDeviceIdentityFile,
} from './bulk-device-identity-corpus';
import type { DeviceCorpus } from './device-corpus';

export const GSM_ARENA_CURRENT_IDENTITY_VERSION =
  'gsmarena-current-identity-0.1.0';

export function buildGsmArenaCurrentIdentityCorpus(): DeviceCorpus {
  return buildBulkDeviceIdentityCorpus(
    batchAJson as unknown as BulkDeviceIdentityFile,
  );
}
