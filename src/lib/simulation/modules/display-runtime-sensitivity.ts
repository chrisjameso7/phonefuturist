import { buildCalibrationRegistry } from './calibration-registry';
import type { DeviceCorpus } from './device-corpus';
import type { SimulationInput } from '../types';
import {
  resolveCorpusRuntimeBand,
  type RuntimeWorkload,
} from './corpus-runtime';

export const DISPLAY_RUNTIME_SENSITIVITY_VERSION =
  'display-runtime-sensitivity-0.1.0';

export interface DisplayRuntimeSensitivityScenario {
  scenario: '60hz' | '1080-class';
  label: string;
  workload: RuntimeWorkload;
  baselineMahPerHour: number;
  scenarioMahPerHour: number;
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
): DisplayRuntimeSensitivityResult {
  const capacityMah = batteryCapacityMah(input);

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
      );

      if (!evidenceStrongEnough(shifted)) {
        unresolvedReasons.push(
          `${workload} / ${scenario}: shifted runtime evidence is too weak.`,
        );
        continue;
      }

      const baselineDrain =
        baseline.estimate!.expectedMahPerHour;
      const shiftedDrain =
        shifted.estimate!.expectedMahPerHour;

      const baselineRuntime =
        capacityMah / baselineDrain;
      const shiftedRuntime =
        capacityMah / shiftedDrain;

      scenarios.push({
        scenario,
        label:
          scenario === '60hz'
            ? 'Refresh rate → 60 Hz'
            : 'Resolution → 1080-class',
        workload,
        baselineMahPerHour: baselineDrain,
        scenarioMahPerHour: shiftedDrain,
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
      'These deltas come from shifts in protocol-compatible measured runtime comparables after changing display resolution or refresh rate. They are evidence-derived scenario estimates, not direct electrical panel-power measurements.',
  };
}


export function resolveLiveDisplayRuntimeSensitivity(
  input: SimulationInput,
): DisplayRuntimeSensitivityResult {
  return resolveDisplayRuntimeSensitivity(
    buildCalibrationRegistry(),
    input,
  );
}
