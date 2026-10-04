import measurements from '../../../data/calibration/battery/measurements.json';
import { createBatteryEvidenceSnapshotFromDevice } from './evidence-snapshot';
import { type VirtualEvidenceCatalog } from './virtual-device-evidence';

/** Reuses the legacy reference derivation; never treats derived watts as a measurement.
 * No reference source is promoted to evidence about the configured unreleased device.
 * Held-out validation observations are deliberately excluded.
 */
export function createBatteryVirtualEvidenceCatalog(): VirtualEvidenceCatalog {
  const legacy = createBatteryEvidenceSnapshotFromDevice({});
  const records: VirtualEvidenceCatalog['records'] = [];
  for (const reference of legacy.references) {
    for (const measurementId of reference.measurementIds) {
      const measurement = measurements.measurements.find(m => m.id === measurementId && m.dataset_role === 'calibration' && m.calibration_eligibility === 'eligible');
      if (!measurement) continue;
      records.push({ id: `legacy-power:${measurementId}`, revision: 1, subjectId: reference.id,
        key: 'battery.averagePower', unit: 'W', range: { min: reference.screenOnPowerW, max: reference.screenOnPowerW },
        status: 'derived', lineage: 'evidence',
        source: { title: `${measurement.source.title}; derived pack Wh / reported runtime hours (legacy calibration ${legacy.powerEvidenceVersion}); battery energy provenance requires review before new analogy approval`,
          url: measurement.source.url, retrievedAt: `${measurement.source.accessed_at}T00:00:00Z` },
        conditions: { protocol: legacy.protocol.id, version: legacy.protocol.version, workload: legacy.protocol.workload,
          brightnessNits: legacy.protocol.brightnessNits, network: 'wifi' },
      });
    }
  }
  // No reviewed whole-device analogy policies exist yet. Do not infer them from brand names.
  return { version: `legacy-battery-${legacy.powerEvidenceVersion}`, records, relationships: [], policies: [] };
}
