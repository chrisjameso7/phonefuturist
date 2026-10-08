import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

export interface ComparableDeviceQuery {
  batteryMah?: number;
  batteryChemistry?: string;
  manufacturer?: string;
  socVendor?: string;
  region?: string;
  displayDiagonalInches?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  refreshRateHz?: number;
  wiredChargingWatts?: number;
  wirelessChargingWatts?: number;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
  thicknessMm?: number;
  weightG?: number;
  bodyVolumeMm3?: number;
  coolingClass?: NonNullable<DeviceCorpusRecord['cooling']>['class'];
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

function bodyVolume(device: DeviceCorpusRecord) {
  const d = device.dimensions;
  if (!d?.widthMm || !d.heightMm || !d.thicknessMm) return undefined;
  return d.widthMm * d.heightMm * d.thicknessMm;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
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
      const s = closeness(capacity, query.batteryMah, 0.3);
      weighted += s * 4;
      weightTotal += 4;
      if (s > 0.75) reasons.push('similar battery capacity');
    }

    if (query.batteryChemistry && device.variant.battery?.chemistry) {
      const same =
        normalize(device.variant.battery.chemistry) ===
        normalize(query.batteryChemistry);
      weighted += (same ? 1 : 0) * 2.5;
      weightTotal += 2.5;
      if (same) reasons.push('same battery chemistry');
    }

    if (query.socVendor && device.variant.soc?.vendor) {
      const same =
        normalize(device.variant.soc.vendor) === normalize(query.socVendor);
      weighted += (same ? 1 : 0) * 3;
      weightTotal += 3;
      if (same) reasons.push('same SoC vendor');
    }

    if (query.manufacturer) {
      const same =
        normalize(device.variant.identity.manufacturer) ===
        normalize(query.manufacturer);
      weighted += (same ? 1 : 0) * 2;
      weightTotal += 2;
      if (same) reasons.push('same manufacturer');
    }

    if (query.region && device.variant.identity.region) {
      const same = normalize(device.variant.identity.region).includes(
        normalize(query.region),
      );
      weighted += (same ? 1 : 0) * 1.5;
      weightTotal += 1.5;
      if (same) reasons.push('matching region');
    }

    if (query.displayDiagonalInches && device.display?.diagonalInches) {
      const s = closeness(
        device.display.diagonalInches,
        query.displayDiagonalInches,
        0.1,
      );
      weighted += s * 2;
      weightTotal += 2;
      if (s > 0.75) reasons.push('similar display size');
    }

    if (query.resolutionWidthPx && device.display?.resolutionWidthPx) {
      const s = closeness(
        device.display.resolutionWidthPx,
        query.resolutionWidthPx,
        0.22,
      );
      weighted += s * 1;
      weightTotal += 1;
      if (s > 0.8) reasons.push('similar display resolution');
    }

    if (query.resolutionHeightPx && device.display?.resolutionHeightPx) {
      const s = closeness(
        device.display.resolutionHeightPx,
        query.resolutionHeightPx,
        0.22,
      );
      weighted += s * 1;
      weightTotal += 1;
      if (s > 0.8 && !reasons.includes('similar display resolution')) {
        reasons.push('similar display resolution');
      }
    }

    if (query.refreshRateHz && device.display?.refreshRateHz) {
      const s = closeness(device.display.refreshRateHz, query.refreshRateHz, 0.35);
      weighted += s * 1.5;
      weightTotal += 1.5;
      if (s > 0.85) reasons.push('similar refresh rate');
    }

    if (query.wiredChargingWatts && device.charging?.advertisedWiredWatts) {
      const s = closeness(
        device.charging.advertisedWiredWatts,
        query.wiredChargingWatts,
        0.55,
      );
      weighted += s * 1.5;
      weightTotal += 1.5;
      if (s > 0.75) reasons.push('similar wired charging class');
    }

    if (
      query.wirelessChargingWatts &&
      device.charging?.advertisedWirelessWatts
    ) {
      const s = closeness(
        device.charging.advertisedWirelessWatts,
        query.wirelessChargingWatts,
        0.6,
      );
      weighted += s * 0.75;
      weightTotal += 0.75;
      if (s > 0.75) reasons.push('similar wireless charging class');
    }

    if (query.cellArchitecture && device.charging?.cellArchitecture) {
      const same = device.charging.cellArchitecture === query.cellArchitecture;
      weighted += (same ? 1 : 0) * 2.25;
      weightTotal += 2.25;
      if (same) reasons.push('same charging cell architecture');
    }

    if (query.thicknessMm && device.dimensions?.thicknessMm) {
      const s = closeness(device.dimensions.thicknessMm, query.thicknessMm, 0.18);
      weighted += s * 1.5;
      weightTotal += 1.5;
      if (s > 0.8) reasons.push('similar chassis thickness');
    }

    if (query.weightG && device.dimensions?.weightG) {
      const s = closeness(device.dimensions.weightG, query.weightG, 0.25);
      weighted += s * 1;
      weightTotal += 1;
      if (s > 0.8) reasons.push('similar device mass');
    }

    const volume = bodyVolume(device);
    if (query.bodyVolumeMm3 && volume) {
      const s = closeness(volume, query.bodyVolumeMm3, 0.28);
      weighted += s * 2;
      weightTotal += 2;
      if (s > 0.75) reasons.push('similar body volume');
    }

    if (query.coolingClass && device.cooling?.class) {
      const same = device.cooling.class === query.coolingClass;
      weighted += (same ? 1 : 0) * 2.5;
      weightTotal += 2.5;
      if (same) reasons.push('same cooling class');
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
