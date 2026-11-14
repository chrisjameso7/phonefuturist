import { buildCalibrationRegistry } from './calibration-registry';
import type { DeviceCorpus } from './device-corpus';
import type { SimulationInput } from '../types';
import {
  resolveCorpusRuntimeBand,
  type RuntimeWorkload,
  type RuntimeComparableContext,
} from './corpus-runtime';

export const DISPLAY_RUNTIME_SENSITIVITY_VERSION =
  'display-runtime-sensitivity-0.1.0';

export interface DisplayRuntimeSensitivityScenario {
  scenario: '60hz' | '1080-class';
  label: string;
  workload: RuntimeWorkload;
  energyBasis: 'wh' | 'mah';
  baselineMahPerHour?: number;
  scenarioMahPerHour?: number;
  baselineWhPerHour?: number;
  scenarioWhPerHour?: number;
  deltaDrainPercent: number;
  baselineRuntimeHours: number;
  scenarioRuntimeHours: number;
  deltaRuntimePercent: number;
  referenceCount: number;
  averageCoverage: number;
  averageSimilarity: number;
}

export interface DisplayRuntimeSensitivityResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  scenarios: DisplayRuntimeSensitivityScenario[];
  unresolvedReasons: string[];
  note: string;
}

const WORKLOADS: RuntimeWorkload[] = [
  'web_browsing',
  'video_playback',
  'gaming',
];

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function batteryCapacityMah(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];

  if (
    !cells.length ||
    !cells.every((cell) => positive(cell.capacityMah))
  ) {
    return undefined;
  }

  return cells.reduce(
    (sum, cell) => sum + cell.capacityMah!,
    0,
  );
}
function batteryEnergyWh(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];

  if (
    !cells.length ||
    !cells.every(
      (cell) =>
        positive(cell.capacityMah) &&
        positive(cell.nominalVoltageV),
    )
  ) {
    return undefined;
  }

  return cells.reduce(
    (sum, cell) =>
      sum +
      (cell.capacityMah! *
        cell.nominalVoltageV!) /
        1000,
    0,
  );
}


function withDisplayScenario(
  input: SimulationInput,
  scenario: '60hz' | '1080-class',
): SimulationInput | undefined {
  const display = input.displays.primary;

  if (scenario === '60hz') {
    if (
      !positive(display.refreshRateHz) ||
      display.refreshRateHz <= 60
    ) {
      return undefined;
    }

    return {
      ...input,
      displays: {
        ...input.displays,
        primary: {
          ...display,
          refreshRateHz: 60,
        },
      },
    };
  }

  if (
    !positive(display.resolutionWidthPx) ||
    !positive(display.resolutionHeightPx) ||
    display.resolutionWidthPx <= 1080
  ) {
    return undefined;
  }

  const targetWidth = 1080;
  const targetHeight = Math.round(
    display.resolutionHeightPx *
      (targetWidth / display.resolutionWidthPx),
  );

  return {
    ...input,
    displays: {
      ...input.displays,
      primary: {
        ...display,
        resolutionWidthPx: targetWidth,
        resolutionHeightPx: targetHeight,
      },
    },
  };
}

function evidenceStrongEnough(
  band: ReturnType<typeof resolveCorpusRuntimeBand>,
) {
  return (
    band.status === 'resolved' &&
    band.estimate !== undefined &&
    band.estimate.referenceCount >= 3 &&
    band.estimate.averageCoverage >= 0.5 &&
    band.estimate.averageSimilarity >= 0.45
  );
}

