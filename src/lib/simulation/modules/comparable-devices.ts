import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

export interface ComparableDeviceQuery {
  batteryMah?: number;
  batteryChemistry?: string;
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  region?: string;
  displayDiagonalInches?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  refreshRateHz?: number;
  wiredChargingWatts?: number;
  wirelessChargingWatts?: number;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell' | 'unknown';
  thicknessMm?: number;
  weightG?: number;
  bodyVolumeMm3?: number;
  coolingClass?: NonNullable<DeviceCorpusRecord['cooling']>['class'];
  limit?: number;
}

export interface ComparableDeviceMatch {
  device: DeviceCorpusRecord;
  score: number;
  similarityScore: number;
  coverageScore: number;
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


export function normalizeSocFamily(value: string) {
  return normalize(value)
    .replace(/\bfor galaxy\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findComparableDevices(
  corpus: DeviceCorpus,
  query: ComparableDeviceQuery,
): ComparableDeviceMatch[] {
  const matches: ComparableDeviceMatch[] = [];

  for (const device of corpus.devices) {
    let weighted = 0;
    let coveredWeight = 0;
    let possibleWeight = 0;
    const reasons: string[] = [];

    const capacity =
      device.variant.battery?.capacityMah ??
      device.variant.battery?.typicalCapacityMah;

    if (query.batteryMah) {
      possibleWeight += 4;
      if (capacity) {
        const s = closeness(capacity, query.batteryMah, 0.3);
        weighted += s * 4;
        coveredWeight += 4;
        if (s > 0.75) reasons.push('similar battery capacity');
      }
    }

    if (query.batteryChemistry) {
      possibleWeight += 2.5;
      if (device.variant.battery?.chemistry) {
        const same =
          normalize(device.variant.battery.chemistry) ===
          normalize(query.batteryChemistry);
        weighted += (same ? 1 : 0) * 2.5;
        coveredWeight += 2.5;
        if (same) reasons.push('same battery chemistry');
      }
    }

    if (query.socName) {
      possibleWeight += 4;

      if (device.variant.soc?.name) {
        const same =
          normalizeSocFamily(
            device.variant.soc.name,
          ) ===
          normalizeSocFamily(query.socName);

        weighted += (same ? 1 : 0) * 4;
        coveredWeight += 4;

        if (same) {
          reasons.push('same SoC family');
        }
      }
    }

    if (query.socVendor) {
      possibleWeight += 3;
      if (device.variant.soc?.vendor) {
        const same =
          normalize(device.variant.soc.vendor) ===
          normalize(query.socVendor);
        weighted += (same ? 1 : 0) * 3;
        coveredWeight += 3;
        if (same) reasons.push('same SoC vendor');
      }
    }

    if (query.manufacturer) {
      possibleWeight += 2;
      const same =
        normalize(device.variant.identity.manufacturer) ===
        normalize(query.manufacturer);
      weighted += (same ? 1 : 0) * 2;
      coveredWeight += 2;
      if (same) reasons.push('same manufacturer');
    }

    if (query.region) {
      possibleWeight += 1.5;
      if (device.variant.identity.region) {
        const same = normalize(
          device.variant.identity.region,
        ).includes(normalize(query.region));
        weighted += (same ? 1 : 0) * 1.5;
        coveredWeight += 1.5;
        if (same) reasons.push('matching region');
      }
    }

    if (query.displayDiagonalInches) {
      possibleWeight += 2;
      if (device.display?.diagonalInches) {
        const s = closeness(
          device.display.diagonalInches,
          query.displayDiagonalInches,
          0.1,
        );
        weighted += s * 2;
        coveredWeight += 2;
        if (s > 0.75) reasons.push('similar display size');
      }
    }

    if (query.resolutionWidthPx) {
      possibleWeight += 1;
      if (device.display?.resolutionWidthPx) {
        const s = closeness(
          device.display.resolutionWidthPx,
          query.resolutionWidthPx,
          0.22,
        );
        weighted += s;
        coveredWeight += 1;
        if (s > 0.8) reasons.push('similar display resolution');
      }
    }

    if (query.resolutionHeightPx) {
      possibleWeight += 1;
      if (device.display?.resolutionHeightPx) {
        const s = closeness(
          device.display.resolutionHeightPx,
          query.resolutionHeightPx,
          0.22,
        );
        weighted += s;
        coveredWeight += 1;
        if (
          s > 0.8 &&
          !reasons.includes('similar display resolution')
        ) {
          reasons.push('similar display resolution');
        }
      }
    }

    if (query.refreshRateHz) {
      possibleWeight += 1.5;
      if (device.display?.refreshRateHz) {
        const s = closeness(
          device.display.refreshRateHz,
          query.refreshRateHz,
          0.35,
        );
        weighted += s * 1.5;
        coveredWeight += 1.5;
        if (s > 0.85) reasons.push('similar refresh rate');
      }
    }

    if (query.wiredChargingWatts) {
      possibleWeight += 1.5;
      const referenceWiredWatts =
        device.charging?.advertisedWiredWatts ??
        device.charging?.referenceWiredWatts;

      if (referenceWiredWatts) {
        const s = closeness(
          referenceWiredWatts,
          query.wiredChargingWatts,
          0.55,
        );
        weighted += s * 1.5;
        coveredWeight += 1.5;
        if (s > 0.75) reasons.push('similar wired charging class');
      }
    }

    if (query.wirelessChargingWatts) {
      possibleWeight += 0.75;
      if (device.charging?.advertisedWirelessWatts) {
        const s = closeness(
          device.charging.advertisedWirelessWatts,
          query.wirelessChargingWatts,
          0.6,
        );
        weighted += s * 0.75;
        coveredWeight += 0.75;
        if (s > 0.75) reasons.push('similar wireless charging class');
      }
    }

    if (query.cellArchitecture) {
      possibleWeight += 2.25;
      if (device.charging?.cellArchitecture) {
        const same =
          device.charging.cellArchitecture ===
          query.cellArchitecture;
        weighted += (same ? 1 : 0) * 2.25;
        coveredWeight += 2.25;
        if (same) reasons.push('same charging cell architecture');
      }
    }

    if (query.thicknessMm) {
      possibleWeight += 1.5;
      if (device.dimensions?.thicknessMm) {
        const s = closeness(
          device.dimensions.thicknessMm,
          query.thicknessMm,
          0.18,
        );
        weighted += s * 1.5;
        coveredWeight += 1.5;
        if (s > 0.8) reasons.push('similar chassis thickness');
      }
    }

    if (query.weightG) {
      possibleWeight += 1;
      if (device.dimensions?.weightG) {
        const s = closeness(
          device.dimensions.weightG,
          query.weightG,
          0.25,
        );
        weighted += s;
        coveredWeight += 1;
        if (s > 0.8) reasons.push('similar device mass');
      }
    }

    const volume = bodyVolume(device);
    if (query.bodyVolumeMm3) {
      possibleWeight += 2;
      if (volume) {
        const s = closeness(
          volume,
          query.bodyVolumeMm3,
          0.28,
        );
        weighted += s * 2;
        coveredWeight += 2;
        if (s > 0.75) reasons.push('similar body volume');
      }
    }

    if (query.coolingClass) {
      possibleWeight += 2.5;
      if (device.cooling?.class) {
        const same =
          device.cooling.class === query.coolingClass;
        weighted += (same ? 1 : 0) * 2.5;
        coveredWeight += 2.5;
        if (same) reasons.push('same cooling class');
      }
    }

    if (coveredWeight === 0 || possibleWeight === 0) {
      continue;
    }

    const similarityScore = weighted / coveredWeight;
    const coverageScore = coveredWeight / possibleWeight;
    const score =
      similarityScore * Math.sqrt(coverageScore);

    if (coverageScore < 0.999) {
      reasons.push(
        `spec coverage ${Math.round(coverageScore * 100)}%`,
      );
    }

    matches.push({
      device,
      score,
      similarityScore,
      coverageScore,
      reasons,
    });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, query.limit ?? 12));
}
