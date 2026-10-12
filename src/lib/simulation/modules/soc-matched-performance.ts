import {
  getSocEfficiencyCurve,
  type SocEfficiencyProtocol,
} from './soc-efficiency-registry';

export const SOC_MATCHED_PERFORMANCE_VERSION = 'soc-matched-performance-0.1.0';

export type MatchedPowerResult = {
  status: 'resolved' | 'unresolved';
  protocol: SocEfficiencyProtocol;
  targetScore: number;
  firstSoc: string;
  secondSoc: string;
  firstBoardPowerW?: number;
  secondBoardPowerW?: number;
  secondVsFirstPowerPercent?: number;
  evidence?: 'measured';
  reason?: string;
};

/**
 * Compare processor board power at the SAME measured benchmark performance.
 * No extrapolation, no vendor-level coefficients, and no cross-protocol math.
 * This does not predict whole-phone battery life.
 */
export function compareSocsAtPerformance(
  firstSoc: string,
  secondSoc: string,
  protocol: SocEfficiencyProtocol,
  targetScore: number,
): MatchedPowerResult {
  const unresolved = (reason: string): MatchedPowerResult => ({
    status: 'unresolved', protocol, firstSoc, secondSoc, targetScore, reason,
  });
  if (!Number.isFinite(targetScore) || targetScore <= 0)
    return unresolved('Target benchmark performance must be positive.');
  const first = getSocEfficiencyCurve(firstSoc, protocol);
  const second = getSocEfficiencyCurve(secondSoc, protocol);
  if (!first || !second)
    return unresolved('Both processors require exact-generation measured curves using the same benchmark protocol.');

  function powerAtScore(points: typeof first.points) {
    const ordered = [...points].sort((a, b) => a.benchmarkScore - b.benchmarkScore);
    if (targetScore < ordered[0].benchmarkScore || targetScore > ordered[ordered.length - 1].benchmarkScore)
      return undefined;
    for (let i = 1; i < ordered.length; i++) {
      const low = ordered[i - 1], high = ordered[i];
      if (targetScore > high.benchmarkScore) continue;
      const delta = high.benchmarkScore - low.benchmarkScore;
      const ratio = delta === 0 ? 0 : (targetScore - low.benchmarkScore) / delta;
      return low.boardPowerW + (high.boardPowerW - low.boardPowerW) * ratio;
    }
    return ordered[0].boardPowerW;
  }

  const firstBoardPowerW = powerAtScore(first.points);
  const secondBoardPowerW = powerAtScore(second.points);
  if (firstBoardPowerW === undefined || secondBoardPowerW === undefined)
    return unresolved('Requested performance is outside the overlapping measured range; extrapolation is disabled.');
  return {
    status: 'resolved',
    protocol, targetScore,
    firstSoc: first.soc, secondSoc: second.soc,
    firstBoardPowerW, secondBoardPowerW,
    secondVsFirstPowerPercent: 100 * (secondBoardPowerW / firstBoardPowerW - 1),
    evidence: 'measured',
  };
}

export function overlappingMeasuredPerformance(
  firstSoc: string,
  secondSoc: string,
  protocol: SocEfficiencyProtocol,
) {
  const a = getSocEfficiencyCurve(firstSoc, protocol);
  const b = getSocEfficiencyCurve(secondSoc, protocol);
  if (!a || !b) return undefined;
  const min = Math.max(
    Math.min(...a.points.map(point => point.benchmarkScore)),
    Math.min(...b.points.map(point => point.benchmarkScore)),
  );
  const max = Math.min(
    Math.max(...a.points.map(point => point.benchmarkScore)),
    Math.max(...b.points.map(point => point.benchmarkScore)),
  );
  return max > min ? { min, max } : undefined;
}
