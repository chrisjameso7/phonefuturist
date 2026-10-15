import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

const PHONEARENA_ID = 'phonearena-battery-current-2026-10';

const positive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Join specifications from a distinct catalog record only when the maker,
 * full marketing model and battery capacity agree. Never merge runtime
 * measurements, assume a processor from brand, or transfer battery voltage
 * between regional variants.
 *
 * This is an evaluation-only bridge until its benefit has been independently
 * established. It must not silently mutate the production calibration corpus.
 */
function identityKey(d: DeviceCorpusRecord) {
  const maker = d.variant.identity.manufacturer
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const model = d.variant.identity.modelName.toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(5g|4g|global)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  // Strip the manufacturer prefix only when it is literally repeated.
  return maker + '|' + (model.startsWith(maker + ' ')
    ? model.slice(maker.length + 1) : model);
}

function unanimousNumber(values: Array<number | undefined>, tolerance = 0) {
  const found = values.filter(positive);
  if (!found.length) return undefined;
  return found.every(v => Math.abs(v - found[0]) <= tolerance)
    ? found[0] : undefined;
}

export interface PhoneArenaSpecBridge {
  corpus: DeviceCorpus;
  stats: {
    targetRecords: number;
    linkedRecords: number;
    socAdded: number;
    displaySizeAdded: number;
    refreshRateAdded: number;
    resolutionAdded: number;
    conflictingProcessors: number;
  };
}

export function buildPhoneArenaRuntimeSpecBridge(corpus: DeviceCorpus): PhoneArenaSpecBridge {
  const donorsByKey = new Map<string, DeviceCorpusRecord[]>();
  for (const device of corpus.devices) {
    if (device.sourceIds?.includes(PHONEARENA_ID)) continue;
    const key = identityKey(device);
    const group = donorsByKey.get(key) ?? [];
    group.push(device);
    donorsByKey.set(key, group);
  }

  const stats = {
    targetRecords: 0, linkedRecords: 0, socAdded: 0,
    displaySizeAdded: 0, refreshRateAdded: 0, resolutionAdded: 0,
    conflictingProcessors: 0,
  };

  const devices = corpus.devices.map(device => {
    if (!device.sourceIds?.includes(PHONEARENA_ID)) return device;
    stats.targetRecords++;
    const batteryMah = device.variant.battery?.capacityMah ??
      device.variant.battery?.typicalCapacityMah;
    if (!positive(batteryMah)) return device;

    // Different regional batteries are not interchangeable: allow a
    // maximum 2% capacity discrepancy between target and spec donor.
    const donors = (donorsByKey.get(identityKey(device)) ?? []).filter(other => {
      const capacity = other.variant.battery?.capacityMah ??
        other.variant.battery?.typicalCapacityMah;
      return positive(capacity) &&
        Math.abs(capacity - batteryMah) / batteryMah <= 0.02;
    });
    if (!donors.length) return device;
    stats.linkedRecords++;

    const namedSocs = donors.map(d => d.variant.soc)
      .filter((v): v is NonNullable<typeof v> => !!v?.name);
    const socKeys = new Set(namedSocs.map(s =>
      s.vendor.toLowerCase() + '|' + s.name.toLowerCase().replace(/\s+/g, ' ').trim()));
    // Exact marketing name and battery capacity do not uniquely identify
    // an SoC: Samsung and others ship regional processor variants. Only
    // attach it if the measured target and every source carrying the chip
    // agree on a specific region. Unknown region means unknown processor.
    const targetRegion = device.variant.identity.region?.trim().toLowerCase();
    const socRegionVerified = !!targetRegion && namedSocs.length > 0 &&
      donors.filter(d => !!d.variant.soc?.name).every(d =>
        d.variant.identity.region?.trim().toLowerCase() === targetRegion);
    const unambiguousSoc = socKeys.size === 1 && socRegionVerified
      ? namedSocs[0] : undefined;
    if (socKeys.size > 1) stats.conflictingProcessors++;

    const diagonal = unanimousNumber(
      donors.map(d => d.display?.diagonalInches), 0.03);
    const refresh = unanimousNumber(
      donors.map(d => d.display?.refreshRateHz));
    const width = unanimousNumber(
      donors.map(d => d.display?.resolutionWidthPx));
    const height = unanimousNumber(
      donors.map(d => d.display?.resolutionHeightPx));
    // Avoid creating a resolution from unrelated incomplete records.
    const hasCompleteResolution = donors.some(d =>
      positive(d.display?.resolutionWidthPx) &&
      positive(d.display?.resolutionHeightPx));

    const soc = device.variant.soc ?? unambiguousSoc;
    const display = {
      ...device.display,
      diagonalInches: device.display?.diagonalInches ?? diagonal,
      refreshRateHz: device.display?.refreshRateHz ?? refresh,
      resolutionWidthPx: device.display?.resolutionWidthPx ??
        (hasCompleteResolution ? width : undefined),
      resolutionHeightPx: device.display?.resolutionHeightPx ??
        (hasCompleteResolution ? height : undefined),
    };

    if (!device.variant.soc && unambiguousSoc) stats.socAdded++;
    if (!device.display?.diagonalInches && diagonal) stats.displaySizeAdded++;
    if (!device.display?.refreshRateHz && refresh) stats.refreshRateAdded++;
    if (!device.display?.resolutionWidthPx && width &&
      !device.display?.resolutionHeightPx && height &&
      hasCompleteResolution) stats.resolutionAdded++;

    return {
      ...device,
      display,
      variant: {
        ...device.variant,
        ...(soc ? { soc } : {}),
        // Deliberately preserve only the original battery data.
      },
    };
  });

  return { corpus: { ...corpus, devices }, stats };
}
