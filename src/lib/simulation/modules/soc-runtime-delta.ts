import type { RuntimeWorkload } from './corpus-runtime';
import {
  estimateSocWorkloadPower,
} from './soc-workload-power';

export const SOC_RUNTIME_DELTA_VERSION = 'soc-runtime-delta-0.1.0';

/**
 * A controlled *scenario*, not a calibrated phone-to-phone endurance gain.
 * Both chips must have exact-generation measured board-power curves at the
 * SAME score and protocol. Only a fraction of the benchmark load is assumed
 * active, so the board-power difference (not either total) is transferable.
 *
 * A full-phone runtime cohort already contains its reference SoC draw.
 * Never add the target SoC's absolute board power to the cohort.
 */
export interface SocRuntimeDeltaInput {
  targetSocName: string;
  referenceSocName: string;
  protocol: 'geekbench6' | 'steelNomadLight';
  workload: RuntimeWorkload;
  targetBenchmarkScore: number;
  activeDutyFraction: number;
}

export type SocRuntimeDeltaResult =
  | { status: 'unresolved'; reason: string; version: string }
  | {
      status: 'scenario';
      version: string;
      evidence: 'two-measured-board-curves-plus-duty-assumption';
      targetBoardPowerW: number;
      referenceBoardPowerW: number;
      deltaWholePhonePowerW: number;
      protocol: SocRuntimeDeltaInput['protocol'];
      workload: RuntimeWorkload;
      note: string;
    };

export function estimateMatchedSocRuntimeDelta(
  input: SocRuntimeDeltaInput,
): SocRuntimeDeltaResult {
  const fail = (reason: string): SocRuntimeDeltaResult => ({
    status: 'unresolved', reason, version: SOC_RUNTIME_DELTA_VERSION,
  });
  if (input.protocol === 'geekbench6' && input.workload !== 'web_browsing') {
    return fail('Geekbench CPU power can only enter the explicitly modelled browsing scenario.');
  }
  if (input.protocol === 'steelNomadLight' && input.workload !== 'gaming') {
    return fail('Steel Nomad Light GPU power can only enter the gaming scenario.');
  }
  if (!Number.isFinite(input.activeDutyFraction) ||
      input.activeDutyFraction < 0 || input.activeDutyFraction > 1) {
    return fail('The benchmark-active duty fraction must be between zero and one.');
  }
  if (!input.targetSocName.trim() || !input.referenceSocName.trim()) {
    return fail('Both target and measured reference chips are required.');
  }
  if (input.targetSocName.trim().toLowerCase() ===
      input.referenceSocName.trim().toLowerCase()) {
    return fail('Choose two distinct SoC models.');
  }
  const atScore = (socName: string) => estimateSocWorkloadPower({
    socName,
    protocol: input.protocol,
    targetBenchmarkScore: input.targetBenchmarkScore,
    activeDutyFraction: 1,
    inactiveBoardPowerW: 0,
    displayPowerW: 0,
    otherPeripheralPowerW: 0,
    // Dummy energy only to query a measured board-power point. The resulting
    // runtime is deliberately discarded and never treated as phone evidence.
    batteryEnergyWh: 1,
    usableFraction: 1,
  });
  const target = atScore(input.targetSocName);
  const reference = atScore(input.referenceSocName);
  if (target.status !== 'scenario' || reference.status !== 'scenario') {
    return fail('Both chips need an in-range, same-protocol measured board-power curve at the selected score. ' +
      (target.status !== 'scenario' ? target.reason : reference.status !== 'scenario' ? reference.reason : ''));
  }
  return {
    status: 'scenario',
    version: SOC_RUNTIME_DELTA_VERSION,
    evidence: 'two-measured-board-curves-plus-duty-assumption',
    targetBoardPowerW: target.benchmarkBoardPowerW,
    referenceBoardPowerW: reference.benchmarkBoardPowerW,
    deltaWholePhonePowerW:
      (target.benchmarkBoardPowerW - reference.benchmarkBoardPowerW) *
      input.activeDutyFraction,
    protocol: input.protocol,
    workload: input.workload,
    note: 'Matched benchmark board-power delta with user-supplied duty fraction. ' +
      'Whole-phone cohort energy already includes the reference chip; ' +
      'display and radio remain in the reference baseline. ' +
      'This is not a validated browsing/gaming energy calibration.',
  };
}
