export const CONNECTIVITY_WORKLOAD_VERSION =
  'connectivity-workload-0.1.0';

export type ConnectivityMode =
  | 'wifi'
  | 'lte'
  | '5g-sub6'
  | '5g-mmwave'
  | 'hotspot'
  | 'gnss'
  | 'bluetooth'
  | 'other';

export interface ConnectivityWorkloadInput {
  mode: ConnectivityMode;
  downloadMbps?: number;
  uploadMbps?: number;
  linkCapacityMbps?: number;
  sessionDurationMinutes?: number;
  radioPowerW?: number;
  activeDutyFraction?: number;
  signalMetricLabel?: string;
  signalMetricValue?: number;
}

export interface ConnectivityWorkloadResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  mode: ConnectivityMode;
  downloadMbps?: number;
  uploadMbps?: number;
  aggregateTrafficMbps?: number;
  linkCapacityMbps?: number;
  throughputUtilizationFraction?: number;
  throughputUtilizationPercent?: number;
  capacityExceeded?: boolean;
  sessionDurationMinutes?: number;
  downloadedDataGb?: number;
  uploadedDataGb?: number;
  totalTransferredDataGb?: number;
  radioPowerW?: number;
  activeDutyFraction?: number;
  effectiveRadioPowerW?: number;
  radioEnergyWh?: number;
  signalMetricLabel?: string;
  signalMetricValue?: number;
  warnings: string[];
  note: string;
}

function nonNegative(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function positive(
  value: unknown,
): value is number {
  return nonNegative(value) && value > 0;
}

export function calculateConnectivityWorkload(
  input: ConnectivityWorkloadInput,
): ConnectivityWorkloadResult {
  const warnings: string[] = [];

  const downloadMbps =
    nonNegative(input.downloadMbps)
      ? input.downloadMbps
      : undefined;

  const uploadMbps =
    nonNegative(input.uploadMbps)
      ? input.uploadMbps
      : undefined;

  const linkCapacityMbps =
    positive(input.linkCapacityMbps)
      ? input.linkCapacityMbps
      : undefined;

  const sessionDurationMinutes =
    positive(input.sessionDurationMinutes)
      ? input.sessionDurationMinutes
      : undefined;

  const radioPowerW =
    positive(input.radioPowerW)
      ? input.radioPowerW
      : undefined;

  const activeDutyFraction =
    input.activeDutyFraction === undefined
      ? undefined
      : typeof input.activeDutyFraction ===
            'number' &&
          Number.isFinite(
            input.activeDutyFraction,
          ) &&
          input.activeDutyFraction >= 0 &&
          input.activeDutyFraction <= 1
        ? input.activeDutyFraction
        : undefined;

  if (
    input.activeDutyFraction !== undefined &&
    activeDutyFraction === undefined
  ) {
    warnings.push(
      'Radio active-duty fraction must be between 0 and 1.',
    );
  }

  const aggregateTrafficMbps =
    downloadMbps !== undefined ||
    uploadMbps !== undefined
      ? (downloadMbps ?? 0) +
        (uploadMbps ?? 0)
      : undefined;

  const throughputUtilizationFraction =
    aggregateTrafficMbps !== undefined &&
    linkCapacityMbps !== undefined
      ? aggregateTrafficMbps /
        linkCapacityMbps
      : undefined;

  const capacityExceeded =
    throughputUtilizationFraction !==
      undefined
      ? throughputUtilizationFraction > 1
      : undefined;

  if (capacityExceeded) {
    warnings.push(
      'Requested aggregate traffic exceeds the supplied link capacity.',
    );
  }

  const durationSeconds =
    sessionDurationMinutes !== undefined
      ? sessionDurationMinutes * 60
      : undefined;

  const downloadedDataGb =
    downloadMbps !== undefined &&
    durationSeconds !== undefined
      ? downloadMbps *
        durationSeconds /
        8 /
        1000
      : undefined;

  const uploadedDataGb =
    uploadMbps !== undefined &&
    durationSeconds !== undefined
      ? uploadMbps *
        durationSeconds /
        8 /
        1000
      : undefined;

  const totalTransferredDataGb =
    downloadedDataGb !== undefined ||
    uploadedDataGb !== undefined
      ? (downloadedDataGb ?? 0) +
        (uploadedDataGb ?? 0)
      : undefined;

  const effectiveRadioPowerW =
    radioPowerW !== undefined
      ? radioPowerW *
        (activeDutyFraction ?? 1)
      : undefined;

  const radioEnergyWh =
    effectiveRadioPowerW !== undefined &&
    sessionDurationMinutes !== undefined
      ? effectiveRadioPowerW *
        sessionDurationMinutes /
        60
      : undefined;

  if (radioPowerW === undefined) {
    warnings.push(
      'Radio energy remains unresolved until measured or explicitly assumed radio power is supplied.',
    );
  }

  return {
    version:
      CONNECTIVITY_WORKLOAD_VERSION,
    status:
      aggregateTrafficMbps !== undefined ||
      radioEnergyWh !== undefined
        ? 'resolved'
        : input.signalMetricValue !==
              undefined ||
            linkCapacityMbps !== undefined
          ? 'partial'
          : 'unresolved',
    mode: input.mode,
    ...(downloadMbps !== undefined
      ? { downloadMbps }
      : {}),
    ...(uploadMbps !== undefined
      ? { uploadMbps }
      : {}),
    ...(aggregateTrafficMbps !== undefined
      ? { aggregateTrafficMbps }
      : {}),
    ...(linkCapacityMbps !== undefined
      ? { linkCapacityMbps }
      : {}),
    ...(throughputUtilizationFraction !==
    undefined
      ? {
          throughputUtilizationFraction,
          throughputUtilizationPercent:
            throughputUtilizationFraction *
            100,
          capacityExceeded,
        }
      : {}),
    ...(sessionDurationMinutes !==
    undefined
      ? { sessionDurationMinutes }
      : {}),
    ...(downloadedDataGb !== undefined
      ? { downloadedDataGb }
      : {}),
    ...(uploadedDataGb !== undefined
      ? { uploadedDataGb }
      : {}),
    ...(totalTransferredDataGb !==
    undefined
      ? { totalTransferredDataGb }
      : {}),
    ...(radioPowerW !== undefined
      ? { radioPowerW }
      : {}),
    ...(activeDutyFraction !== undefined
      ? { activeDutyFraction }
      : {}),
    ...(effectiveRadioPowerW !==
    undefined
      ? { effectiveRadioPowerW }
      : {}),
    ...(radioEnergyWh !== undefined
      ? { radioEnergyWh }
      : {}),
    ...(input.signalMetricLabel
      ? {
          signalMetricLabel:
            input.signalMetricLabel,
        }
      : {}),
    ...(nonNegative(input.signalMetricValue)
      ? {
          signalMetricValue:
            input.signalMetricValue,
        }
      : {}),
    warnings,
    note:
      'Traffic volume, link utilization and energy are calculated only from supplied workload, capacity and radio-power inputs. Network mode and signal labels are metadata and do not create hidden power multipliers.',
  };
}
