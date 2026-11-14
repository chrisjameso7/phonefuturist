import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import type {
  SocVendor,
} from './device-variant';
import {
  GEEKERWAN_GB6_MULTI_REFERENCES,
  GEEKERWAN_SOURCES,
} from './geekerwan-soc-reference';

function vendor(
  value: string,
): SocVendor {
  switch (value) {
    case 'Apple':
    case 'Qualcomm':
    case 'Samsung':
    case 'MediaTek':
    case 'Google':
    case 'Huawei':
      return value;
    default:
      return 'other';
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildGeekerwanSocCorpus(): DeviceCorpus {
  const sources: CorpusSource[] =
    GEEKERWAN_SOURCES.map(
      (source) => ({
        ...source,
      }),
    );

  const devices:
    DeviceCorpusRecord[] =
    GEEKERWAN_GB6_MULTI_REFERENCES.map(
      (reference) => {
        const id =
          'geekerwan-soc-' +
          slug(
            reference.socName,
          );

        return {
          variant: {
            id,
            identity: {
              manufacturer:
                'Geekerwan SoC Reference',
              family:
                reference.socName,
              modelName:
                reference.socName,
            },
            soc: {
              vendor:
                vendor(
                  reference.socVendor,
                ),
              name:
                reference.socName,
            },
            notes: [
              'SoC-level benchmark reference. This record is not a retail phone identity.',
              'Protocol remains Geekerwan Geekbench 6 and must not be mixed with Geekbench 6.7 evidence.',
            ],
          },
          sourceIds: [
            reference.sourceId,
          ],
        };
      },
    );

  const measurements:
    CorpusMeasurement[] =
    GEEKERWAN_GB6_MULTI_REFERENCES.map(
      (reference) => ({
        id:
          'geekerwan-soc-' +
          slug(
            reference.socName,
          ) +
          '-gb6-multi',
        deviceVariantId:
          'geekerwan-soc-' +
          slug(
            reference.socName,
          ),
        workload: 'benchmark',
        metric:
          reference.metric,
        value:
          reference.value,
        unit:
          reference.unit,
        sourceId:
          reference.sourceId,
        evidenceKind:
          reference.evidenceKind,
        notes: [
          'Geekerwan SoC ranking evidence. Protocol-isolated from Geekbench 6.7 references.',
        ],
      }),
    );

  return {
    version:
      'geekerwan-soc-corpus-0.1.0',
    sources,
    devices,
    measurements,
  };
}
