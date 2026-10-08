import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

export interface ComparableDeviceQuery {
  batteryMah?: number;
  manufacturer?: string;
  socVendor?: string;
  region?: string;
  displayDiagonalInches?: number;
  limit?: number;
}

export interface ComparableDeviceMatch {
  device: DeviceCorpusRecord;
  score: number;
  reasons: string[];
}

function closeness(a: number, b: number, tolerance: number) {
  const relative = Math.abs(a - b) / Math.max(Math.abs(b), 1);
  return Math.max(0, 1 - relative / tolerance);
}

export function findComparableDevices(
  corpus: DeviceCorpus,
  query: ComparableDeviceQuery,
): ComparableDeviceMatch[] {
  const matches: ComparableDeviceMatch[] = [];

  for (const device of corpus.devices) {
    let weighted = 0;
    let weightTotal = 0;
    const reasons: string[] = [];

    const capacity =
      device.variant.battery?.capacityMah ??
      device.variant.battery?.typicalCapacityMah;

    if (query.batteryMah && capacity) {
      const s = closeness(capacity, query.batteryMah, 0.35);
      weighted += s * 4;
      weightTotal += 4;
      if (s > 0.7) reasons.push('similar battery capacity');
    }

    if (query.socVendor && device.variant.soc?.vendor) {
      const same = device.variant.soc.vendor.toLowerCase() === query.socVendor.toLowerCase();
      weighted += (same ? 1 : 0) * 3;
      weightTotal += 3;
      if (same) reasons.push('same SoC vendor');
    }

    if (query.manufacturer) {
      const same = device.variant.identity.manufacturer.toLowerCase() === query.manufacturer.toLowerCase();
      weighted += (same ? 1 : 0) * 2;
      weightTotal += 2;
      if (same) reasons.push('same manufacturer');
    }

    if (query.region && device.variant.identity.region) {
      const same = device.variant.identity.region.toLowerCase().includes(query.region.toLowerCase());
      weighted += (same ? 1 : 0) * 1.5;
      weightTotal += 1.5;
      if (same) reasons.push('matching region');
    }

    if (query.displayDiagonalInches && device.display?.diagonalInches) {
      const s = closeness(device.display.diagonalInches, query.displayDiagonalInches, 0.12);
      weighted += s * 2;
      weightTotal += 2;
      if (s > 0.7) reasons.push('similar display size');
    }

    if (weightTotal === 0) continue;

    matches.push({
      device,
      score: weighted / weightTotal,
      reasons,
    });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, query.limit ?? 12));
}
