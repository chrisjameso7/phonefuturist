import {
  findChargerLabManufacturerClass,
} from './chargerlab-charging-evidence';

export const CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION =
  'chargerlab-peak-input-context-0.1.0';

export interface ChargerLabPeakInputContext {
  version: string;
  status: 'resolved' | 'unresolved';
  manufacturer: string;
  advertisedWiredWatts: number;
  referenceCount: number;
  referenceModels: string[];
  observedPeakMinW?: number;
  observedPeakExpectedW?: number;
  observedPeakMaxW?: number;
  utilizationMinPercent?: number;
  utilizationExpectedPercent?: number;
  utilizationMaxPercent?: number;
  unresolvedReason?: string;
  note: string;
}

function median(
  values: number[],
) {
  const sorted =
    [...values].sort(
      (a, b) => a - b,
    );

  const midpoint =
    Math.floor(
      sorted.length / 2,
    );

  if (
    sorted.length % 2
  ) {
    return sorted[midpoint];
  }

  return (
    sorted[midpoint - 1] +
    sorted[midpoint]
  ) / 2;
}

export function estimateChargerLabPeakInputContext(
  manufacturer: string,
  advertisedWiredWatts: number,
  toleranceWatts = 20,
): ChargerLabPeakInputContext {
  if (
    !Number.isFinite(
      advertisedWiredWatts,
    ) ||
    advertisedWiredWatts <= 0
  ) {
    return {
      version:
        CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION,
      status: 'unresolved',
      manufacturer,
      advertisedWiredWatts,
      referenceCount: 0,
      referenceModels: [],
      unresolvedReason:
        'Advertised wired charging power must be a positive finite value.',
      note:
        'No peak-input context is produced from invalid charging specifications.',
    };
  }

  const peers =
    findChargerLabManufacturerClass(
      manufacturer,
      advertisedWiredWatts,
      toleranceWatts,
    )
      .filter(
        (peer) =>
          peer.context
            .advertisedUtilizationFraction !==
            undefined &&
          peer.context
            .observedPeakPowerW !==
            undefined,
      );

  if (!peers.length) {
    return {
      version:
        CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION,
      status: 'unresolved',
      manufacturer,
      advertisedWiredWatts,
      referenceCount: 0,
      referenceModels: [],
      unresolvedReason:
        'No recent ChargerLAB same-manufacturer references exist near this advertised charging class.',
      note:
        'PhoneFuturist does not borrow peak-input ratios across unrelated manufacturers or charging ecosystems.',
    };
  }

  const utilization =
    peers.map(
      (peer) =>
        peer.context
          .advertisedUtilizationFraction!,
    );

  const minFraction =
    Math.min(
      ...utilization,
    );
  const maxFraction =
    Math.max(
      ...utilization,
    );
  const expectedFraction =
    median(
      utilization,
    );

  return {
    version:
      CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION,
    status: 'resolved',
    manufacturer,
    advertisedWiredWatts,
    referenceCount:
      peers.length,
    referenceModels:
      peers.map(
        (peer) =>
          peer.result.model,
      ),
    observedPeakMinW:
      advertisedWiredWatts *
      minFraction,
    observedPeakExpectedW:
      advertisedWiredWatts *
      expectedFraction,
    observedPeakMaxW:
      advertisedWiredWatts *
      maxFraction,
    utilizationMinPercent:
      minFraction * 100,
    utilizationExpectedPercent:
      expectedFraction * 100,
    utilizationMaxPercent:
      maxFraction * 100,
    note:
      'This is a same-manufacturer peak-input sanity envelope derived from recent ChargerLAB measured charger/phone power ratios. It describes likely negotiated peak input only and is not a full-charge-time prediction or sustained battery power estimate.',
  };
}
