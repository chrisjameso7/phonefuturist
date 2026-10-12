import batteryDevicesJson from '../../../../data/calibration/battery/devices.json';
import type {
  CorpusSource,
  DeviceCorpus,
} from './device-corpus';

export const BATTERY_ENERGY_EVIDENCE_VERSION =
  'battery-energy-evidence-0.1.0';

interface RawBatteryEvidenceSource {
  id: string;
  type: string;
  title: string;
  url: string;
  accessed_at?: string;
}

interface RawBatteryEvidenceDevice {
  id: string;
  manufacturer: string;
  model: string;
  battery: {
    typical_capacity_mah: number | null;
    minimum_capacity_mah: number | null;
    rated_capacity_mah: number | null;
    typical_energy_wh: number | null;
    rated_energy_wh: number | null;
    nominal_voltage_v: number | null;
    cell_configuration: string | null;
    chemistry: string | null;
  };
  sources: RawBatteryEvidenceSource[];
  notes?: string[];
}

interface RawBatteryEvidenceFile {
  schema_version: string;
  devices: RawBatteryEvidenceDevice[];
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function key(manufacturer: string, model: string) {
  return `${normalize(manufacturer)}|${normalize(model)}`;
}

function positive(value: number | null | undefined): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function sourceRecord(
  source: RawBatteryEvidenceSource,
): CorpusSource {
  return {
    id: `battery-energy-${source.id}`,
    publisher: 'Accepted battery evidence',
    url: source.url,
    protocol: source.type,
    accessedDate: source.accessed_at,
  };
}

function inferredCellCount(
  label: string | null,
) {
  if (!label) return undefined;
  const value = label.toLowerCase();
  if (value.includes('dual-cell') || value.includes('two cell')) {
    return 2;
  }
  if (value.includes('single-cell') || value.includes('one cell')) {
    return 1;
  }
  return undefined;
}

export interface BatteryEnergyEnrichmentResult {
  corpus: DeviceCorpus;
  enrichedVariantIds: string[];
  unmatchedEvidenceIds: string[];
}

export function enrichCorpusWithBatteryEnergyEvidence(
  corpus: DeviceCorpus,
): BatteryEnergyEnrichmentResult {
  const raw =
    batteryDevicesJson as unknown as RawBatteryEvidenceFile;

  const byIdentity = new Map(
    raw.devices.map((device) => [
      key(device.manufacturer, device.model),
      device,
    ]),
  );

  const matchedEvidenceIds = new Set<string>();
  const enrichedVariantIds: string[] = [];
  const addedSources = new Map<string, CorpusSource>();

  const devices = corpus.devices.map((device) => {
    const identity = device.variant.identity;
    const evidence =
      byIdentity.get(
        key(
          identity.manufacturer,
          identity.modelName,
        ),
      ) ??
      byIdentity.get(
        key(
          identity.manufacturer,
          identity.family,
        ),
      );

    if (!evidence) return device;

    matchedEvidenceIds.add(evidence.id);
    enrichedVariantIds.push(device.variant.id);

    for (const source of evidence.sources) {
      const mapped = sourceRecord(source);
      addedSources.set(mapped.id, mapped);
    }

    const existingBattery =
      device.variant.battery ?? {};

    const battery = {
      ...existingBattery,
      ...(positive(evidence.battery.typical_capacity_mah) &&
      existingBattery.typicalCapacityMah === undefined
        ? {
            typicalCapacityMah:
              evidence.battery.typical_capacity_mah,
          }
        : {}),
      ...(positive(evidence.battery.rated_capacity_mah) &&
      existingBattery.ratedCapacityMah === undefined
        ? {
            ratedCapacityMah:
              evidence.battery.rated_capacity_mah,
          }
        : {}),
      ...(positive(evidence.battery.typical_energy_wh)
        ? {
            typicalEnergyWh:
              evidence.battery.typical_energy_wh,
          }
        : {}),
      ...(positive(evidence.battery.rated_energy_wh)
        ? {
            ratedEnergyWh:
              evidence.battery.rated_energy_wh,
          }
        : {}),
      ...(positive(evidence.battery.nominal_voltage_v)
        ? {
            nominalVoltageV:
              evidence.battery.nominal_voltage_v,
          }
        : {}),
      ...(evidence.battery.chemistry &&
      !existingBattery.chemistry
        ? {
            chemistry:
              evidence.battery.chemistry,
          }
        : {}),
      ...(evidence.battery.cell_configuration &&
      !existingBattery.configurationLabel
        ? {
            configurationLabel:
              evidence.battery.cell_configuration,
          }
        : {}),
      ...(existingBattery.cellCount === undefined &&
      inferredCellCount(
        evidence.battery.cell_configuration,
      ) !== undefined
        ? {
            cellCount:
              inferredCellCount(
                evidence.battery.cell_configuration,
              ),
          }
        : {}),
    };

    const evidenceSourceIds =
      evidence.sources.map(
        (source) =>
          `battery-energy-${source.id}`,
      );

    return {
      ...device,
      variant: {
        ...device.variant,
        battery,
        notes: [
          ...(device.variant.notes ?? []),
          'Battery energy/voltage metadata enriched from the accepted battery evidence dataset. Typical and rated energy remain distinct.',
        ],
      },
      sourceIds: [
        ...new Set([
          ...(device.sourceIds ?? []),
          ...evidenceSourceIds,
        ]),
      ],
    };
  });

  return {
    corpus: {
      ...corpus,
      sources: [
        ...corpus.sources,
        ...[...addedSources.values()].filter(
          (source) =>
            !corpus.sources.some(
              (existing) =>
                existing.id === source.id,
            ),
        ),
      ],
      devices,
    },
    enrichedVariantIds,
    unmatchedEvidenceIds:
      raw.devices
        .filter(
          (device) =>
            !matchedEvidenceIds.has(device.id),
        )
        .map((device) => device.id),
  };
}
