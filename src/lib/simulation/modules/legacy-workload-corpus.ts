import runtimeJson from '../../../../data/calibration/battery/workload-runtimes.json';
import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusMeasurement,
  CorpusSource,
} from './device-corpus';

type LegacyWorkload =
  | 'web_browsing'
  | 'video_playback'
  | 'gaming';

interface LegacyRuntimeMeasurement {
  device_id: string;
  manufacturer: string;
  model: string;
  release_date: string;
  capacity_mah: number;
  workload: LegacyWorkload;
  runtime_seconds: number;
  source_display_value: string;
  source_url: string;
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildLegacyWorkloadCorpus(): DeviceCorpus {
  const rows = (
    runtimeJson as unknown as { measurements: LegacyRuntimeMeasurement[] }
  ).measurements;

  const sourceByUrl = new Map<string, CorpusSource>();
  const deviceById = new Map<string, DeviceCorpusRecord>();
  const measurements: CorpusMeasurement[] = [];

  for (const row of rows) {
    if (
      !Number.isFinite(row.capacity_mah) ||
      row.capacity_mah <= 0 ||
      !Number.isFinite(row.runtime_seconds) ||
      row.runtime_seconds <= 0
    ) {
      continue;
    }

    const sourceId = `legacy-source-${slug(row.source_url)}`;
    if (!sourceByUrl.has(row.source_url)) {
      sourceByUrl.set(row.source_url, {
        id: sourceId,
        publisher: 'Legacy workload dataset source',
        url: row.source_url,
        protocol: row.workload,
      });
    }

    const variantId = `legacy-${slug(row.device_id || `${row.manufacturer}-${row.model}`)}`;

    if (!deviceById.has(variantId)) {
      deviceById.set(variantId, {
        variant: {
          id: variantId,
          identity: {
            manufacturer: row.manufacturer,
            family: row.model,
            modelName: row.model,
          },
          battery: {
            capacityMah: row.capacity_mah,
          },
          notes: [
            'Migrated from legacy workload calibration. Region, SKU, SoC and software build remain unknown until enriched.',
          ],
        },
        releaseDate: row.release_date,
        sourceIds: [sourceId],
      });
    } else {
      const record = deviceById.get(variantId)!;
      record.sourceIds ??= [];
      if (!record.sourceIds.includes(sourceId)) {
        record.sourceIds.push(sourceId);
      }
    }

    measurements.push({
      id: `${variantId}-${row.workload}-${measurements.length + 1}`,
      deviceVariantId: variantId,
      workload: row.workload,
      metric: 'runtime',
      value: row.runtime_seconds / 3600,
      unit: 'hours',
      sourceId,
      evidenceKind: 'measured',
      notes: [`Original display value: ${row.source_display_value}`],
    });
  }

  return {
    version: 'legacy-workload-corpus-0.1.0',
    sources: [...sourceByUrl.values()],
    devices: [...deviceById.values()],
    measurements,
  };
}
