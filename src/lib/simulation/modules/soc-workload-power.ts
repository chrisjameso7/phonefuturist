import {
  getSocEfficiencyCurve,
  type SocEfficiencyProtocol,
} from './soc-efficiency-registry';

export const SOC_WORKLOAD_POWER_VERSION = 'soc-workload-power-0.1.0';

/** The measured board-power value is a loaded benchmark operating point.
 * Total phone power is the measured board-power equivalent, scaled by the
 * EXPLICIT active duty fraction, plus independently supplied non-board loads.
 * For now it is an engineering WHAT-IF, not a calibrated runtime forecast.
 */
export type SocWorkloadPowerInput = {
  socName: string;
  protocol: SocEfficiencyProtocol;
  targetBenchmarkScore: number;
  activeDutyFraction: number;
  /** Measured/assumed board power when not executing the benchmark. */
  inactiveBoardPowerW: number;
  /** Display is excluded from the Geekerwan/SoCPK board measurement. */
  displayPowerW: number;
  /** Extra modem, peripheral or camera power that isn't in board tests. */
  otherPeripheralPowerW?: number;
  /** Rated pack Wh times usableFraction gives available energy. */
  batteryEnergyWh: number;
  usableFraction: number;
};
export type SocWorkloadPowerResult =
  | { status: 'unresolved'; reason: string; modelVersion: string }
  | {
      status: 'scenario';
      modelVersion: string;
      evidence: 'measured-soc-curve-plus-user-assumptions';
      socName: string;
      protocol: SocEfficiencyProtocol;
      benchmarkBoardPowerW: number;
      averageBoardPowerW: number;
      displayPowerW: number;
      otherPeripheralPowerW: number;
      totalPowerW: number;
      runtimeHours: number;
      assumptions: string[];
    };

function finiteNonnegative(v: number): boolean {
  return Number.isFinite(v) && v >= 0;
}

export function estimateSocWorkloadPower(input: SocWorkloadPowerInput): SocWorkloadPowerResult {
  const fail = (reason: string): SocWorkloadPowerResult => ({
    status: 'unresolved', reason, modelVersion: SOC_WORKLOAD_POWER_VERSION,
  });
  if (!input.socName.trim()) return fail('A specific processor is required.');
  if (!Number.isFinite(input.targetBenchmarkScore) || input.targetBenchmarkScore <= 0)
    return fail('Target benchmark score must be positive.');
  if (!Number.isFinite(input.activeDutyFraction) || input.activeDutyFraction < 0 || input.activeDutyFraction > 1)
    return fail('Active duty fraction must be between 0 and 1.');
  if (![input.inactiveBoardPowerW, input.displayPowerW, input.otherPeripheralPowerW ?? 0].every(finiteNonnegative))
    return fail('All idle, display and peripheral power inputs must be nonnegative.');
  if (!Number.isFinite(input.batteryEnergyWh) || input.batteryEnergyWh <= 0)
    return fail('Battery energy must be positive.');
  if (!Number.isFinite(input.usableFraction) || input.usableFraction <= 0 || input.usableFraction > 1)
    return fail('Usable battery fraction must be greater than zero and at most one.');

  const curve = getSocEfficiencyCurve(input.socName, input.protocol);
  if (!curve) return fail('No exact-generation measured SoC curve exists for the requested protocol.');
  const points = [...curve.points].sort((a,b) => a.benchmarkScore - b.benchmarkScore);
  const score = input.targetBenchmarkScore;
  if (score < points[0].benchmarkScore || score > points[points.length-1].benchmarkScore)
    return fail('Target workload performance lies outside the measured efficiency curve.');
  let benchmarkBoardPowerW: number | undefined;
  for (let i=1;i<points.length;i++) {
    const left=points[i-1], right=points[i];
    if(score > right.benchmarkScore) continue;
    const delta=right.benchmarkScore-left.benchmarkScore;
    const fraction=delta>0 ? (score-left.benchmarkScore)/delta : 0;
    benchmarkBoardPowerW=left.boardPowerW+(right.boardPowerW-left.boardPowerW)*fraction;
    break;
  }
  if (benchmarkBoardPowerW === undefined) return fail('Insufficient interpolation evidence.');
  // The load fraction is user-entered, not inferred from browser/gaming session length.
  const averageBoardPowerW = input.activeDutyFraction*benchmarkBoardPowerW +
    (1-input.activeDutyFraction)*input.inactiveBoardPowerW;
  const otherPeripheralPowerW=input.otherPeripheralPowerW??0;
  const totalPowerW=averageBoardPowerW+input.displayPowerW+otherPeripheralPowerW;
  if (totalPowerW <= 0) return fail('Scenario requires nonzero total device power.');
  return {
    status:'scenario',modelVersion:SOC_WORKLOAD_POWER_VERSION,
    evidence:'measured-soc-curve-plus-user-assumptions',
    socName:curve.soc,protocol:input.protocol,benchmarkBoardPowerW,
    averageBoardPowerW,displayPowerW:input.displayPowerW,
    otherPeripheralPowerW,totalPowerW,
    runtimeHours:(input.batteryEnergyWh*input.usableFraction)/totalPowerW,
    assumptions:[
      'Benchmark board power is measured at an interpolated matched performance, not the power draw of browsing or gaming.',
      'Benchmark duty cycle, idle board power, display and peripheral power are explicitly supplied scenario assumptions.',
      'The benchmark board measurement may include platform components: do not add duplicate memory or modem contributions.',
      'This result is a scenario, not a validated phone battery-life prediction.',
    ],
  };
}