export function resolveDisplayRuntimeSensitivity(
  corpus: DeviceCorpus,
  input: SimulationInput,
  context: RuntimeComparableContext = {},
): DisplayRuntimeSensitivityResult {
  const capacityMah = batteryCapacityMah(input);
  const energyWh = batteryEnergyWh(input);

  if (!capacityMah) {
    return {
      version: DISPLAY_RUNTIME_SENSITIVITY_VERSION,
      status: 'unresolved',
      scenarios: [],
      unresolvedReasons: [
        'Battery capacity is required for display runtime sensitivity.',
      ],
      note:
        'No direct display power constant is used. Sensitivity is inferred only from protocol-compatible measured runtime comparables.',
    };
  }

  const scenarios: DisplayRuntimeSensitivityScenario[] = [];
  const unresolvedReasons: string[] = [];

  for (const workload of WORKLOADS) {
    const baseline = resolveCorpusRuntimeBand(
      corpus,
      input,
      workload,
      {},
      context,
    );

    if (!evidenceStrongEnough(baseline)) {
      unresolvedReasons.push(
        `${workload}: baseline runtime evidence is too weak for display sensitivity.`,
      );
      continue;
    }

    for (const scenario of [
      '60hz',
      '1080-class',
    ] as const) {
      const scenarioInput = withDisplayScenario(
        input,
        scenario,
      );

      if (!scenarioInput) continue;

      const shifted = resolveCorpusRuntimeBand(
        corpus,
        scenarioInput,
        workload,
        {},
        context,
      );

      if (!evidenceStrongEnough(shifted)) {
        unresolvedReasons.push(
          `${workload} / ${scenario}: shifted runtime evidence is too weak.`,
        );
        continue;
      }

      const useWh =
        energyWh !== undefined &&
        baseline.estimate!.energyBasis === 'wh' &&
        shifted.estimate!.energyBasis === 'wh' &&
        baseline.estimate!.expectedWhPerHour !== undefined &&
        shifted.estimate!.expectedWhPerHour !== undefined;

      const baselineDrain = useWh
        ? baseline.estimate!.expectedWhPerHour!
        : baseline.estimate!.expectedMahPerHour;
      const shiftedDrain = useWh
        ? shifted.estimate!.expectedWhPerHour!
        : shifted.estimate!.expectedMahPerHour;
      const availableEnergy = useWh
        ? energyWh!
        : capacityMah;

      const baselineRuntime =
        availableEnergy / baselineDrain;
      const shiftedRuntime =
        availableEnergy / shiftedDrain;

      scenarios.push({
        scenario,
        label:
          scenario === '60hz'
            ? 'Refresh rate → 60 Hz'
            : 'Resolution → 1080-class',
        workload,
        energyBasis: useWh ? 'wh' : 'mah',
        ...(useWh
          ? {
              baselineWhPerHour:
                baselineDrain,
              scenarioWhPerHour:
                shiftedDrain,
            }
          : {
              baselineMahPerHour:
                baselineDrain,
              scenarioMahPerHour:
                shiftedDrain,
            }),
        deltaDrainPercent:
          ((shiftedDrain / baselineDrain) - 1) * 100,
        baselineRuntimeHours: baselineRuntime,
        scenarioRuntimeHours: shiftedRuntime,
        deltaRuntimePercent:
          ((shiftedRuntime / baselineRuntime) - 1) *
          100,
        referenceCount: Math.min(
          baseline.estimate!.referenceCount,
          shifted.estimate!.referenceCount,
        ),
        averageCoverage:
          (
            baseline.estimate!.averageCoverage +
            shifted.estimate!.averageCoverage
          ) / 2,
        averageSimilarity:
          (
            baseline.estimate!.averageSimilarity +
            shifted.estimate!.averageSimilarity
          ) / 2,
      });
    }
  }

  return {
    version: DISPLAY_RUNTIME_SENSITIVITY_VERSION,
    status:
      scenarios.length >= 4
        ? 'resolved'
        : scenarios.length > 0
          ? 'partial'
          : 'unresolved',
    scenarios,
    unresolvedReasons,
    note:
      'These deltas come from shifts in protocol-compatible measured runtime comparables after changing display resolution or refresh rate. Wh/h is used when both target and comparison bands have accepted energy evidence; otherwise the model falls back to mAh/h. They are evidence-derived scenario estimates, not direct electrical panel-power measurements.',
  };
}


export function resolveLiveDisplayRuntimeSensitivity(
  input: SimulationInput,
  context: RuntimeComparableContext = {},
): DisplayRuntimeSensitivityResult {
  return resolveDisplayRuntimeSensitivity(
    buildCalibrationRegistry(),
    input,
    context,
  );
}
