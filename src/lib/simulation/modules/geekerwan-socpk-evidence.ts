import snapshotJson from '../../../../data/calibration/geekerwan-socpk-2026-10-12-0.1.json';

export const GEEKERWAN_SOCPK_EVIDENCE_VERSION =
  'geekerwan-socpk-evidence-0.1.0';

export type GeekerwanCurveBenchmark =
  | 'geekbench6_multi'
  | 'geekbench7_multi'
  | '3dmark_steel_nomad_light';

export interface GeekerwanCurvePoint {
  powerW: number;
  score: number;
  efficiencyScorePerW: number;
}

export interface GeekerwanSocCurve {
  id: number;
  socName: string;
  vendorGroup: string;
  benchmark: GeekerwanCurveBenchmark;
  fitted: boolean;
  points: GeekerwanCurvePoint[];
}

export interface GeekerwanSocCurveSummary {
  version: string;
  status: 'resolved' | 'unresolved';
  socName: string;
  benchmark: GeekerwanCurveBenchmark;
  fitted?: boolean;
  pointCount: number;
  minPowerW?: number;
  maxPowerW?: number;
  minScore?: number;
  maxScore?: number;
  peakEfficiencyScorePerW?: number;
  peakEfficiencyPowerW?: number;
  peakEfficiencyScore?: number;
  selectedPoint?: GeekerwanCurvePoint;
  requestedPowerW?: number;
  powerSelection?: 'nearest-published-point';
  unresolvedReason?: string;
  note: string;
}

export interface GeekerwanBatteryResult {
  id: number;
  manufacturer: string;
  model: string;
  runtimeMinutes: number;
  ratedEnergyWh?: number;
  averagePowerW?: number;
  minutesPerWh?: number;
  systemVersion: string;
  videoUrl: string;
}

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
  source: {
    publisher: string;
    url: string;
    sourceRole: string;
    methodology: Record<string, string>;
  };
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
  battery: {
    devices: GeekerwanBatteryResult[];
  };
};

