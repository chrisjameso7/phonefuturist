import snapshotJson from '../../../../data/calibration/geekerwan-socpk-2026-10-12-0.1.json';
import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import type {
  SocVendor,
} from './device-variant';

export const GEEKERWAN_EFFICIENCY_CURVE_CORPUS_VERSION =
  'geekerwan-efficiency-curve-corpus-0.1.0';

type RawCurve = {
  id: number;
  name: string;
  group: string;
  meta?: {
    fitted?: boolean;
    [key: string]: unknown;
  };
  points: [number, number][];
};

type RawSnapshot = {
  version: string;
  accessedDate: string;
  dataVersions: {
    cpu: string;
    gpu: string;
    battery: string;
  };
  cpu: {
    geekbench6: RawCurve[];
    geekbench7: RawCurve[];
  };
  gpu: {
    steelNomadLight: RawCurve[];
  };
};

const snapshot =
  snapshotJson as unknown as RawSnapshot;

function vendor(
  group: string,
): SocVendor {
  switch (group) {
    case 'Apple':
    case 'Qualcomm':
    case 'Samsung':
    case 'MediaTek':
    case 'Google':
    case 'Huawei':
      return group;
    case 'Xiaomi':
      return 'other';
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

const sources: CorpusSource[] = [
  {
    id: 'geekerwan-socpk-gb6-curves-2026-10-12',
    publisher: 'Geekerwan / SoCPK',
    sourceRole: 'measurement-lab',
    url: 'https://www.socpk.com/api/pages/mobile-soc-efficiency-gb7',
    protocol:
      'Geekerwan Geekbench 6 CPU multi-frequency board-power efficiency curve; phone disassembled, dummy battery/external power monitor, display power excluded.',
    protocolVersion:
      snapshot.dataVersions.cpu,
    accessedDate:
      snapshot.accessedDate,
  },
  {
    id: 'geekerwan-socpk-gb7-curves-2026-10-12',
    publisher: 'Geekerwan / SoCPK',
    sourceRole: 'measurement-lab',
    url: 'https://www.socpk.com/api/pages/mobile-soc-efficiency-gb7',
    protocol:
      'Geekerwan Geekbench 7 CPU multi-frequency board-power efficiency curve; phone disassembled, dummy battery/external power monitor, display power excluded.',
    protocolVersion:
      snapshot.dataVersions.cpu,
    accessedDate:
      snapshot.accessedDate,
  },
  {
    id: 'geekerwan-socpk-snl-curves-2026-10-12',
    publisher: 'Geekerwan / SoCPK',
    sourceRole: 'measurement-lab',
    url: 'https://www.socpk.com/api/pages/mobile-soc-efficiency-snl',
    protocol:
      'Geekerwan 3DMark Steel Nomad Light GPU multi-frequency board-power efficiency curve; phone disassembled, dummy battery/external power monitor, display power excluded.',
    protocolVersion:
      snapshot.dataVersions.gpu,
    accessedDate:
      snapshot.accessedDate,
  },
];

function sourceId(
  benchmark:
    | 'gb6'
    | 'gb7'
    | 'snl',
) {
  switch (benchmark) {
    case 'gb6':
      return 'geekerwan-socpk-gb6-curves-2026-10-12';
    case 'gb7':
      return 'geekerwan-socpk-gb7-curves-2026-10-12';
    case 'snl':
      return 'geekerwan-socpk-snl-curves-2026-10-12';
  }
}

function metricName(
  benchmark:
    | 'gb6'
    | 'gb7'
    | 'snl',
) {
  switch (benchmark) {
    case 'gb6':
      return 'geekerwan_gb6_multi_curve_score';
    case 'gb7':
      return 'geekerwan_gb7_multi_curve_score';
    case 'snl':
      return 'geekerwan_steel_nomad_light_curve_score';
  }
}

function deviceId(
  curve: RawCurve,
) {
  return (
    'geekerwan-curve-soc-' +
    slug(curve.name)
  );
}

function appendCurve(
  benchmark:
    | 'gb6'
    | 'gb7'
    | 'snl',
  curve: RawCurve,
  devices:
    Map<string, DeviceCorpusRecord>,
  measurements:
    CorpusMeasurement[],
) {
  const id =
    deviceId(curve);

  if (!devices.has(id)) {
    devices.set(id, {
      variant: {
        id,
        identity: {
          manufacturer:
            'Geekerwan SoC Reference',
          family:
            curve.name,
          modelName:
            curve.name,
        },
        soc: {
          vendor:
            vendor(
              curve.group,
            ),
          name:
            curve.name,
        },
        notes: [
          'SoC-level curve evidence only; not a retail phone identity.',
        ],
      },
      sourceIds: [],
    });
  }

  const device =
    devices.get(id)!;

  const sid =
    sourceId(benchmark);

  device.sourceIds = [
    ...new Set([
      ...(device.sourceIds ?? []),
      sid,
    ]),
  ];

  curve.points.forEach(
    ([powerW, score], index) => {
      measurements.push({
        id:
          id +
          '-' +
          benchmark +
          '-curve-' +
          String(index + 1)
            .padStart(3, '0'),
        deviceVariantId: id,
        workload: 'benchmark',
        metric:
          metricName(
            benchmark,
          ),
        value: score,
        unit: 'points',
        sourceId: sid,
        evidenceKind:
          curve.meta?.fitted === true
            ? 'inferred'
            : 'measured',
        benchmarkPowerW:
          powerW,
        notes: [
          `Published SoCPK curve point at ${powerW} W board power.`,
          curve.meta?.fitted === true
            ? 'SoCPK marks this curve as fitted; point is retained as inferred curve evidence, not a raw measurement.'
            : 'SoCPK does not mark this curve as fitted; point is retained as measured curve evidence.',
        ],
      });
    },
  );
}

export function buildGeekerwanEfficiencyCurveCorpus(): DeviceCorpus {
  const devices =
    new Map<
      string,
      DeviceCorpusRecord
    >();

  const measurements:
    CorpusMeasurement[] = [];

  for (
    const curve of
    snapshot.cpu.geekbench6
  ) {
    appendCurve(
      'gb6',
      curve,
      devices,
      measurements,
    );
  }

  for (
    const curve of
    snapshot.cpu.geekbench7
  ) {
    appendCurve(
      'gb7',
      curve,
      devices,
      measurements,
    );
  }

  for (
    const curve of
    snapshot.gpu.steelNomadLight
  ) {
    appendCurve(
      'snl',
      curve,
      devices,
      measurements,
    );
  }

  return {
    version:
      GEEKERWAN_EFFICIENCY_CURVE_CORPUS_VERSION,
    sources,
    devices: [
      ...devices.values(),
    ],
    measurements,
  };
}
