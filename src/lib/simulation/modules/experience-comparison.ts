import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';
import type { SimulationSnapshot } from '../simulation-snapshot';
import { compareSimulationToReleasedDevice } from './real-device-comparison';
import { resolveCorpusRuntimeBand } from './corpus-runtime';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';
import { calculateCamera } from './camera';

export const EXPERIENCE_COMPARISON_VERSION = 'experience-comparison-0.1.0';

export interface ExperienceDelta {
  domain: 'battery' | 'charging' | 'camera' | 'thermal';
  label: string;
  simulated?: number;
  released?: number;
  unit?: string;
  delta?: number;
  deltaPercent?: number;
  confidence?: number;
  basis: string;
}

export interface ExperienceComparison {
  version: string;
  status: 'resolved' | 'ambiguous' | 'unresolved';
  releasedQuery: string;
  releasedVariantId?: string;
  deltas: ExperienceDelta[];
  note?: string;
}

function pctDelta(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
  return ((a - b) / b) * 100;
}

function capacityOf(device: DeviceCorpusRecord) {
  return (
    device.variant.battery?.capacityMah ??
    device.variant.battery?.typicalCapacityMah
  );
}

function simulatedCapacity(snapshot: SimulationSnapshot) {
  const cells = snapshot.input.battery?.cells ?? [];
  if (!cells.length || cells.some((cell) => !Number.isFinite(cell.capacityMah))) {
    return undefined;
  }
  return cells.reduce((sum, cell) => sum + (cell.capacityMah ?? 0), 0);
}

function releasedRuntimeMahPerHour(
  corpus: DeviceCorpus,
  device: DeviceCorpusRecord,
  workload: 'web_browsing' | 'video_playback' | 'gaming',
) {
  const capacity = capacityOf(device);
  if (!capacity) return undefined;

  const runtime = corpus.measurements.find(
    (measurement) =>
      measurement.deviceVariantId === device.variant.id &&
      measurement.workload === workload &&
      measurement.metric.toLowerCase().includes('runtime') &&
      measurement.unit.toLowerCase() === 'hours' &&
      measurement.value > 0,
  );

  if (!runtime) return undefined;
  return capacity / runtime.value;
}

