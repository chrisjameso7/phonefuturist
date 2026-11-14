import type { SimulationResult } from '../types';
import {
  createPredictionSnapshot,
  type PredictionMetric,
  type PredictionSnapshot,
} from './prediction-validation';

export const PREDICTION_SNAPSHOT_BUILDER_VERSION =
  'prediction-snapshot-builder-0.1.0';

export interface PredictionSnapshotExperienceMetrics {
  wiredFullChargeMinutes?: number;
  webRuntimeHours?: number;
  videoRuntimeHours?: number;
  gamingRuntimeHours?: number;
  sustainedPerformancePercent?: number;
  peakBenchmarkScore?: number;
  peakBenchmarkLabel?: string;
  peakBenchmarkProvenance?:
    | 'measured-calibrated'
    | 'assumption-adjusted';
  displayPanelPowerW?: number;
  displayPanelPowerProvenance?:
    | 'measured-calibrated'
    | 'derived';
}

export interface BuildPredictionSnapshotInput {
  deviceName: string;
  simulation: SimulationResult;
  corpusVersion?: string;
  simulatorVersion?: string;
  experiences?: PredictionSnapshotExperienceMetrics;
  assumptions?: Record<string, unknown>;
  id?: string;
  createdAt?: string;
  note?: string;
}

function pushMetric(
  metrics: PredictionMetric[],
  metric: PredictionMetric,
) {
  if (
    Number.isFinite(metric.value)
  ) {
    metrics.push(metric);
  }
}

export function buildPredictionSnapshot(
  input: BuildPredictionSnapshotInput,
): PredictionSnapshot {
  const metrics: PredictionMetric[] = [];

  if (
    input.simulation.battery
      ?.totalCapacityMah !== undefined
  ) {
    pushMetric(metrics, {
      key: 'battery_capacity_mah',
      label: 'Battery capacity',
      value:
        input.simulation.battery
          .totalCapacityMah,
      unit: 'mAh',
      direction: 'higher-is-better',
      provenance: 'deterministic',
    });
  }

  if (
    input.simulation.battery
      ?.totalEnergyWh !== undefined
  ) {
    pushMetric(metrics, {
      key: 'battery_energy_wh',
      label: 'Battery energy',
      value:
        input.simulation.battery
          .totalEnergyWh,
      unit: 'Wh',
      direction: 'higher-is-better',
      provenance: 'deterministic',
    });
  }

  if (
    input.simulation.displays.primary
      .screenToBodyRatio !== undefined
  ) {
    pushMetric(metrics, {
      key: 'screen_to_body_ratio',
      label: 'Screen-to-body ratio',
      value:
        input.simulation.displays.primary
          .screenToBodyRatio,
      unit: 'ratio',
      direction: 'higher-is-better',
      provenance: 'deterministic',
    });
  }

  const experience =
    input.experiences;

  if (
    experience?.wiredFullChargeMinutes !==
    undefined
  ) {
    pushMetric(metrics, {
      key: 'wired_full_charge_minutes',
      label: 'Wired 0–100% charge time',
      value:
        experience.wiredFullChargeMinutes,
      unit: 'minutes',
      direction: 'lower-is-better',
      provenance: 'measured-calibrated',
    });
  }

  for (const [key, label, value] of [
    [
      'web_runtime_hours',
      'Web browsing runtime',
      experience?.webRuntimeHours,
    ],
    [
      'video_runtime_hours',
      'Video playback runtime',
      experience?.videoRuntimeHours,
    ],
    [
      'gaming_runtime_hours',
      'Gaming runtime',
      experience?.gamingRuntimeHours,
    ],
  ] as const) {
    if (value !== undefined) {
      pushMetric(metrics, {
        key,
        label,
        value,
        unit: 'hours',
        direction: 'higher-is-better',
        provenance: 'measured-calibrated',
      });
    }
  }

  if (
    experience
      ?.sustainedPerformancePercent !==
    undefined
  ) {
    pushMetric(metrics, {
      key:
        'sustained_performance_percent',
      label: 'Sustained performance',
      value:
        experience
          .sustainedPerformancePercent,
      unit: 'percent',
      direction: 'higher-is-better',
      provenance: 'measured-calibrated',
    });
  }

  if (
    experience?.peakBenchmarkScore !==
    undefined
  ) {
    pushMetric(metrics, {
      key: 'peak_benchmark_score',
      label:
        experience.peakBenchmarkLabel ??
        'Peak benchmark score',
      value:
        experience.peakBenchmarkScore,
      unit: 'points',
      direction: 'higher-is-better',
      provenance:
        experience
          .peakBenchmarkProvenance ??
        'measured-calibrated',
    });
  }

  if (
    experience?.displayPanelPowerW !==
    undefined
  ) {
    pushMetric(metrics, {
      key: 'display_panel_power_w',
      label: 'Display panel power',
      value:
        experience.displayPanelPowerW,
      unit: 'W',
      direction: 'lower-is-better',
      provenance:
        experience
          .displayPanelPowerProvenance ??
        'measured-calibrated',
    });
  }

  return createPredictionSnapshot({
    id: input.id,
    createdAt: input.createdAt,
    deviceName:
      input.deviceName,
    engineVersion:
      input.simulation.engineVersion,
    corpusVersion:
      input.corpusVersion,
    simulatorVersion:
      input.simulatorVersion,
    metrics,
    ...(input.assumptions
      ? {
          assumptions:
            input.assumptions,
        }
      : {}),
    note:
      input.note ??
      'Frozen PhoneFuturist simulation prediction snapshot. Missing or unresolved simulation domains are intentionally omitted rather than filled with placeholder values.',
  });
}
