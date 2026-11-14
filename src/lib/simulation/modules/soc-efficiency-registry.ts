import snapshotJson from '../../../../data/calibration/geekerwan-socpk-2026-10-12-0.1.json';

/**
 * SoC-specific, protocol-isolated board-power curves.
 * Points represent benchmark scores at measured board power, NOT total
 * handset drain. Do not silently substitute these for whole-phone runtimes.
 */
export const SOC_EFFICIENCY_REGISTRY_VERSION = 'soc-efficiency-registry-0.1.0';
export type SocEfficiencyProtocol = 'geekbench6' | 'geekbench7' | 'steelNomadLight';
export type SocEfficiencyDomain = 'cpu' | 'gpu';
type RawCurve = { id: number; name: string; group: string; meta?: { fitted?: boolean }; points: [number, number][] };
type Snapshot = { accessedDate: string; dataVersions: { cpu: string; gpu: string }; cpu: { geekbench6: RawCurve[]; geekbench7: RawCurve[] }; gpu: { steelNomadLight: RawCurve[] } };
const snapshot = snapshotJson as unknown as Snapshot;

export interface SocEfficiencyCurve {
  soc: string;
  vendor: string;
  protocol: SocEfficiencyProtocol;
  domain: SocEfficiencyDomain;
  source: 'Geekerwan / SoCPK';
  sourceUrl: string;
  accessedDate: string;
  protocolVersion: string;
  /** Benchmark board power in W; screen and handset standby excluded. */
  points: ReadonlyArray<{ boardPowerW: number; benchmarkScore: number }>;
  fitted: boolean;
  evidence: 'measured';
}

export interface SocOperatingPoint {
  soc: string;
  protocol: SocEfficiencyProtocol;
  status: 'resolved' | 'out-of-range' | 'no-measurement';
  boardPowerW?: number;
  benchmarkScore?: number;
  scorePerWatt?: number;
  note: string;
}

function canonical(value: string) {
  return value.toLowerCase().replace(/\bfor galaxy\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function rawCurves(protocol: SocEfficiencyProtocol): RawCurve[] {
  if (protocol === 'geekbench6') return snapshot.cpu.geekbench6;
  if (protocol === 'geekbench7') return snapshot.cpu.geekbench7;
  return snapshot.gpu.steelNomadLight;
}

export function getSocEfficiencyCurve(name: string, protocol: SocEfficiencyProtocol): SocEfficiencyCurve | undefined {
  // Exact-generation only. Unknown chipsets never inherit vendor-average curves.
  const curve = rawCurves(protocol).find(row => canonical(row.name) === canonical(name));
  if (!curve) return undefined;
  const points = curve.points
    .filter(([power, score]) => Number.isFinite(power) && power > 0 && Number.isFinite(score) && score > 0)
    .map(([boardPowerW, benchmarkScore]) => ({ boardPowerW, benchmarkScore }))
    .sort((a, b) => a.boardPowerW - b.boardPowerW);
  if (points.length < 2) return undefined;
  return {
    soc: curve.name,
    vendor: curve.group,
    protocol,
    domain: protocol === 'steelNomadLight' ? 'gpu' : 'cpu',
    source: 'Geekerwan / SoCPK',
    sourceUrl: protocol === 'steelNomadLight'
      ? 'https://www.socpk.com/api/pages/mobile-soc-efficiency-snl'
      : 'https://www.socpk.com/api/pages/mobile-soc-efficiency-gb7',
    accessedDate: snapshot.accessedDate,
    protocolVersion: protocol === 'steelNomadLight' ? snapshot.dataVersions.gpu : snapshot.dataVersions.cpu,
    points,
    fitted: curve.meta?.fitted === true,
    evidence: 'measured',
  };
}

export function evaluateSocAtBoardPower(
  soc: string,
  protocol: SocEfficiencyProtocol,
  boardPowerW: number,
): SocOperatingPoint {
  const curve = getSocEfficiencyCurve(soc, protocol);
  if (!curve) return { soc, protocol, status: 'no-measurement', note: 'No same-generation measured curve. No vendor fallback applied.' };
  if (!Number.isFinite(boardPowerW) || boardPowerW <= 0) {
    return { soc, protocol, status: 'out-of-range', note: 'Board power must be positive.' };
  }
  const points = curve.points;
  if (boardPowerW < points[0].boardPowerW || boardPowerW > points[points.length - 1].boardPowerW) {
    return { soc, protocol, status: 'out-of-range', note: 'Requested board power lies beyond the measured curve. Extrapolation disabled.' };
  }
  for (let i = 1; i < points.length; i++) {
    const left = points[i - 1], right = points[i];
    if (boardPowerW <= right.boardPowerW) {
      const span = right.boardPowerW - left.boardPowerW;
      const ratio = span > 0 ? (boardPowerW - left.boardPowerW) / span : 0;
      const benchmarkScore = left.benchmarkScore + (right.benchmarkScore - left.benchmarkScore) * ratio;
      return {
        soc: curve.soc, protocol, status: 'resolved', boardPowerW,
        benchmarkScore, scorePerWatt: benchmarkScore / boardPowerW,
        note: 'Interpolated within measured benchmark board-power curve; not a whole-device battery prediction.',
      };
    }
  }
  return { soc, protocol, status: 'out-of-range', note: 'No valid interpolation segment.' };
}

export function listSocEfficiencyCoverage(protocol: SocEfficiencyProtocol) {
  return rawCurves(protocol).map(curve => ({ soc: curve.name, vendor: curve.group }));
}