export function compareSimulationExperienceToReleasedDevice(
  corpus: DeviceCorpus,
  snapshot: SimulationSnapshot,
  releasedQuery: string,
): ExperienceComparison {
  const base = compareSimulationToReleasedDevice(
    corpus,
    snapshot,
    releasedQuery,
  );

  if (base.status !== 'resolved' || !base.releasedVariant) {
    return {
      version: EXPERIENCE_COMPARISON_VERSION,
      status: base.status,
      releasedQuery,
      deltas: [],
      note: base.note,
    };
  }

  const released = base.releasedVariant;
  const deltas: ExperienceDelta[] = [];
  const simCapacity = simulatedCapacity(snapshot);
  const releasedCapacity = capacityOf(released);

  if (simCapacity !== undefined && releasedCapacity !== undefined) {
    deltas.push({
      domain: 'battery',
      label: 'Battery capacity',
      simulated: simCapacity,
      released: releasedCapacity,
      unit: 'mAh',
      delta: simCapacity - releasedCapacity,
      deltaPercent: pctDelta(simCapacity, releasedCapacity),
      confidence: 1,
      basis: 'declared hardware capacity',
    });
  }

  for (const workload of ['web_browsing', 'video_playback', 'gaming'] as const) {
    const simulatedBand = resolveCorpusRuntimeBand(
      corpus,
      snapshot.input,
      workload,
    );
    const releasedDrain = releasedRuntimeMahPerHour(corpus, released, workload);

    if (
      simulatedBand.status === 'resolved' &&
      simulatedBand.estimate &&
      releasedDrain !== undefined
    ) {
      const simulatedDrain = simulatedBand.estimate.expectedMahPerHour;
      deltas.push({
        domain: 'battery',
        label:
          workload === 'web_browsing'
            ? 'Web battery drain'
            : workload === 'video_playback'
              ? 'Video battery drain'
              : 'Gaming battery drain',
        simulated: simulatedDrain,
        released: releasedDrain,
        unit: 'mAh/h',
        delta: simulatedDrain - releasedDrain,
        deltaPercent: pctDelta(simulatedDrain, releasedDrain),
        confidence: simulatedBand.estimate.confidence,
        basis: 'comparable-device calibrated runtime',
      });
    }
  }

  const wiredWatts = snapshot.deviceContext?.charging?.wiredWatts;

  if (
    simCapacity !== undefined &&
    wiredWatts !== undefined
  ) {
    const charging = estimateChargingFromCorpus(corpus, {
      batteryMah: simCapacity,
      wiredChargingWatts: wiredWatts,
      manufacturer: snapshot.deviceContext?.manufacturer,
      region: snapshot.deviceContext?.region,
      batteryChemistry: snapshot.deviceContext?.batteryChemistry,
      cellArchitecture: snapshot.deviceContext?.cellArchitecture,
      chargingStandard:
        snapshot.deviceContext?.charging?.wiredChargingStandard,
      displayDiagonalInches: snapshot.input.displays.primary.diagonalInches,
      thicknessMm: snapshot.input.dimensions?.thicknessMm,
      weightG: snapshot.input.dimensions?.weightG,
    });

    const releasedFull = corpus.measurements.find(
      (measurement) =>
        measurement.deviceVariantId === released.variant.id &&
        measurement.workload === 'charging' &&
        measurement.metric === 'wiredFullChargeMinutes' &&
        measurement.unit === 'minutes',
    );

    if (
      charging.status === 'resolved' &&
      charging.estimate?.timeTo100Minutes &&
      releasedFull
    ) {
      const simulatedFullMinutes =
        charging.estimate.timeTo100Minutes.expected;

      deltas.push({
        domain: 'charging',
        label: 'Full wired charge time',
        simulated: simulatedFullMinutes,
        released: releasedFull.value,
        unit: 'min',
        delta: simulatedFullMinutes - releasedFull.value,
        deltaPercent: pctDelta(
          simulatedFullMinutes,
          releasedFull.value,
        ),
        confidence: charging.estimate.confidence,
        basis: 'comparable-device charging curve',
      });
    }
  }

  const simMain = snapshot.input.cameras?.find((camera) => camera.type === 'wide');
  const releasedMain = released.cameras?.find(
    (camera) => camera.role.toLowerCase() === 'wide',
  );

  if (simMain && releasedMain) {
    const simulated = calculateCamera(simMain).result;
    const releasedCalc = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: releasedMain.sensorFormatDenominator,
      resolutionMp: releasedMain.resolutionMp,
      apertureFNumber: releasedMain.apertureFNumber,
      equivalentFocalLengthMm: releasedMain.equivalentFocalLengthMm,
    }).result;

    if (
      simulated.geometricLightCaptureIndex !== undefined &&
      releasedCalc.geometricLightCaptureIndex !== undefined
    ) {
      deltas.push({
        domain: 'camera',
        label: 'Geometric main-camera light capture',
        simulated: simulated.geometricLightCaptureIndex,
        released: releasedCalc.geometricLightCaptureIndex,
        delta:
          simulated.geometricLightCaptureIndex -
          releasedCalc.geometricLightCaptureIndex,
        deltaPercent: pctDelta(
          simulated.geometricLightCaptureIndex,
          releasedCalc.geometricLightCaptureIndex,
        ),
        confidence: 0.65,
        basis:
          'sensor area and aperture geometry only; processing and sensor efficiency excluded',
      });
    }
  }

  return {
    version: EXPERIENCE_COMPARISON_VERSION,
    status: 'resolved',
    releasedQuery,
    releasedVariantId: released.variant.id,
    deltas,
    note:
      'Experience deltas mix declared hardware differences with calibrated estimates. Each row reports its basis and confidence.',
  };
}
