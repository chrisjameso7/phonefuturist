import batchAJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-a.json';
import batchBJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-b.json';
import batchCJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-c.json';
import batchDJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-d.json';
import batchEJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-e.json';
import batchEJson from '../../../../data/calibration/gsmarena-current-catalog-2026-10-batch-e.json';
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
    batchEJson,
    batchEJson,
  ].map((batch) =>
    buildBulkDeviceIdentityCorpus(
      batch as unknown as BulkDeviceIdentityFile,
    ),
  );

  const sources = new Map(
    corpora
      .flatMap(
        (corpus) => corpus.sources,
      )
      .map((source) => [
        source.id,
        source,
      ]),
  );

  const devices = new Map(
    corpora
      .flatMap(
        (corpus) => corpus.devices,
      )
      .map((device) => [
        device.variant.id,
        device,
      ]),
  );

  return {
    version: GSM_ARENA_CURRENT_IDENTITY_VERSION,
    sources: [...sources.values()],
    devices: [...devices.values()],
    measurements: [],
  };
}
