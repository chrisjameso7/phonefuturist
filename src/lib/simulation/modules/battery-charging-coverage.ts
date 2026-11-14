import type { DeviceCorpus } from './device-corpus';

export const BATTERY_CHARGING_COVERAGE_VERSION =
  'battery-charging-coverage-0.1.0';

export interface CoverageBucket {
  label: string;
  devices: number;
  measuredChargingDevices: number;
  measuredRuntimeDevices: number;
}

export interface BatteryChargingCoverageReport {
  version: string;
  totals: {
    devices: number;
    withBatteryCapacity: number;
    withBatteryChemistry: number;
    withWiredChargingWatts: number;
    withCellArchitecture: number;
    withChargingMeasurements: number;
    withRuntimeMeasurements: number;
  };
  brands: CoverageBucket[];
  batteryBands: CoverageBucket[];
  chargingBands: CoverageBucket[];
  gaps: string[];
}

function capacityOf(device: DeviceCorpus['devices'][number]) {
  return (
    device.variant.battery?.capacityMah ??
    device.variant.battery?.typicalCapacityMah
  );
}

function band(value: number, stops: number[], suffix: string) {
  for (let i = 0; i < stops.length; i += 1) {
    if (value <= stops[i]) {
      const low = i === 0 ? 0 : stops[i - 1] + 1;
      return `${low}-${stops[i]}${suffix}`;
    }
  }
  return `>${stops.at(-1)}${suffix}`;
}

function buildBuckets(
  corpus: DeviceCorpus,
  labelFor: (device: DeviceCorpus['devices'][number]) => string | undefined,
) {
  const map = new Map<string, Set<string>>();
  const charging = new Map<string, Set<string>>();
  const runtime = new Map<string, Set<string>>();

  for (const device of corpus.devices) {
    const label = labelFor(device);
    if (!label) continue;

    const devices = map.get(label) ?? new Set<string>();
    devices.add(device.variant.id);
    map.set(label, devices);

    const hasCharging = corpus.measurements.some(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        measurement.workload === 'charging',
    );
    if (hasCharging) {
      const set = charging.get(label) ?? new Set<string>();
      set.add(device.variant.id);
      charging.set(label, set);
    }

    const hasRuntime = corpus.measurements.some(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        ['web_browsing', 'video_playback', 'gaming'].includes(
          measurement.workload,
        ),
    );
    if (hasRuntime) {
      const set = runtime.get(label) ?? new Set<string>();
      set.add(device.variant.id);
      runtime.set(label, set);
    }
  }

  return [...map.entries()]
    .map(([label, devices]) => ({
      label,
      devices: devices.size,
      measuredChargingDevices: charging.get(label)?.size ?? 0,
      measuredRuntimeDevices: runtime.get(label)?.size ?? 0,
    }))
    .sort((a, b) => b.devices - a.devices || a.label.localeCompare(b.label));
}

export function buildBatteryChargingCoverageReport(
  corpus: DeviceCorpus,
): BatteryChargingCoverageReport {
  const withCharging = new Set(
    corpus.measurements
      .filter((m) => m.workload === 'charging')
      .map((m) => m.deviceVariantId),
  );

  const withRuntime = new Set(
    corpus.measurements
      .filter((m) =>
        ['web_browsing', 'video_playback', 'gaming'].includes(m.workload),
      )
      .map((m) => m.deviceVariantId),
  );

  const totals = {
    devices: corpus.devices.length,
    withBatteryCapacity: corpus.devices.filter((d) => capacityOf(d)).length,
    withBatteryChemistry: corpus.devices.filter(
      (d) => Boolean(d.variant.battery?.chemistry),
    ).length,
    withWiredChargingWatts: corpus.devices.filter(
      (d) => Boolean(d.charging?.advertisedWiredWatts),
    ).length,
    withCellArchitecture: corpus.devices.filter(
      (d) =>
        d.charging?.cellArchitecture !== undefined &&
        d.charging.cellArchitecture !== 'unknown',
    ).length,
    withChargingMeasurements: withCharging.size,
    withRuntimeMeasurements: withRuntime.size,
  };

  const brands = buildBuckets(
    corpus,
    (device) => device.variant.identity.manufacturer,
  );

  const batteryBands = buildBuckets(corpus, (device) => {
    const capacity = capacityOf(device);
    return capacity
      ? band(capacity, [4500, 5000, 5500, 6000, 7000], 'mAh')
      : undefined;
  });

  const chargingBands = buildBuckets(corpus, (device) => {
    const watts = device.charging?.advertisedWiredWatts;
    return watts
      ? band(watts, [25, 45, 60, 80, 100, 150, 200], 'W')
      : undefined;
  });

  const gaps: string[] = [];

  for (const row of brands) {
    if (row.devices >= 2 && row.measuredChargingDevices === 0) {
      gaps.push(`${row.label}: no measured charging devices`);
    }
    if (row.devices >= 2 && row.measuredRuntimeDevices === 0) {
      gaps.push(`${row.label}: no measured battery-runtime devices`);
    }
  }

  for (const row of chargingBands) {
    if (row.devices >= 2 && row.measuredChargingDevices < 2) {
      gaps.push(
        `${row.label}: fewer than two measured charging references`,
      );
    }
  }

  if (totals.withBatteryChemistry < totals.devices * 0.5) {
    gaps.push('Battery chemistry is missing for more than half of devices.');
  }

  if (totals.withCellArchitecture < totals.devices * 0.5) {
    gaps.push(
      'Charging cell architecture is missing for more than half of devices.',
    );
  }

  return {
    version: BATTERY_CHARGING_COVERAGE_VERSION,
    totals,
    brands,
    batteryBands,
    chargingBands,
    gaps,
  };
}
