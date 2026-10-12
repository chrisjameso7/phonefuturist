import batchAJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-a.json';
import batchBJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-b.json';
import batchCJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-c.json';
import batchDJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-d.json';
import {
  buildBulkDeviceIdentityCorpus,
  type BulkDeviceIdentityFile,
} from './bulk-device-identity-corpus';
import type { DeviceCorpus } from './device-corpus';

export const GSM_ARENA_CURRENT_IDENTITY_VERSION =
  'gsmarena-current-identity-0.1.0';

export function buildGsmArenaCurrentIdentityCorpus(): DeviceCorpus {
  const corpora = [
    batchAJson,
    batchBJson,
    batchCJson,
    batchDJson,
  ].map((batch) =>
    buildBulkDeviceIdentityCorpus(
      batch as unknown as BulkDeviceIdentityFile,
    ),
  );

  return {
    version: GSM_ARENA_CURRENT_IDENTITY_VERSION,
    sources: corpora.flatMap(
      (corpus) => corpus.sources,
    ),
    devices: corpora.flatMap(
      (corpus) => corpus.devices,
    ),
    measurements: [],
  };
}
