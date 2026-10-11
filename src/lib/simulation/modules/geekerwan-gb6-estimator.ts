import type {
  DeviceCorpus,
} from './device-corpus';
import {
  normalizeSocFamily,
} from './comparable-devices';

export const GEEKERWAN_GB6_ESTIMATOR_VERSION =
  'geekerwan-gb6-estimator-0.1.0';

export interface GeekerwanGb6EstimateInput {
  socName?: string;
  socVendor?: string;
}

export interface GeekerwanGb6EstimateResult {
  version: string;
  status: 'resolved' | 'unresolved';
  metric:
    'geekerwan_geekbench_6_multi_core';
  expectedScore?: number;
  minScore?: number;
  maxScore?: number;
  referenceCount: number;
  evidenceScope?: 'same-soc-family';
  sameVendorContextCount: number;
  sameVendorContextMin?: number;
  sameVendorContextMax?: number;
  neighborIds: string[];
  unresolvedReason?: string;
  note: string;
}

export function estimateGeekerwanGb6Multi(
  corpus: DeviceCorpus,
  input: GeekerwanGb6EstimateInput,
): GeekerwanGb6EstimateResult {
  const rows =
    corpus.measurements.flatMap(
      (measurement) => {
        if (
          measurement.metric !==
            'geekerwan_geekbench_6_multi_core' ||
          measurement.workload !==
            'benchmark' ||
          measurement.evidenceKind !==
            'measured' ||
          measurement.unit !== 'points'
        ) {
          return [];
        }

        const device =
          corpus.devices.find(
            (candidate) =>
              candidate.variant.id ===
              measurement.deviceVariantId,
          );

        if (!device) return [];

        return [{
          deviceVariantId:
            device.variant.id,
          socName:
            device.variant.soc?.name,
          socVendor:
            device.variant.soc?.vendor,
          value:
            measurement.value,
        }];
      },
    );

  const sameFamily =
    input.socName
      ? rows.filter(
          (row) =>
            row.socName &&
            normalizeSocFamily(
              row.socName,
            ) ===
              normalizeSocFamily(
                input.socName!,
              ),
        )
      : [];

  const sameVendor =
    input.socVendor
      ? rows.filter(
          (row) =>
            row.socVendor ===
            input.socVendor,
        )
      : [];

  if (!sameFamily.length) {
    return {
      version:
        GEEKERWAN_GB6_ESTIMATOR_VERSION,
      status: 'unresolved',
      metric:
        'geekerwan_geekbench_6_multi_core',
      referenceCount: 0,
      sameVendorContextCount:
        sameVendor.length,
      ...(sameVendor.length
        ? {
            sameVendorContextMin:
              Math.min(
                ...sameVendor.map(
                  (row) =>
                    row.value,
                ),
              ),
            sameVendorContextMax:
              Math.max(
                ...sameVendor.map(
                  (row) =>
                    row.value,
                ),
              ),
          }
        : {}),
      neighborIds: [],
      unresolvedReason:
        input.socName
          ? 'No measured Geekerwan Geekbench 6 score exists for this exact SoC family.'
          : 'SoC name is required.',
      note:
        sameVendor.length
          ? 'Same-vendor Geekerwan scores are shown only as context and are not converted into a synthetic score for a different or future SoC.'
          : 'No compatible Geekerwan Geekbench 6 evidence is available.',
    };
  }

  const values =
    sameFamily.map(
      (row) =>
        row.value,
    );

  return {
    version:
      GEEKERWAN_GB6_ESTIMATOR_VERSION,
    status: 'resolved',
    metric:
      'geekerwan_geekbench_6_multi_core',
    expectedScore:
      values.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / values.length,
    minScore:
      Math.min(...values),
    maxScore:
      Math.max(...values),
    referenceCount:
      sameFamily.length,
    evidenceScope:
      'same-soc-family',
    sameVendorContextCount:
      sameVendor.length,
    ...(sameVendor.length
      ? {
          sameVendorContextMin:
            Math.min(
              ...sameVendor.map(
                (row) =>
                  row.value,
              ),
            ),
          sameVendorContextMax:
            Math.max(
              ...sameVendor.map(
                (row) =>
                  row.value,
              ),
            ),
        }
      : {}),
    neighborIds:
      sameFamily.map(
        (row) =>
          row.deviceVariantId,
      ),
    note:
      'Resolved only from the exact SoC family in Geekerwan’s Geekbench 6 ranking. This metric remains protocol-isolated from Geekbench 6.7 evidence.',
  };
}
