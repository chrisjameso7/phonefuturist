import chargingJson from '../../../../data/calibration/battery/charging-runtimes.json';
import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const LEGACY_CHARGING_CORPUS_VERSION =
  'legacy-charging-corpus-0.1.0';

interface RawSource {
  provider: string;
  url: string;
  kind: string;
}

interface RawReference {
  id: string;
  manufacturer: string;
  model: string;
  release_date?: string;
  battery_capacity_mah?: number;
  wired_charger_w?: number;
  full_charge_minutes?: number;
  charge_30m_percent?: number;
  primary_source: RawSource;
  secondary_sources?: RawSource[];
}

interface RawFile {
  schema_version: string;
  references: RawReference[];
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceId(source: RawSource) {
  return [
    'legacy-charging-source',
    slug(source.provider),
    slug(source.url),
  ].join('-');
}

function validPositive(
  value: number | undefined,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function buildLegacyChargingCorpus(): DeviceCorpus {
  const raw =
    chargingJson as unknown as RawFile;

  const sources =
    new Map<string, CorpusSource>();
  const devices: DeviceCorpusRecord[] = [];
  const measurements: CorpusMeasurement[] = [];

  for (const row of raw.references) {
    if (
      !row.manufacturer?.trim() ||
      !row.model?.trim()
    ) {
      continue;
    }

    const primaryId =
      sourceId(row.primary_source);

    sources.set(primaryId, {
      id: primaryId,
      publisher:
        row.primary_source.provider,
      url: row.primary_source.url,
      protocol:
        'PhoneFuturist legacy charging benchmark import',
    });

    const provenanceIds = [primaryId];

    for (
      const secondary of
      row.secondary_sources ?? []
    ) {
      const id = sourceId(secondary);
      sources.set(id, {
        id,
        publisher: secondary.provider,
        url: secondary.url,
        protocol:
          'Secondary charging provenance only; no milestone value transferred from this source',
      });
      provenanceIds.push(id);
    }

    const variantId =
      `legacy-charging-${slug(row.id)}`;

    const batteryMah =
      validPositive(
        row.battery_capacity_mah,
      )
        ? row.battery_capacity_mah
        : undefined;

    const chargerWatts =
      validPositive(
        row.wired_charger_w,
      )
        ? row.wired_charger_w
        : undefined;

    devices.push({
      variant: {
        id: variantId,
        identity: {
          manufacturer:
            row.manufacturer,
          family: row.model,
          modelName: row.model,
        },
        ...(batteryMah !== undefined
          ? {
              battery: {
                capacityMah:
                  batteryMah,
              },
            }
          : {}),
        notes: [
          'Migrated from the 2025-2026 legacy charging calibration dataset.',
          'wired_charger_w is retained as tested/reference charger power and is not relabeled as the manufacturer advertised maximum.',
        ],
      },
      releaseDate:
        row.release_date,
      ...(chargerWatts !== undefined
        ? {
            charging: {
              referenceWiredWatts:
                chargerWatts,
            },
          }
        : {}),
      sourceIds: [
        ...new Set(
          provenanceIds,
        ),
      ],
    });

    if (
      validPositive(
        row.full_charge_minutes,
      )
    ) {
      measurements.push({
        id:
          `${variantId}-full-charge`,
        deviceVariantId:
          variantId,
        workload: 'charging',
        metric:
          'wiredFullChargeMinutes',
        value:
          row.full_charge_minutes,
        unit: 'minutes',
        sourceId: primaryId,
        evidenceKind: 'measured',
        ...(chargerWatts !== undefined
          ? {
              testChargerWatts:
                chargerWatts,
            }
          : {}),
        notes: [
          'Primary milestone imported from the legacy charging dataset. Secondary source links are provenance only unless they carry their own measurement row elsewhere.',
        ],
      });
    }

    if (
      row.charge_30m_percent !==
        undefined &&
      Number.isFinite(
        row.charge_30m_percent,
      ) &&
      row.charge_30m_percent >= 0 &&
      row.charge_30m_percent <= 100
    ) {
      measurements.push({
        id:
          `${variantId}-charge-30m`,
        deviceVariantId:
          variantId,
        workload: 'charging',
        metric: 'charge30mPercent',
        value:
          row.charge_30m_percent,
        unit: 'percent',
        sourceId: primaryId,
        evidenceKind: 'measured',
        ...(chargerWatts !== undefined
          ? {
              testChargerWatts:
                chargerWatts,
            }
          : {}),
      });
    }
  }

  return {
    version:
      LEGACY_CHARGING_CORPUS_VERSION,
    sources: [
      ...sources.values(),
    ],
    devices,
    measurements,
  };
}