const snapshot =
  snapshotJson as unknown as RawSnapshot;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/bionic/g, '')
    .replace(/snapdragon/g, 'sd')
    .replace(/dimensity/g, 'd')
    .replace(/exynos/g, 'e')
    .replace(/kirin/g, 'k')
    .replace(/tensor/g, 'tensor')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9+()]/g, '');
}
function normalizeDeviceModel(
  manufacturer: string,
  model: string,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  let value =
    model
      .trim()
      .toLowerCase();

  if (
    maker &&
    value.startsWith(
      `${maker} `,
    )
  ) {
    value = value.slice(
      maker.length + 1,
    );
  }

  if (
    maker === 'samsung' &&
    value.startsWith('galaxy ')
  ) {
    value = value.slice(7);
  }

  if (
    maker === 'google' &&
    value.startsWith('google ')
  ) {
    value = value.slice(7);
  }

  return value
    .replace(/\b5g\b/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function curvesFor(
  benchmark: GeekerwanCurveBenchmark,
): RawCurve[] {
  switch (benchmark) {
    case 'geekbench6_multi':
      return snapshot.cpu.geekbench6;
    case 'geekbench7_multi':
      return snapshot.cpu.geekbench7;
    case '3dmark_steel_nomad_light':
      return snapshot.gpu.steelNomadLight;
  }
}

function toCurve(
  raw: RawCurve,
  benchmark: GeekerwanCurveBenchmark,
): GeekerwanSocCurve {
  return {
    id: raw.id,
    socName: raw.name,
    vendorGroup: raw.group,
    benchmark,
    fitted:
      raw.meta?.fitted === true,
    points: raw.points.map(
      ([powerW, score]) => ({
        powerW,
        score,
        efficiencyScorePerW:
          score / powerW,
      }),
    ),
  };
}

export function listGeekerwanSocCurves(
  benchmark: GeekerwanCurveBenchmark,
) {
  return curvesFor(benchmark).map(
    (curve) =>
      toCurve(
        curve,
        benchmark,
      ),
  );
}

export function findGeekerwanSocCurve(
  socName: string,
  benchmark: GeekerwanCurveBenchmark,
): GeekerwanSocCurve | undefined {
  const key = normalize(socName);
  if (!key) return undefined;

  const exact =
    curvesFor(benchmark).find(
      (curve) =>
        normalize(curve.name) === key,
    );

  if (exact) {
    return toCurve(
      exact,
      benchmark,
    );
  }

  const partial =
    curvesFor(benchmark).filter(
      (curve) => {
        const candidate =
          normalize(curve.name);
        return (
          candidate.includes(key) ||
          key.includes(candidate)
        );
      },
    );

  if (partial.length !== 1) {
    return undefined;
  }

  return toCurve(
    partial[0],
    benchmark,
  );
}

export function summarizeGeekerwanSocCurve(
  socName: string,
  benchmark: GeekerwanCurveBenchmark,
  requestedPowerW?: number,
): GeekerwanSocCurveSummary {
  const curve =
    findGeekerwanSocCurve(
      socName,
      benchmark,
    );

  if (!curve?.points.length) {
    return {
      version:
        GEEKERWAN_SOCPK_EVIDENCE_VERSION,
      status: 'unresolved',
      socName,
      benchmark,
      pointCount: 0,
      unresolvedReason:
        'No matching Geekerwan/SoCPK curve exists for this SoC and benchmark.',
      note:
        'PhoneFuturist leaves Geekerwan efficiency context unresolved rather than substituting another SoC generation.',
    };
  }

  const points =
    [...curve.points].sort(
      (a, b) =>
        a.powerW - b.powerW,
    );

  const bestEfficiency =
    points.reduce(
      (best, point) =>
        point.efficiencyScorePerW >
        best.efficiencyScorePerW
          ? point
          : best,
      points[0],
    );

  const selectedPoint =
    typeof requestedPowerW === 'number' &&
    Number.isFinite(requestedPowerW) &&
    requestedPowerW > 0
      ? points.reduce(
          (best, point) =>
            Math.abs(
              point.powerW -
                requestedPowerW,
            ) <
            Math.abs(
              best.powerW -
                requestedPowerW,
            )
              ? point
              : best,
          points[0],
        )
      : undefined;

  return {
    version:
      GEEKERWAN_SOCPK_EVIDENCE_VERSION,
    status: 'resolved',
    socName: curve.socName,
    benchmark,
    fitted: curve.fitted,
    pointCount: points.length,
    minPowerW:
      points[0].powerW,
    maxPowerW:
      points[
        points.length - 1
      ].powerW,
    minScore:
      Math.min(
        ...points.map(
          (point) =>
            point.score,
        ),
      ),
    maxScore:
      Math.max(
        ...points.map(
          (point) =>
            point.score,
        ),
      ),
    peakEfficiencyScorePerW:
      bestEfficiency.efficiencyScorePerW,
    peakEfficiencyPowerW:
      bestEfficiency.powerW,
    peakEfficiencyScore:
      bestEfficiency.score,
    ...(selectedPoint
      ? {
          selectedPoint,
          requestedPowerW,
          powerSelection:
            'nearest-published-point' as const,
        }
      : {}),
    note:
      curve.fitted
        ? 'Geekerwan/SoCPK published fitted power-score curve from self-purchased retail hardware. PhoneFuturist uses only published curve points and does not extrapolate beyond them.'
        : 'Geekerwan/SoCPK published power-score curve from self-purchased retail hardware. PhoneFuturist uses only published curve points and does not extrapolate beyond them.',
  };
}

export function listGeekerwanBatteryResults() {
  return snapshot.battery.devices.map(
    (row) => ({ ...row }),
  );
}

export function findGeekerwanBatteryResult(
  manufacturer: string,
  model: string,
): GeekerwanBatteryResult | undefined {
  const maker =
    normalize(manufacturer);
  const target =
    normalize(model);

  const manufacturerRows =
    snapshot.battery.devices.filter(
      (row) =>
        normalize(
          row.manufacturer,
        ) === maker,
    );

  const deviceTarget =
    normalizeDeviceModel(
      manufacturer,
      model,
    );

  const exact =
    manufacturerRows.find(
      (row) =>
        normalizeDeviceModel(
          row.manufacturer,
          row.model,
        ) === deviceTarget,
    );

  if (exact) return exact;

  const partial =
    manufacturerRows.filter(
      (row) => {
        const candidate =
          normalizeDeviceModel(
            row.manufacturer,
            row.model,
          );

        return (
          candidate.includes(
            deviceTarget,
          ) ||
          deviceTarget.includes(
            candidate,
          )
        );
      },
    );

  return partial.length === 1
    ? partial[0]
    : undefined;
}

export function getGeekerwanDataVersions() {
  return {
    accessedDate:
      snapshot.accessedDate,
    ...snapshot.dataVersions,
  };
}
