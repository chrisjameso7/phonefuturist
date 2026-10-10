import { useMemo, useState } from 'react';

import BetaFeedbackPanel from './BetaFeedbackPanel';
import SimpleModePanel from './SimpleModePanel';

import {
  expandSimpleMode,
  type SimpleModeInput,
} from '../../lib/simulation/simple-mode';

import {
  SIMULATION_ENGINE_VERSION,
  simulateDevice,
} from '../../lib/simulation/engine';

import type {
  DeviceFormFactor,
  SimulationInput,
} from '../../lib/simulation/types';

import type {
  CameraInput,
  CameraModuleType,
} from '../../lib/simulation/modules/camera';

import {
  LIVE_BATTERY_EXPERIENCE_VERSION,
  simulateLiveBatteryExperience,
} from '../../lib/simulation/live-battery-experience';

import {
  LIVE_THERMAL_EXPERIENCE_VERSION,
  simulateLiveThermalExperience,
} from '../../lib/simulation/live-thermal-experience';

import {
  LIVE_CAMERA_EXPERIENCE_VERSION,
  simulateLiveCameraExperience,
} from '../../lib/simulation/live-camera-experience';

import {
  CAMERA_ZOOM_HANDOFF_VERSION,
  resolveCameraZoomHandoff,
} from '../../lib/simulation/modules/camera-zoom-handoff';

import {
  LIVE_DISPLAY_EXPERIENCE_VERSION,
  simulateLiveDisplayExperience,
} from '../../lib/simulation/live-display-experience';

import {
  DISPLAY_RUNTIME_SENSITIVITY_VERSION,
  resolveLiveDisplayRuntimeSensitivity,
} from '../../lib/simulation/modules/display-runtime-sensitivity';

import {
  SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION,
  estimateLiveSustainedPerformance,
} from '../../lib/simulation/modules/sustained-performance-estimator';

import {
  PEAK_PERFORMANCE_ESTIMATOR_VERSION,
  estimateLivePeakPerformance,
  type PeakBenchmarkDomain,
} from '../../lib/simulation/modules/peak-performance-estimator';

import {
  simulateTwoNodeThermals,
} from '../../lib/simulation/modules/two-node-thermal';

import {
  SOC_ARCHITECTURE_MODEL_VERSION,
  calculateSocArchitecture,
} from '../../lib/simulation/modules/soc-architecture';

import {
  buildPredictionSnapshot,
} from '../../lib/simulation/modules/prediction-snapshot-builder';

type NumericFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  suffix?: string;
  step?: string;
  onChange: (value: string) => void;
};

type CameraDraft = {
  id: number;
  type: CameraModuleType;
  sensorFormatDenominator: string;
  sensorWidthMm?: string;
  sensorHeightMm?: string;
  resolutionMp: string;
  equivalentFocalLengthMm: string;
  physicalFocalLengthMm: string;
  apertureFNumber: string;
  exposureTimeSeconds?: string;
  sensorReadoutTimeSeconds?: string;
  videoFrameRateFps?: string;
  subjectAngularSpeedDegPerSecond?: string;
  cameraAngularShakeDegPerSecond?: string;
  oisAngularCompensationFraction?: string;
  lensTransmissionFraction?: string;
  quantumEfficiencyFraction?: string;
  binningLinearFactor?: string;
  cropZoomRatio?: string;
  targetOutputResolutionMp?: string;
  focusDistanceM: string;
  moduleWidthMm: string;
  moduleHeightMm: string;
  moduleDepthMm: string;
};

type FormState = {
  name: string;
  manufacturer: string;
  formFactor: DeviceFormFactor;

  widthMm: string;
  heightMm: string;
  thicknessMm: string;
  weightG: string;

  diagonalInches: string;
  resolutionWidthPx: string;
  resolutionHeightPx: string;
  aspectWidth: string;
  aspectHeight: string;
  refreshRateHz: string;
  operatingRefreshRateHz: string;
  brightnessNits: string;
  averagePictureLevelPercent: string;
  panelTechnology: string;

  bezelTopMm: string;
  bezelRightMm: string;
  bezelBottomMm: string;
  bezelLeftMm: string;

  batteryCapacityMah: string;
  batteryVoltageV: string;
  webHours: string;
  videoHours: string;
  gamingHours: string;
  cameraHours: string;
  zoomTargetEquivalentFocalLengthMm: string;
  zoomMinimumOutputResolutionMp: string;
  wiredChargeW: string;
  wirelessChargeW: string;
  batteryChemistry: string;
  cellArchitecture: 'unknown' | 'single-cell' | 'dual-cell';
  chargingStandard: string;
  wirelessChargingStandard: string;

  socVendor: string;
  socName: string;
  socFabricationNodeNm: string;
  socMemoryBandwidthGbps: string;
  socCluster1Cores: string;
  socCluster1ClockGhz: string;
  socCluster1RelativeIpc: string;
  socCluster2Cores: string;
  socCluster2ClockGhz: string;
  socCluster2RelativeIpc: string;
  socCluster3Cores: string;
  socCluster3ClockGhz: string;
  socCluster3RelativeIpc: string;
  socCluster4Cores: string;
  socCluster4ClockGhz: string;
  socCluster4RelativeIpc: string;
  coolingClass:
    | 'unknown'
    | 'passive-graphite'
    | 'vapor-chamber'
    | 'large-vapor-chamber'
    | 'active-fan'
    | 'other';
  thermalDomain:
    | 'cpu_sustained'
    | 'gpu_sustained'
    | 'gaming_sustained'
    | 'ray_tracing';
  peakBenchmarkDomain: PeakBenchmarkDomain;
  assumedGenerationUpliftPercent: string;
  targetSocPowerW: string;
  ambientTemperatureC: string;
  thermalResistanceCPerW: string;
  thermalMassJPerC: string;
  throttleTemperatureC: string;
  thermalDurationSeconds: string;

  socToChassisResistanceCPerW: string;
  chassisToAmbientResistanceCPerW: string;
  socThermalMassJPerC: string;
  chassisThermalMassJPerC: string;
  surfaceComfortTemperatureC: string;
  socPackageThrottleTemperatureC: string;

  batteryWidthMm: string;
  batteryHeightMm: string;
  batteryThicknessMm: string;
  batteryWeightG: string;

  reservedVolumePercent: string;
  thermalMm3: string;
  boardMm3: string;
  speakersMm3: string;
  otherMm3: string;
};

const initialForm: FormState = {
  name: '',
  manufacturer: '',
  formFactor: 'phone',

  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  weightG: '',

  diagonalInches: '',
  resolutionWidthPx: '',
  resolutionHeightPx: '',
  aspectWidth: '',
  aspectHeight: '',
  refreshRateHz: '',
  operatingRefreshRateHz: '',
  brightnessNits: '',
  averagePictureLevelPercent: '',
  panelTechnology: '',

  bezelTopMm: '',
  bezelRightMm: '',
  bezelBottomMm: '',
  bezelLeftMm: '',

  batteryCapacityMah: '',
  batteryVoltageV: '',
  webHours: '',
  videoHours: '',
  gamingHours: '',
  cameraHours: '',
  zoomTargetEquivalentFocalLengthMm: '',
  zoomMinimumOutputResolutionMp: '',
  wiredChargeW: '',
  wirelessChargeW: '',
  batteryChemistry: '',
  cellArchitecture: 'unknown',
  chargingStandard: '',
  wirelessChargingStandard: '',

  socVendor: '',
  socName: '',
  socFabricationNodeNm: '',
  socMemoryBandwidthGbps: '',
  socCluster1Cores: '',
  socCluster1ClockGhz: '',
  socCluster1RelativeIpc: '',
  socCluster2Cores: '',
  socCluster2ClockGhz: '',
  socCluster2RelativeIpc: '',
  socCluster3Cores: '',
  socCluster3ClockGhz: '',
  socCluster3RelativeIpc: '',
  socCluster4Cores: '',
  socCluster4ClockGhz: '',
  socCluster4RelativeIpc: '',
  coolingClass: 'unknown',
  thermalDomain: 'gpu_sustained',
  peakBenchmarkDomain: 'geekbench6_multi',
  assumedGenerationUpliftPercent: '',
  targetSocPowerW: '',
  ambientTemperatureC: '',
  thermalResistanceCPerW: '',
  thermalMassJPerC: '',
  throttleTemperatureC: '',
  thermalDurationSeconds: '',

  socToChassisResistanceCPerW: '',
  chassisToAmbientResistanceCPerW: '',
  socThermalMassJPerC: '',
  chassisThermalMassJPerC: '',
  surfaceComfortTemperatureC: '',
  socPackageThrottleTemperatureC: '',

  batteryWidthMm: '',
  batteryHeightMm: '',
  batteryThicknessMm: '',
  batteryWeightG: '',

  reservedVolumePercent: '',
  thermalMm3: '',
  boardMm3: '',
  speakersMm3: '',
  otherMm3: '',
};

const flagshipExample: FormState = {
  name: 'Flagship reference',
  manufacturer: 'Samsung',
  formFactor: 'phone',

  widthMm: '75',
  heightMm: '160',
  thicknessMm: '8',
  weightG: '195',

  diagonalInches: '6.7',
  resolutionWidthPx: '1440',
  resolutionHeightPx: '3200',
  aspectWidth: '9',
  aspectHeight: '20',
  refreshRateHz: '120',
  operatingRefreshRateHz: '120',
  brightnessNits: '1000',
  averagePictureLevelPercent: '50',
  panelTechnology: 'LTPO OLED',

  bezelTopMm: '1.5',
  bezelRightMm: '1.5',
  bezelBottomMm: '1.5',
  bezelLeftMm: '1.5',

  batteryCapacityMah: '5000',
  batteryVoltageV: '3.85',
  webHours: '2',
  videoHours: '2',
  gamingHours: '1',
  cameraHours: '0',
  zoomTargetEquivalentFocalLengthMm: '120',
  zoomMinimumOutputResolutionMp: '12',
  wiredChargeW: '60',
  wirelessChargeW: '25',
  batteryChemistry: 'silicon-carbon',
  cellArchitecture: 'single-cell',
  chargingStandard: 'USB PD/PPS',
  wirelessChargingStandard: 'Qi2',

  socVendor: 'Qualcomm',
  socName: 'Snapdragon 8 Elite Gen 5',
  socFabricationNodeNm: '',
  socMemoryBandwidthGbps: '',
  socCluster1Cores: '',
  socCluster1ClockGhz: '',
  socCluster1RelativeIpc: '',
  socCluster2Cores: '',
  socCluster2ClockGhz: '',
  socCluster2RelativeIpc: '',
  socCluster3Cores: '',
  socCluster3ClockGhz: '',
  socCluster3RelativeIpc: '',
  socCluster4Cores: '',
  socCluster4ClockGhz: '',
  socCluster4RelativeIpc: '',
  coolingClass: 'large-vapor-chamber',
  thermalDomain: 'gpu_sustained',
  peakBenchmarkDomain: 'geekbench6_multi',
  assumedGenerationUpliftPercent: '',
  targetSocPowerW: '10',
  ambientTemperatureC: '25',
  thermalResistanceCPerW: '3',
  thermalMassJPerC: '45',
  throttleTemperatureC: '42',
  thermalDurationSeconds: '600',

  socToChassisResistanceCPerW: '',
  chassisToAmbientResistanceCPerW: '',
  socThermalMassJPerC: '',
  chassisThermalMassJPerC: '',
  surfaceComfortTemperatureC: '',
  socPackageThrottleTemperatureC: '',

  batteryWidthMm: '60',
  batteryHeightMm: '80',
  batteryThicknessMm: '5',
  batteryWeightG: '70',

  reservedVolumePercent: '20',
  thermalMm3: '4000',
  boardMm3: '12000',
  speakersMm3: '5000',
  otherMm3: '7000',
};

const flagshipCameras: CameraDraft[] = [
  {
    id: 1,
    type: 'wide',
    sensorFormatDenominator: '1.3',
    sensorWidthMm: '',
    sensorHeightMm: '',
    resolutionMp: '50',
    equivalentFocalLengthMm: '24',
    physicalFocalLengthMm: '6.5',
    apertureFNumber: '1.6',
    focusDistanceM: '',
    moduleWidthMm: '20',
    moduleHeightMm: '20',
    moduleDepthMm: '6',
  },
  {
    id: 2,
    type: 'periscope',
    sensorFormatDenominator: '2.5',
    sensorWidthMm: '',
    sensorHeightMm: '',
    resolutionMp: '50',
    equivalentFocalLengthMm: '120',
    physicalFocalLengthMm: '20',
    apertureFNumber: '2.8',
    focusDistanceM: '',
    moduleWidthMm: '20',
    moduleHeightMm: '15',
    moduleDepthMm: '6',
  },
];

function numeric(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function format(
  value: number | undefined,
  digits = 1,
): string {
  if (value === undefined) return 'Unknown';

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatDurationMinutes(
  minutes: number | undefined,
): string {
  if (minutes === undefined || !Number.isFinite(minutes)) {
    return 'Unknown';
  }

  const rounded = Math.max(0, Math.round(minutes));

  if (rounded < 120) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function formatDurationSeconds(
  seconds: number | undefined,
): string {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return 'Unknown';
  }

  const rounded = Math.max(0, Math.round(seconds));

  if (rounded < 60) {
    return `${rounded} s`;
  }

  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds} s`
      : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}


function cameraOutcomeLabel(domain: string) {
  switch (domain) {
    case 'sharpness_timing':
      return 'Photo sharpness & timing';
    case 'video_stabilization':
      return 'Video stabilization';
    case 'photo_texture':
      return 'Photo texture / detail';
    case 'stabilization_crop':
      return 'Stabilization crop';
    case 'video_thermal_limit':
      return 'Video thermal limit';
    case 'low_light_exposure':
      return 'Low-light exposure';
    case 'resolved_detail':
      return 'Resolved detail';
    default:
      return domain.replaceAll('_', ' ');
  }
}

function NumericField({
  label,
  value,
  placeholder,
  suffix,
  step = 'any',
  onChange,
}: NumericFieldProps) {
  return (
    <label className="il-field">
      <span>
        {label}
        {suffix ? <small>{suffix}</small> : null}
      </span>

      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.currentTarget.value)
        }
      />
    </label>
  );
}

function emptyCamera(id: number): CameraDraft {
  return {
    id,
    type: 'wide',
    sensorFormatDenominator: '',
    sensorWidthMm: '',
    sensorHeightMm: '',
    resolutionMp: '',
    equivalentFocalLengthMm: '',
    physicalFocalLengthMm: '',
    apertureFNumber: '',
    exposureTimeSeconds: '',
    sensorReadoutTimeSeconds: '',
    videoFrameRateFps: '',
    subjectAngularSpeedDegPerSecond: '',
    cameraAngularShakeDegPerSecond: '',
    oisAngularCompensationFraction: '',
    lensTransmissionFraction: '',
    quantumEfficiencyFraction: '',
    binningLinearFactor: '',
    cropZoomRatio: '',
    targetOutputResolutionMp: '',
    focusDistanceM: '',
    moduleWidthMm: '',
    moduleHeightMm: '',
    moduleDepthMm: '',
  };
}

function cameraInput(
  camera: CameraDraft,
): CameraInput {
  return {
    type: camera.type,

    sensorFormatDenominator: numeric(
      camera.sensorFormatDenominator,
    ),

    sensorWidthMm: numeric(
      camera.sensorWidthMm ?? '',
    ),

    sensorHeightMm: numeric(
      camera.sensorHeightMm ?? '',
    ),

    resolutionMp: numeric(camera.resolutionMp),

    equivalentFocalLengthMm: numeric(
      camera.equivalentFocalLengthMm,
    ),

    physicalFocalLengthMm: numeric(
      camera.physicalFocalLengthMm,
    ),

    apertureFNumber: numeric(
      camera.apertureFNumber,
    ),

    exposureTimeSeconds: numeric(
      camera.exposureTimeSeconds ?? '',
    ),

    sensorReadoutTimeSeconds: numeric(
      camera.sensorReadoutTimeSeconds ?? '',
    ),

    videoFrameRateFps: numeric(
      camera.videoFrameRateFps ?? '',
    ),

    subjectAngularSpeedDegPerSecond: numeric(
      camera.subjectAngularSpeedDegPerSecond ?? '',
    ),

    cameraAngularShakeDegPerSecond: numeric(
      camera.cameraAngularShakeDegPerSecond ?? '',
    ),

    oisAngularCompensationFraction: numeric(
      camera.oisAngularCompensationFraction ?? '',
    ),

    lensTransmissionFraction: numeric(
      camera.lensTransmissionFraction ?? '',
    ),

    quantumEfficiencyFraction: numeric(
      camera.quantumEfficiencyFraction ?? '',
    ),

    binningLinearFactor: numeric(
      camera.binningLinearFactor ?? '',
    ),

    cropZoomRatio: numeric(
      camera.cropZoomRatio ?? '',
    ),

    targetOutputResolutionMp: numeric(
      camera.targetOutputResolutionMp ?? '',
    ),

    focusDistanceM: numeric(
      camera.focusDistanceM,
    ),

    moduleWidthMm: numeric(camera.moduleWidthMm),
    moduleHeightMm: numeric(camera.moduleHeightMm),
    moduleDepthMm: numeric(camera.moduleDepthMm),
  };
}

type DeterministicResult = ReturnType<typeof simulateDevice>;

function DeterministicShareCard({
  input,
  result,
}: {
  input: SimulationInput;
  result: DeterministicResult;
}) {
  const [shareMessage, setShareMessage] = useState('');
  const display = result.displays.primary;
  const battery = result.battery;
  const packaging = result.packaging;
  const deviceName = input.name || 'Untitled concept';

  async function downloadCard() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image export is unavailable in this browser.');

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 34px Arial';
      ctx.fillText('PhoneFuturist', 72, 88);

      ctx.fillStyle = '#8e9399';
      ctx.font = '700 20px Arial';
      ctx.fillText('INTERACTIVE LEAKS · SIMULATION RESULT', 72, 132);

      ctx.fillStyle = '#ffffff';
      ctx.font = deviceName.length > 38 ? '700 48px Arial' : '700 62px Arial';
      const words = deviceName.split(/\s+/);
      let line = '';
      let y = 242;
      for (const word of words) {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > 900 && line) {
          ctx.fillText(line, 72, y);
          y += 72;
          line = word;
        } else line = next;
      }
      ctx.fillText(line, 72, y);
      y += 118;

      const metrics = [
        ['DISPLAY', input.displays.primary.diagonalInches !== undefined ? input.displays.primary.diagonalInches.toFixed(2) + ' in' : 'Unknown'],
        ['PIXEL DENSITY', display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : 'Unknown'],
        ['BATTERY', battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : 'Unknown'],
        ['ENERGY', battery?.totalEnergyWh !== undefined ? battery.totalEnergyWh.toFixed(2) + ' Wh' : 'Unknown'],
        ['SCREEN / BODY', display?.screenToBodyRatio !== undefined ? display.screenToBodyRatio.toFixed(1) + '%' : 'Unknown'],
        ['PACKAGING', packaging?.fitsAvailableVolume === undefined ? 'Unresolved' : packaging.fitsAvailableVolume ? 'Volume budget passes' : 'Volume budget exceeded'],
      ];

      for (let i = 0; i < metrics.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 72 + col * 468;
        const boxY = y + row * 178;
        ctx.fillStyle = '#0d0f12';
        ctx.fillRect(x, boxY, 430, 148);
        ctx.fillStyle = '#8e9399';
        ctx.font = '700 18px Arial';
        ctx.fillText(metrics[i][0], x + 24, boxY + 34);
        ctx.fillStyle = '#ffffff';
        ctx.font = metrics[i][1].length > 24 ? '700 28px Arial' : '700 36px Arial';
        ctx.fillText(metrics[i][1], x + 24, boxY + 88);
      }

      ctx.fillStyle = '#8e9399';
      ctx.font = '400 20px Arial';
      ctx.fillText('Calculated from supplied specifications. Unknown inputs remain unknown.', 72, 1185);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px Arial';
      ctx.fillText('Engine v' + SIMULATION_ENGINE_VERSION + ' · phonefuturist', 72, 1240);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG could not be generated.')), 'image/png'),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'phonefuturist-' + deviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) + '-simulation.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setShareMessage('Share card downloaded.');
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : 'Could not generate the share card.');
    }
  }

  async function shareSummary() {
    const text = [
      deviceName,
      battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : null,
      display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : null,
      packaging?.fitsAvailableVolume === undefined ? null : packaging.fitsAvailableVolume ? 'Volume budget passes' : 'Volume budget exceeded',
      'Interactive Leaks · PhoneFuturist · Engine v' + SIMULATION_ENGINE_VERSION,
    ].filter(Boolean).join(' · ');

    try {
      if (navigator.share) {
        await navigator.share({ title: deviceName + ' · Interactive Leaks', text });
        setShareMessage('Shared.');
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage('Result summary copied.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareMessage('Sharing is unavailable. Download the card instead.');
    }
  }

  return (
    <section className="il-share-card" aria-label="Share simulation result">
      <div className="il-share-card-brand">
        <span>PhoneFuturist</span>
        <small>Interactive Leaks</small>
      </div>
      <strong>{deviceName}</strong>
      <div className="il-share-card-metrics">
        <span>{battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : 'Battery unknown'}</span>
        <span>{display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : 'PPI unknown'}</span>
        <span>{packaging?.fitsAvailableVolume === undefined ? 'Packaging unresolved' : packaging.fitsAvailableVolume ? 'Volume budget passes' : 'Volume budget exceeded'}</span>
      </div>
      <div className="il-share-card-actions">
        <button type="button" onClick={downloadCard}>Download share card</button>
        <button type="button" onClick={shareSummary}>Share result</button>
      </div>
      {shareMessage && <small role="status">{shareMessage}</small>}
    </section>
  );
}

export default function InteractiveLeaksSimulator() {
  const [form, setForm] =
    useState<FormState>(initialForm);

  const [cameras, setCameras] = useState<
    CameraDraft[]
  >([]);

  const [hasSimulated, setHasSimulated] =
    useState(false);

  const [simulationInput, setSimulationInput] =
    useState<SimulationInput | null>(null);

  const [workspaceMode, setWorkspaceMode] =
    useState<'simple' | 'advanced'>('simple');

  const [predictionSaveState, setPredictionSaveState] =
    useState<
      | { status: 'idle' }
      | { status: 'saving'; message: string }
      | { status: 'saved'; message: string }
      | { status: 'error'; message: string }
    >({ status: 'idle' });

  const result = useMemo(
    () =>
      simulationInput
        ? simulateDevice(simulationInput)
        : null,
    [simulationInput],
  );

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCamera(
    id: number,
    patch: Partial<CameraDraft>,
  ) {
    setCameras((current) =>
      current.map((camera) =>
        camera.id === id
          ? { ...camera, ...patch }
          : camera,
      ),
    );
  }

  function addCamera() {
    setCameras((current) => [
      ...current,
      emptyCamera(
        current.length === 0
          ? 1
          : Math.max(...current.map((c) => c.id)) + 1,
      ),
    ]);
  }

  function removeCamera(id: number) {
    setCameras((current) =>
      current.filter((camera) => camera.id !== id),
    );
  }

  function buildInput(): SimulationInput {
    const dimensions = {
      widthMm: numeric(form.widthMm),
      heightMm: numeric(form.heightMm),
      thicknessMm: numeric(form.thicknessMm),
      weightG: numeric(form.weightG),
    };

    const primaryDisplay = {
      diagonalInches: numeric(form.diagonalInches),
      resolutionWidthPx: numeric(
        form.resolutionWidthPx,
      ),
      resolutionHeightPx: numeric(
        form.resolutionHeightPx,
      ),
      refreshRateHz: numeric(form.refreshRateHz),
      aspectWidth: numeric(form.aspectWidth),
      aspectHeight: numeric(form.aspectHeight),

      bezelTopMm: numeric(form.bezelTopMm),
      bezelRightMm: numeric(form.bezelRightMm),
      bezelBottomMm: numeric(form.bezelBottomMm),
      bezelLeftMm: numeric(form.bezelLeftMm),
    };

    const hasBattery =
      [
        form.batteryCapacityMah,
        form.batteryVoltageV,
        form.batteryWidthMm,
        form.batteryHeightMm,
        form.batteryThicknessMm,
        form.batteryWeightG,
      ].some((value) => value.trim() !== '');

    const componentVolumes = {
      thermalMm3: numeric(form.thermalMm3),
      boardMm3: numeric(form.boardMm3),
      speakersMm3: numeric(form.speakersMm3),
      otherMm3: numeric(form.otherMm3),
    };

    const hasComponentVolume = Object.values(
      componentVolumes,
    ).some((value) => value !== undefined);

    const hasPackaging =
      form.reservedVolumePercent.trim() !== '' ||
      hasComponentVolume;

    return {
      formFactor: form.formFactor,

      ...(form.name.trim()
        ? { name: form.name.trim() }
        : {}),

      dimensions,

      displays: {
        primary: primaryDisplay,
      },

      ...(hasBattery
        ? {
            battery: {
              cells: [
                {
                  capacityMah: numeric(
                    form.batteryCapacityMah,
                  ),

                  nominalVoltageV: numeric(
                    form.batteryVoltageV,
                  ),

                  widthMm: numeric(
                    form.batteryWidthMm,
                  ),

                  heightMm: numeric(
                    form.batteryHeightMm,
                  ),

                  thicknessMm: numeric(
                    form.batteryThicknessMm,
                  ),

                  weightG: numeric(
                    form.batteryWeightG,
                  ),
                },
              ],
            },
          }
        : {}),

      ...(cameras.length > 0
        ? {
            cameras: cameras.map(cameraInput),
          }
        : {}),

      ...(hasPackaging
        ? {
            packaging: {
              reservedVolumePercent: numeric(
                form.reservedVolumePercent,
              ),

              ...(hasComponentVolume
                ? { componentVolumes }
                : {}),
            },
          }
        : {}),
    };
  }

  function runSimpleMode(input: SimpleModeInput) {
    const expansion = expandSimpleMode(input);
    const primary =
      expansion.simulationInput.displays.primary;
    const mainCamera = input.mainCamera;

    setForm((current) => ({
      ...current,
      name: input.name ?? '',
      manufacturer:
        input.manufacturer ?? '',
      formFactor: 'phone',
      diagonalInches:
        String(
          primary.diagonalInches ??
            input.displayDiagonalInches,
        ),
      resolutionWidthPx:
        String(primary.resolutionWidthPx ?? ''),
      resolutionHeightPx:
        String(primary.resolutionHeightPx ?? ''),
      aspectWidth:
        String(primary.aspectWidth ?? 9),
      aspectHeight:
        String(primary.aspectHeight ?? 20),
      refreshRateHz:
        String(
          primary.refreshRateHz ??
            input.refreshRateHz,
        ),
      batteryCapacityMah:
        String(input.batteryMah),
      zoomTargetEquivalentFocalLengthMm: '',
      zoomMinimumOutputResolutionMp: '',
      wiredChargeW:
        input.wiredChargingWatts !== undefined
          ? String(input.wiredChargingWatts)
          : '',
      wirelessChargeW:
        input.wirelessChargingWatts !== undefined
          ? String(input.wirelessChargingWatts)
          : '',
      batteryChemistry:
        input.batteryChemistry ?? '',
      chargingStandard:
        input.chargingStandard ?? '',
      wirelessChargingStandard:
        input.wirelessChargingStandard ?? '',
      socVendor: input.socVendor ?? '',
      socName: input.socName ?? '',
      coolingClass:
        expansion.advanced.coolingClass,
      targetSocPowerW: '',
      ambientTemperatureC: '',
      thermalResistanceCPerW: '',
      thermalMassJPerC: '',
      throttleTemperatureC: '',
      thermalDurationSeconds: '',
      socToChassisResistanceCPerW: '',
      chassisToAmbientResistanceCPerW: '',
      socThermalMassJPerC: '',
      chassisThermalMassJPerC: '',
      surfaceComfortTemperatureC: '',
      socPackageThrottleTemperatureC: '',
    }));

    setCameras(
      mainCamera
        ? [
            {
              id: 1,
              type: 'wide',
              sensorFormatDenominator:
                mainCamera.sensorFormatDenominator !==
                undefined
                  ? String(
                      mainCamera
                        .sensorFormatDenominator,
                    )
                  : '',
              sensorWidthMm: '',
              sensorHeightMm: '',
              resolutionMp:
                mainCamera.resolutionMp !== undefined
                  ? String(
                      mainCamera.resolutionMp,
                    )
                  : '',
              equivalentFocalLengthMm:
                mainCamera
                  .equivalentFocalLengthMm !==
                undefined
                  ? String(
                      mainCamera
                        .equivalentFocalLengthMm,
                    )
                  : '',
              physicalFocalLengthMm: '',
              apertureFNumber:
                mainCamera.apertureFNumber !==
                undefined
                  ? String(
                      mainCamera.apertureFNumber,
                    )
                  : '',
              exposureTimeSeconds: '',
              sensorReadoutTimeSeconds: '',
              videoFrameRateFps: '',
              subjectAngularSpeedDegPerSecond: '',
              cameraAngularShakeDegPerSecond: '',
              oisAngularCompensationFraction: '',
              lensTransmissionFraction: '',
              quantumEfficiencyFraction: '',
              binningLinearFactor: '',
              cropZoomRatio: '',
              targetOutputResolutionMp: '',
              focusDistanceM: '',
              moduleWidthMm: '',
              moduleHeightMm: '',
              moduleDepthMm: '',
            },
          ]
        : [],
    );

    setSimulationInput(
      expansion.simulationInput,
    );
    setHasSimulated(true);
  }

  function simulate() {
    setPredictionSaveState({ status: 'idle' });
    setSimulationInput(buildInput());
    setHasSimulated(true);
  }

  function loadExample() {
    setPredictionSaveState({ status: 'idle' });
    setForm(flagshipExample);
    setCameras(flagshipCameras);
    setSimulationInput(null);
    setHasSimulated(false);
  }

  function clearSimulation() {
    setPredictionSaveState({ status: 'idle' });
    setForm(initialForm);
    setCameras([]);
    setSimulationInput(null);
    setHasSimulated(false);
  }

  const display = result?.displays.primary;

  const displayExperience =
    simulationInput && result
      ? simulateLiveDisplayExperience({
          diagonalInches:
            simulationInput.displays.primary.diagonalInches,
          resolutionWidthPx:
            simulationInput.displays.primary.resolutionWidthPx,
          resolutionHeightPx:
            simulationInput.displays.primary.resolutionHeightPx,
          aspectWidth:
            simulationInput.displays.primary.aspectWidth,
          aspectHeight:
            simulationInput.displays.primary.aspectHeight,
          refreshRateHz: numeric(form.refreshRateHz),
          operatingRefreshRateHz:
            numeric(form.operatingRefreshRateHz),
          brightnessNits: numeric(form.brightnessNits),
          averagePictureLevelPercent:
            numeric(form.averagePictureLevelPercent),
          panelTechnology:
            form.panelTechnology.trim() || undefined,
        })
      : undefined;

  const displayRuntimeSensitivity =
    simulationInput && result
      ? resolveLiveDisplayRuntimeSensitivity(
          simulationInput,
          {
            manufacturer:
              form.manufacturer.trim() || undefined,
            socVendor:
              form.socVendor.trim() || undefined,
            socName:
              form.socName.trim() || undefined,
            batteryChemistry:
              form.batteryChemistry.trim() || undefined,
            coolingClass:
              form.coolingClass === 'unknown'
                ? undefined
                : form.coolingClass,
          },
        )
      : undefined;

  const battery = result?.battery;
  const packaging = result?.packaging;

  const chargingWatts = numeric(form.wiredChargeW);
  const wirelessChargingWatts = numeric(form.wirelessChargeW);

  const batteryExperience =
    simulationInput && result
      ? simulateLiveBatteryExperience({
          simulation: simulationInput,
          manufacturer:
            form.manufacturer.trim() || undefined,
          socVendor:
            form.socVendor.trim() || undefined,
          socName:
            form.socName.trim() || undefined,
          batteryChemistry:
            form.batteryChemistry.trim() || undefined,
          cellArchitecture:
            form.cellArchitecture === 'unknown'
              ? undefined
              : form.cellArchitecture,
          wiredWatts: chargingWatts,
          wirelessWatts: wirelessChargingWatts,
          wiredChargingStandard:
            form.chargingStandard.trim() || undefined,
          wirelessChargingStandard:
            form.wirelessChargingStandard.trim() || undefined,
          dailyUseHours: {
            web_browsing: numeric(form.webHours) ?? 0,
            video_playback: numeric(form.videoHours) ?? 0,
            gaming: numeric(form.gamingHours) ?? 0,
          },
        })
      : undefined;

  const chargingResult = batteryExperience?.charging;
  const wirelessChargingResult =
    batteryExperience?.wirelessCharging;

  const targetSocPowerW = numeric(form.targetSocPowerW);
  const ambientTemperatureC = numeric(form.ambientTemperatureC);
  const thermalResistanceCPerW = numeric(
    form.thermalResistanceCPerW,
  );
  const thermalMassJPerC = numeric(form.thermalMassJPerC);
  const throttleTemperatureC = numeric(
    form.throttleTemperatureC,
  );

  const socToChassisResistanceCPerW =
    numeric(
      form.socToChassisResistanceCPerW,
    );
  const chassisToAmbientResistanceCPerW =
    numeric(
      form.chassisToAmbientResistanceCPerW,
    );
  const socThermalMassJPerC = numeric(
    form.socThermalMassJPerC,
  );
  const chassisThermalMassJPerC = numeric(
    form.chassisThermalMassJPerC,
  );
  const surfaceComfortTemperatureC =
    numeric(
      form.surfaceComfortTemperatureC,
    );

  const socPackageThrottleTemperatureC =
    numeric(
      form.socPackageThrottleTemperatureC,
    );

  const twoNodeRawFields = [
    form.socToChassisResistanceCPerW,
    form.chassisToAmbientResistanceCPerW,
    form.socThermalMassJPerC,
    form.chassisThermalMassJPerC,
  ];

  const hasAnyTwoNodeInput =
    twoNodeRawFields.some(
      (value) => value.trim() !== '',
    );

  const hasCompleteTwoNodeInput =
    socToChassisResistanceCPerW !== undefined &&
    chassisToAmbientResistanceCPerW !== undefined &&
    socThermalMassJPerC !== undefined &&
    chassisThermalMassJPerC !== undefined;

  const incompleteTwoNodeInput =
    (
      hasAnyTwoNodeInput ||
      form.socPackageThrottleTemperatureC.trim() !== ''
    ) &&
    (
      !hasCompleteTwoNodeInput ||
      socPackageThrottleTemperatureC === undefined
    );

  const thermalResult =
    simulationInput &&
    result &&
    targetSocPowerW !== undefined &&
    ambientTemperatureC !== undefined &&
    thermalResistanceCPerW !== undefined &&
    thermalMassJPerC !== undefined &&
    throttleTemperatureC !== undefined
      ? simulateLiveThermalExperience({
          domain: form.thermalDomain,
          manufacturer:
            form.manufacturer.trim() || undefined,
          batteryMah: result.battery?.totalCapacityMah,
          socVendor: form.socVendor.trim() || undefined,
          socName: form.socName.trim() || undefined,
          displayDiagonalInches:
            simulationInput.displays.primary.diagonalInches,
          thicknessMm: simulationInput.dimensions?.thicknessMm,
          weightG: simulationInput.dimensions?.weightG,
          coolingClass:
            form.coolingClass === 'unknown'
              ? undefined
              : form.coolingClass,
          targetPowerW: targetSocPowerW,
          ambientTemperatureC,
          thermalResistanceCPerW,
          thermalMassJPerC,
          throttleTemperatureC,
          durationSeconds:
            numeric(form.thermalDurationSeconds) ?? 600,

        })
      : undefined;

  const twoNodeThermalResult =
    simulationInput &&
    result &&
    targetSocPowerW !== undefined &&
    ambientTemperatureC !== undefined &&
    hasCompleteTwoNodeInput &&
    socPackageThrottleTemperatureC !== undefined
      ? simulateTwoNodeThermals({
          targetPowerW: targetSocPowerW,
          ambientTemperatureC,
          socToChassisResistanceCPerW,
          chassisToAmbientResistanceCPerW,
          socThermalMassJPerC,
          chassisThermalMassJPerC,
          socThrottleTemperatureC:
            socPackageThrottleTemperatureC,
          ...(surfaceComfortTemperatureC !==
          undefined
            ? {
                surfaceComfortTemperatureC,
              }
            : {}),
          durationSeconds:
            numeric(
              form.thermalDurationSeconds,
            ) ?? 600,
        })
      : undefined;

  const performanceDomain =
    workspaceMode === 'simple'
      ? 'gpu_sustained'
      : form.thermalDomain;

  const bodyVolumeMm3 =
    simulationInput?.dimensions?.widthMm !== undefined &&
    simulationInput.dimensions.heightMm !== undefined &&
    simulationInput.dimensions.thicknessMm !== undefined
      ? simulationInput.dimensions.widthMm *
        simulationInput.dimensions.heightMm *
        simulationInput.dimensions.thicknessMm
      : undefined;

  const sustainedPerformanceEstimate =
    simulationInput && result
      ? estimateLiveSustainedPerformance({
          domain: performanceDomain,
          manufacturer:
            form.manufacturer.trim() || undefined,
          batteryMah:
            result.battery?.totalCapacityMah,
          socVendor:
            form.socVendor.trim() || undefined,
          socName:
            form.socName.trim() || undefined,
          displayDiagonalInches:
            simulationInput.displays.primary
              .diagonalInches,
          refreshRateHz:
            simulationInput.displays.primary
              .refreshRateHz,
          thicknessMm:
            simulationInput.dimensions
              ?.thicknessMm,
          weightG:
            simulationInput.dimensions?.weightG,
          bodyVolumeMm3,
          coolingClass:
            form.coolingClass === 'unknown'
              ? undefined
              : form.coolingClass,
        })
      : undefined;

  const peakPerformanceEstimate =
    simulationInput && result
      ? estimateLivePeakPerformance({
          domain: form.peakBenchmarkDomain,
          manufacturer:
            form.manufacturer.trim() || undefined,
          socVendor:
            form.socVendor.trim() || undefined,
          socName:
            form.socName.trim() || undefined,
          batteryMah:
            result.battery?.totalCapacityMah,
          displayDiagonalInches:
            simulationInput.displays.primary
              .diagonalInches,
          refreshRateHz:
            simulationInput.displays.primary
              .refreshRateHz,
          thicknessMm:
            simulationInput.dimensions
              ?.thicknessMm,
          weightG:
            simulationInput.dimensions?.weightG,
          bodyVolumeMm3,
          coolingClass:
            form.coolingClass === 'unknown'
              ? undefined
              : form.coolingClass,
          ...(numeric(
            form.assumedGenerationUpliftPercent,
          ) !== undefined
            ? {
                assumedGenerationUpliftPercent:
                  numeric(
                    form.assumedGenerationUpliftPercent,
                  ),
              }
            : {}),
        })
      : undefined;

  const socArchitectureClusters = [
    {
      cores: numeric(form.socCluster1Cores),
      maxClockGhz: numeric(
        form.socCluster1ClockGhz,
      ),
      relativeIpc: numeric(
        form.socCluster1RelativeIpc,
      ),
    },
    {
      cores: numeric(form.socCluster2Cores),
      maxClockGhz: numeric(
        form.socCluster2ClockGhz,
      ),
      relativeIpc: numeric(
        form.socCluster2RelativeIpc,
      ),
    },
    {
      cores: numeric(form.socCluster3Cores),
      maxClockGhz: numeric(
        form.socCluster3ClockGhz,
      ),
      relativeIpc: numeric(
        form.socCluster3RelativeIpc,
      ),
    },
    {
      cores: numeric(form.socCluster4Cores),
      maxClockGhz: numeric(
        form.socCluster4ClockGhz,
      ),
      relativeIpc: numeric(
        form.socCluster4RelativeIpc,
      ),
    },
  ].flatMap((cluster, index) =>
    cluster.cores !== undefined &&
    cluster.maxClockGhz !== undefined
      ? [{
          label: `cluster-${index + 1}`,
          cores: cluster.cores,
          maxClockGhz:
            cluster.maxClockGhz,
          ...(cluster.relativeIpc !==
          undefined
            ? {
                relativeIpc:
                  cluster.relativeIpc,
              }
            : {}),
        }]
      : [],
  );

  const socArchitecture =
    socArchitectureClusters.length
      ? calculateSocArchitecture({
          cpuClusters:
            socArchitectureClusters,
          ...(targetSocPowerW !== undefined
            ? {
                peakSocPowerW:
                  targetSocPowerW,
              }
            : {}),
          ...(numeric(
            form.socMemoryBandwidthGbps,
          ) !== undefined
            ? {
                memoryBandwidthGbps:
                  numeric(
                    form.socMemoryBandwidthGbps,
                  ),
              }
            : {}),
          ...(numeric(
            form.socFabricationNodeNm,
          ) !== undefined
            ? {
                fabricationNodeNm:
                  numeric(
                    form.socFabricationNodeNm,
                  ),
              }
            : {}),
        })
      : undefined;

  const knownCameraVolumeMm3 =
    result?.cameras
      ?.map((camera) => camera.moduleVolumeMm3)
      .filter(
        (volume): volume is number =>
          volume !== undefined,
      )
      .reduce((total, volume) => total + volume, 0);

  const cameraExperiences =
    simulationInput && result
      ? cameras.map((camera) =>
          simulateLiveCameraExperience({
            ...cameraInput(camera),
            manufacturer:
              form.manufacturer.trim() || undefined,
          }),
        )
      : [];

  const zoomTargetEquivalentFocalLengthMm =
    numeric(
      form.zoomTargetEquivalentFocalLengthMm,
    );
  const zoomMinimumOutputResolutionMp =
    numeric(
      form.zoomMinimumOutputResolutionMp,
    );

  const cameraZoomHandoff =
    simulationInput &&
    result &&
    zoomTargetEquivalentFocalLengthMm !== undefined &&
    cameras.length > 0
      ? resolveCameraZoomHandoff({
          targetEquivalentFocalLengthMm:
            zoomTargetEquivalentFocalLengthMm,
          ...(zoomMinimumOutputResolutionMp !==
          undefined
            ? {
                minimumOutputResolutionMp:
                  zoomMinimumOutputResolutionMp,
              }
            : {}),
          cameras: cameras.map((camera) => ({
            id: String(camera.id),
            type: camera.type,
            resolutionMp: numeric(
              camera.resolutionMp,
            ),
            equivalentFocalLengthMm: numeric(
              camera.equivalentFocalLengthMm,
            ),
            binningLinearFactor: numeric(
              camera.binningLinearFactor ?? '',
            ),
          })),
        })
      : undefined;

  const feedbackSnapshot = {
    mode: workspaceMode,
    form,
    cameras,
    simulationInput,
    deterministic: result,
    display: displayExperience,
    battery: batteryExperience,
    thermal: thermalResult
      ? {
          status: thermalResult.status,
          evidenceMode:
            thermalResult.evidenceMode,
          peakTemperatureC:
            thermalResult.peakTemperatureC,
          endTemperatureC:
            thermalResult.endTemperatureC,
          sustainedPerformancePercent:
            thermalResult
              .sustainedPerformancePercent,
          sustainedPowerW:
            thermalResult.sustainedPowerW,
          throttleStartSecond:
            thermalResult.throttleStartSecond,
          referenceCount:
            thermalResult.referenceCount,
          confidence:
            thermalResult.confidence,
          evidenceScope:
            thermalResult.evidenceScope,
          sameSocFamilyReferences:
            thermalResult
              .sameSocFamilyReferences,
          sameSocVendorReferences:
            thermalResult
              .sameSocVendorReferences,
          sourceRecordCount:
            thermalResult.sourceRecordCount,
          publisherCount:
            thermalResult.publisherCount,
          protocolKey:
            thermalResult.protocolKey,
          warnings:
            thermalResult.warnings,
        }
      : null,
    twoNodeThermal: twoNodeThermalResult
      ? {
          modelVersion:
            twoNodeThermalResult.modelVersion,
          peakSocPackageTemperatureC:
            twoNodeThermalResult
              .peakSocPackageTemperatureC,
          peakChassisSurfaceTemperatureC:
            twoNodeThermalResult
              .peakChassisSurfaceTemperatureC,
          endSocPackageTemperatureC:
            twoNodeThermalResult
              .endSocPackageTemperatureC,
          endChassisSurfaceTemperatureC:
            twoNodeThermalResult
              .endChassisSurfaceTemperatureC,
          throttleStartSecond:
            twoNodeThermalResult
              .throttleStartSecond,
          surfaceComfortCrossSecond:
            twoNodeThermalResult
              .surfaceComfortCrossSecond,
          sustainedPerformancePercent:
            twoNodeThermalResult
              .sustainedPerformancePercent,
          sustainedPowerW:
            twoNodeThermalResult
              .sustainedPowerW,
        }
      : null,
    sustainedPerformance:
      sustainedPerformanceEstimate,
    peakPerformance:
      peakPerformanceEstimate,
    socArchitecture,
    camera: cameraExperiences.map(
      (experience) => ({
        physics: experience.physics,
        outcomes: experience.outcomes,
        warnings: experience.warnings,
      }),
    ),
    cameraZoomHandoff,
  };

  async function savePrediction() {
    if (
      !result ||
      !simulationInput ||
      predictionSaveState.status === 'saving'
    ) {
      return;
    }

    const runtime = (
      workload:
        | 'web_browsing'
        | 'video_playback'
        | 'gaming',
    ) =>
      batteryExperience?.runtimes.find(
        (row) =>
          row.workload === workload &&
          row.status === 'resolved',
      )?.expectedHours;

    const fullChargeMinutes =
      chargingResult?.status === 'resolved'
        ? chargingResult.estimate
            ?.timeTo100Minutes?.expected
        : undefined;

    const peakScore =
      peakPerformanceEstimate?.status === 'resolved'
        ? peakPerformanceEstimate.adjustedExpected
        : undefined;

    const snapshot =
      buildPredictionSnapshot({
        deviceName:
          simulationInput.name?.trim() ||
          form.name.trim() ||
          'Untitled concept',
        simulation: result,
        corpusVersion:
          batteryExperience?.corpusVersion,
        simulatorVersion:
          'interactive-leaks-beta',
        experiences: {
          ...(fullChargeMinutes !== undefined
            ? {
                wiredFullChargeMinutes:
                  fullChargeMinutes,
              }
            : {}),
          ...(runtime('web_browsing') !== undefined
            ? {
                webRuntimeHours:
                  runtime('web_browsing'),
              }
            : {}),
          ...(runtime('video_playback') !== undefined
            ? {
                videoRuntimeHours:
                  runtime('video_playback'),
              }
            : {}),
          ...(runtime('gaming') !== undefined
            ? {
                gamingRuntimeHours:
                  runtime('gaming'),
              }
            : {}),
          ...(thermalResult?.status === 'resolved' &&
          thermalResult.sustainedPerformancePercent !==
            undefined
            ? {
                sustainedPerformancePercent:
                  thermalResult.sustainedPerformancePercent,
              }
            : {}),
          ...(peakScore !== undefined
            ? {
                peakBenchmarkScore:
                  peakScore,
                peakBenchmarkLabel:
                  form.peakBenchmarkDomain.replaceAll(
                    '_',
                    ' ',
                  ),
                peakBenchmarkProvenance:
                  peakPerformanceEstimate?.assumptionApplied
                    ? ('assumption-adjusted' as const)
                    : ('measured-calibrated' as const),
              }
            : {}),
          ...(displayExperience?.electricalPower.status ===
            'resolved' &&
          displayExperience.electricalPower
            .expectedPowerW !== undefined
            ? {
                displayPanelPowerW:
                  displayExperience.electricalPower
                    .expectedPowerW,
              }
            : {}),
        },
        assumptions: {
          workspaceMode,
          manufacturer:
            form.manufacturer.trim() || null,
          socVendor:
            form.socVendor.trim() || null,
          socName:
            form.socName.trim() || null,
          peakBenchmarkDomain:
            form.peakBenchmarkDomain,
          assumedGenerationUpliftPercent:
            numeric(
              form.assumedGenerationUpliftPercent,
            ) ?? null,
          thermalDomain:
            form.thermalDomain,
          batteryChemistry:
            form.batteryChemistry.trim() || null,
          chargingStandard:
            form.chargingStandard.trim() || null,
          form,
          cameras,
        },
      });

    setPredictionSaveState({
      status: 'saving',
      message: 'Saving frozen prediction…',
    });

    try {
      const response = await fetch(
        '/api/simulation-predictions',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            snapshot,
          }),
        },
      );

      const payload =
        await response.json().catch(
          () => ({}),
        ) as {
          ok?: boolean;
          id?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ||
            'Prediction could not be saved.',
        );
      }

      setPredictionSaveState({
        status: 'saved',
        message:
          'Prediction frozen and saved. Future reality measurements will be compared against this exact snapshot.',
      });
    } catch (error) {
      setPredictionSaveState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Prediction could not be saved.',
      });
    }
  }

  const twoNodeThermalSummary =
    twoNodeThermalResult ? (
      <div className="il-thermal-two-node">
        <span className="il-result-label">
          Package / surface physics
        </span>
        <div className="il-metrics">
          <div>
            <strong>
              {format(
                twoNodeThermalResult
                  .peakSocPackageTemperatureC,
                1,
              )} °C
            </strong>
            <span>Peak SoC/package</span>
          </div>
          <div>
            <strong>
              {format(
                twoNodeThermalResult
                  .peakChassisSurfaceTemperatureC,
                1,
              )} °C
            </strong>
            <span>Peak chassis/surface</span>
          </div>
          <div>
            <strong>
              {twoNodeThermalResult
                .throttleStartSecond !== undefined
                ? formatDurationSeconds(
                    twoNodeThermalResult
                      .throttleStartSecond,
                  )
                : 'No package throttle'}
            </strong>
            <span>Package throttle onset</span>
          </div>
          <div>
            <strong>
              {twoNodeThermalResult
                .surfaceComfortCrossSecond !== undefined
                ? formatDurationSeconds(
                    twoNodeThermalResult
                      .surfaceComfortCrossSecond,
                  )
                : 'Not crossed'}
            </strong>
            <span>Surface comfort threshold</span>
          </div>
          <div>
            <strong>
              {format(
                twoNodeThermalResult
                  .sustainedPerformancePercent,
                1,
              )}%
            </strong>
            <span>Two-node physics sustained perf</span>
          </div>
        </div>
        <p className="il-help">
          Independent two-node physics using only the explicit
          package-to-chassis and chassis-to-ambient parameters above.
          It does not require or inherit the legacy lumped thermal
          resistance or thermal mass.
        </p>
      </div>
    ) : null;

  return (
    <div className="il-app">
      <div className="il-toolbar">
        <div>
          <span className="il-status">
            Simulation workspace
          </span>

          <span className="il-engine">
            Engine v{SIMULATION_ENGINE_VERSION}
          </span>
        </div>

        <div className="il-toolbar-actions">
          <div className="il-mode-switch" aria-label="Simulator mode">
            <button
              type="button"
              className={workspaceMode === 'simple' ? 'active' : ''}
              onClick={() => setWorkspaceMode('simple')}
            >
              Simple
            </button>
            <button
              type="button"
              className={workspaceMode === 'advanced' ? 'active' : ''}
              onClick={() => setWorkspaceMode('advanced')}
            >
              Advanced
            </button>
          </div>

          <BetaFeedbackPanel
            simulatorMode={workspaceMode}
            versions={{
              simulatorVersion: 'interactive-leaks-beta',
              engineVersion: SIMULATION_ENGINE_VERSION,
              corpusVersion:
                batteryExperience?.corpusVersion,
            }}
            snapshot={feedbackSnapshot}
          />

          <button
            type="button"
            className="secondary"
            disabled={
              !result ||
              predictionSaveState.status === 'saving'
            }
            onClick={savePrediction}
          >
            {predictionSaveState.status === 'saving'
              ? 'Saving…'
              : 'Save prediction'}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={loadExample}
          >
            Load example
          </button>

          <button
            type="button"
            className="secondary"
            onClick={clearSimulation}
          >
            Clear
          </button>
        </div>
      </div>

      {predictionSaveState.status !== 'idle' ? (
        <div
          className="il-help"
          role={
            predictionSaveState.status === 'error'
              ? 'alert'
              : 'status'
          }
        >
          {predictionSaveState.message}
        </div>
      ) : null}

      {workspaceMode === 'simple' ? (
        <SimpleModePanel onRun={runSimpleMode} />
      ) : null}

      <div
        className={`il-workspace ${workspaceMode === 'simple' ? 'il-workspace-simple' : ''}`}
      >
        <section
          className={`il-builder ${workspaceMode === 'simple' ? 'il-builder-hidden' : ''}`}
          aria-label="Simulation inputs"
        >
          <div className="il-section">
            <div className="il-section-heading">
              <span>01</span>
              <div>
                <h2>Device</h2>
                <p>
                  Start with the physical envelope.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <label className="il-field il-wide">
                <span>Device name</span>

                <input
                  type="text"
                  value={form.name}
                  placeholder="Untitled concept"
                  onChange={(event) =>
                    update(
                      'name',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>Manufacturer</span>

                <input
                  type="text"
                  value={form.manufacturer}
                  placeholder="Samsung"
                  onChange={(event) =>
                    update(
                      'manufacturer',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>Form factor</span>

                <select
                  value={form.formFactor}
                  onChange={(event) =>
                    update(
                      'formFactor',
                      event.currentTarget
                        .value as DeviceFormFactor,
                    )
                  }
                >
                  <option value="phone">Phone</option>
                  <option value="book_foldable">
                    Book foldable
                  </option>
                  <option value="flip_foldable">
                    Flip foldable
                  </option>
                  <option value="tablet">
                    Tablet
                  </option>
                  <option value="laptop">
                    Laptop
                  </option>
                  <option value="wearable">
                    Wearable
                  </option>
                </select>
              </label>

              <NumericField
                label="Width"
                suffix="mm"
                value={form.widthMm}
                placeholder="75"
                onChange={(value) =>
                  update('widthMm', value)
                }
              />

              <NumericField
                label="Height"
                suffix="mm"
                value={form.heightMm}
                placeholder="160"
                onChange={(value) =>
                  update('heightMm', value)
                }
              />

              <NumericField
                label="Thickness"
                suffix="mm"
                value={form.thicknessMm}
                placeholder="8"
                onChange={(value) =>
                  update('thicknessMm', value)
                }
              />

              <NumericField
                label="Weight"
                suffix="g"
                value={form.weightG}
                placeholder="195"
                onChange={(value) =>
                  update('weightG', value)
                }
              />
            </div>
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>02</span>
              <div>
                <h2>Display</h2>
                <p>
                  Define the primary panel and its
                  geometry.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <NumericField
                label="Diagonal"
                suffix="in"
                value={form.diagonalInches}
                placeholder="6.7"
                onChange={(value) =>
                  update('diagonalInches', value)
                }
              />

              <NumericField
                label="Resolution width"
                suffix="px"
                value={form.resolutionWidthPx}
                placeholder="1440"
                step="1"
                onChange={(value) =>
                  update('resolutionWidthPx', value)
                }
              />

              <NumericField
                label="Resolution height"
                suffix="px"
                value={form.resolutionHeightPx}
                placeholder="3200"
                step="1"
                onChange={(value) =>
                  update('resolutionHeightPx', value)
                }
              />

              <NumericField
                label="Aspect width"
                value={form.aspectWidth}
                placeholder="9"
                onChange={(value) =>
                  update('aspectWidth', value)
                }
              />

              <NumericField
                label="Aspect height"
                value={form.aspectHeight}
                placeholder="20"
                onChange={(value) =>
                  update('aspectHeight', value)
                }
              />
            </div>

            <div className="il-grid">
              <NumericField
                label="Refresh rate"
                suffix="Hz"
                value={form.refreshRateHz}
                placeholder="120"
                onChange={(value) =>
                  update('refreshRateHz', value)
                }
              />

              <NumericField
                label="Brightness"
                suffix="nits"
                value={form.brightnessNits}
                placeholder="1000"
                onChange={(value) =>
                  update('brightnessNits', value)
                }
              />

              <label className="il-field">
                <span>Panel technology</span>
                <input
                  type="text"
                  value={form.panelTechnology}
                  placeholder="LTPO OLED"
                  onChange={(event) =>
                    update(
                      'panelTechnology',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>
            </div>

            <details className="il-advanced">
              <summary>Display workload conditions</summary>

              <p className="il-help">
                These describe the current content/workload, not the panel's
                maximum specification. APL is the average picture level:
                0% is black, 100% is full-white-equivalent content.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Operating refresh"
                  suffix="Hz"
                  value={form.operatingRefreshRateHz}
                  placeholder="60"
                  step="1"
                  onChange={(value) =>
                    update(
                      'operatingRefreshRateHz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Average picture level"
                  suffix="%"
                  value={
                    form.averagePictureLevelPercent
                  }
                  placeholder="50"
                  step="1"
                  onChange={(value) =>
                    update(
                      'averagePictureLevelPercent',
                      value,
                    )
                  }
                />
              </div>
            </details>

            <details className="il-advanced">
              <summary>Advanced bezel geometry</summary>

              <div className="il-grid">
                <NumericField
                  label="Top bezel"
                  suffix="mm"
                  value={form.bezelTopMm}
                  placeholder="1.5"
                  onChange={(value) =>
                    update('bezelTopMm', value)
                  }
                />

                <NumericField
                  label="Right bezel"
                  suffix="mm"
                  value={form.bezelRightMm}
                  placeholder="1.5"
                  onChange={(value) =>
                    update('bezelRightMm', value)
                  }
                />

                <NumericField
                  label="Bottom bezel"
                  suffix="mm"
                  value={form.bezelBottomMm}
                  placeholder="1.5"
                  onChange={(value) =>
                    update('bezelBottomMm', value)
                  }
                />

                <NumericField
                  label="Left bezel"
                  suffix="mm"
                  value={form.bezelLeftMm}
                  placeholder="1.5"
                  onChange={(value) =>
                    update('bezelLeftMm', value)
                  }
                />
              </div>
            </details>
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>03</span>
              <div>
                <h2>Battery</h2>
                <p>
                  Capacity, runtime and optional physical
                  battery analysis.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <NumericField
                label="Capacity"
                suffix="mAh"
                value={form.batteryCapacityMah}
                placeholder="5000"
                onChange={(value) =>
                  update(
                    'batteryCapacityMah',
                    value,
                  )
                }
              />

              <NumericField
                label="Nominal voltage"
                suffix="V"
                value={form.batteryVoltageV}
                placeholder="3.85"
                onChange={(value) =>
                  update('batteryVoltageV', value)
                }
              />

              <NumericField
                label="Web browsing"
                suffix="h/day"
                value={form.webHours}
                placeholder="2"
                onChange={(value) =>
                  update('webHours', value)
                }
              />

              <NumericField
                label="Video streaming"
                suffix="h/day"
                value={form.videoHours}
                placeholder="2"
                onChange={(value) =>
                  update('videoHours', value)
                }
              />

              <NumericField
                label="Gaming"
                suffix="h/day"
                value={form.gamingHours}
                placeholder="1"
                onChange={(value) =>
                  update('gamingHours', value)
                }
              />

              <NumericField
                label="Camera use"
                suffix="h/day"
                value={form.cameraHours}
                placeholder="0"
                onChange={(value) =>
                  update('cameraHours', value)
                }
              />
            </div>

            <p className="il-help">
              Enter your expected active-use hours. Interactive Leaks converts
              those hours into workload shares and applies calibrated reference
              power internally. You never need to enter watts.
            </p>

            <details className="il-advanced">
              <summary>Advanced physical battery data</summary>

              <p className="il-help">
                Optional. Cell dimensions and weight are used only for packaging
                and energy-density calculations, not to calculate battery life.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Cell width"
                  suffix="mm"
                  value={form.batteryWidthMm}
                  placeholder="60"
                  onChange={(value) =>
                    update('batteryWidthMm', value)
                  }
                />

                <NumericField
                  label="Cell height"
                  suffix="mm"
                  value={form.batteryHeightMm}
                  placeholder="80"
                  onChange={(value) =>
                    update('batteryHeightMm', value)
                  }
                />

                <NumericField
                  label="Cell thickness"
                  suffix="mm"
                  value={form.batteryThicknessMm}
                  placeholder="5"
                  onChange={(value) =>
                    update(
                      'batteryThicknessMm',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cell weight"
                  suffix="g"
                  value={form.batteryWeightG}
                  placeholder="70"
                  onChange={(value) =>
                    update('batteryWeightG', value)
                  }
                />
              </div>
            </details>
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>04</span>
              <div>
                <h2>Charging</h2>
                <p>
                  Estimate wired charging from real released-phone curves.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <NumericField
                label="Wired charging"
                suffix="W"
                value={form.wiredChargeW}
                placeholder="60"
                onChange={(value) =>
                  update('wiredChargeW', value)
                }
              />

              <NumericField
                label="Wireless charging"
                suffix="W"
                value={form.wirelessChargeW}
                placeholder="25"
                onChange={(value) =>
                  update('wirelessChargeW', value)
                }
              />

              <label className="il-field">
                <span>Battery chemistry</span>
                <input
                  type="text"
                  value={form.batteryChemistry}
                  placeholder="silicon-carbon"
                  onChange={(event) =>
                    update(
                      'batteryChemistry',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>Cell architecture</span>
                <select
                  value={form.cellArchitecture}
                  onChange={(event) =>
                    update(
                      'cellArchitecture',
                      event.currentTarget.value as
                        | 'unknown'
                        | 'single-cell'
                        | 'dual-cell',
                    )
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="single-cell">
                    Single cell
                  </option>
                  <option value="dual-cell">
                    Dual cell
                  </option>
                </select>
              </label>

              <label className="il-field">
                <span>Charging standard</span>
                <input
                  type="text"
                  value={form.chargingStandard}
                  placeholder="USB PD/PPS"
                  onChange={(event) =>
                    update(
                      'chargingStandard',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>Wireless standard</span>
                <input
                  type="text"
                  value={form.wirelessChargingStandard}
                  placeholder="Qi2"
                  onChange={(event) =>
                    update(
                      'wirelessChargingStandard',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>
            </div>

            <p className="il-help">
              Charging is capacity-aware and uses measured released-phone
              curves. Wired and wireless evidence stay separate, while battery
              chemistry, cell architecture and charging standard refine
              comparable-device selection when known.
            </p>
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>05</span>
              <div>
                <h2>Thermal & performance</h2>
                <p>
                  Model sustained SoC power, heat and throttling.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <label className="il-field">
                <span>Thermal workload</span>
                <select
                  value={form.thermalDomain}
                  onChange={(event) =>
                    update(
                      'thermalDomain',
                      event.currentTarget.value as
                        | 'cpu_sustained'
                        | 'gpu_sustained'
                        | 'gaming_sustained'
                        | 'ray_tracing',
                    )
                  }
                >
                  <option value="cpu_sustained">CPU sustained</option>
                  <option value="gpu_sustained">GPU sustained</option>
                  <option value="gaming_sustained">Gaming sustained</option>
                  <option value="ray_tracing">Ray tracing</option>
                </select>
              </label>

              <label className="il-field">
                <span>Peak benchmark</span>
                <select
                  value={form.peakBenchmarkDomain}
                  onChange={(event) =>
                    update(
                      'peakBenchmarkDomain',
                      event.currentTarget
                        .value as PeakBenchmarkDomain,
                    )
                  }
                >
                  <option value="geekbench6_single">
                    Geekbench 6 single-core
                  </option>
                  <option value="geekbench6_multi">
                    Geekbench 6 multi-core
                  </option>
                  <option value="3dmark_wle">
                    3DMark Wild Life Extreme
                  </option>
                  <option value="3dmark_solar_bay">
                    3DMark Solar Bay
                  </option>
                </select>
              </label>

              <NumericField
                label="Assumed generation uplift"
                suffix="%"
                value={
                  form.assumedGenerationUpliftPercent
                }
                placeholder="Optional"
                onChange={(value) =>
                  update(
                    'assumedGenerationUpliftPercent',
                    value,
                  )
                }
              />

              <label className="il-field">
                <span>SoC vendor</span>
                <input
                  type="text"
                  value={form.socVendor}
                  placeholder="Qualcomm"
                  onChange={(event) =>
                    update('socVendor', event.currentTarget.value)
                  }
                />
              </label>

              <label className="il-field">
                <span>SoC model</span>
                <input
                  type="text"
                  value={form.socName}
                  placeholder="Snapdragon 8 Elite Gen 5"
                  onChange={(event) =>
                    update(
                      'socName',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>Cooling class</span>
                <select
                  value={form.coolingClass}
                  onChange={(event) =>
                    update(
                      'coolingClass',
                      event.currentTarget.value as FormState['coolingClass'],
                    )
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="passive-graphite">Passive graphite</option>
                  <option value="vapor-chamber">Vapor chamber</option>
                  <option value="large-vapor-chamber">Large vapor chamber</option>
                  <option value="active-fan">Active fan</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <NumericField
                label="Target SoC power"
                suffix="W"
                value={form.targetSocPowerW}
                placeholder="10"
                onChange={(value) =>
                  update('targetSocPowerW', value)
                }
              />

              <NumericField
                label="Ambient temperature"
                suffix="°C"
                value={form.ambientTemperatureC}
                placeholder="25"
                onChange={(value) =>
                  update('ambientTemperatureC', value)
                }
              />

              <NumericField
                label="Lumped-model thermal ceiling"
                suffix="°C"
                value={form.throttleTemperatureC}
                placeholder="42"
                onChange={(value) =>
                  update('throttleTemperatureC', value)
                }
              />
            </div>

            <details className="il-advanced">
              <summary>SoC architecture assumptions</summary>

              <p className="il-help">
                Enter up to four CPU clusters. Relative IPC is optional and
                normalized to your chosen reference, where 1.0 means equal IPC.
                Node size is metadata only and never creates an automatic
                performance uplift.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Fabrication node"
                  suffix="nm"
                  value={form.socFabricationNodeNm}
                  placeholder="2"
                  onChange={(value) =>
                    update(
                      'socFabricationNodeNm',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Memory bandwidth"
                  suffix="GB/s"
                  value={form.socMemoryBandwidthGbps}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socMemoryBandwidthGbps',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 1 cores"
                  value={form.socCluster1Cores}
                  placeholder="1"
                  step="1"
                  onChange={(value) =>
                    update(
                      'socCluster1Cores',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 1 max clock"
                  suffix="GHz"
                  value={form.socCluster1ClockGhz}
                  placeholder="3.8"
                  onChange={(value) =>
                    update(
                      'socCluster1ClockGhz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 1 relative IPC"
                  value={form.socCluster1RelativeIpc}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socCluster1RelativeIpc',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 2 cores"
                  value={form.socCluster2Cores}
                  placeholder="3"
                  step="1"
                  onChange={(value) =>
                    update(
                      'socCluster2Cores',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 2 max clock"
                  suffix="GHz"
                  value={form.socCluster2ClockGhz}
                  placeholder="3.3"
                  onChange={(value) =>
                    update(
                      'socCluster2ClockGhz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 2 relative IPC"
                  value={form.socCluster2RelativeIpc}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socCluster2RelativeIpc',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 3 cores"
                  value={form.socCluster3Cores}
                  placeholder="6"
                  step="1"
                  onChange={(value) =>
                    update(
                      'socCluster3Cores',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 3 max clock"
                  suffix="GHz"
                  value={form.socCluster3ClockGhz}
                  placeholder="2.8"
                  onChange={(value) =>
                    update(
                      'socCluster3ClockGhz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 3 relative IPC"
                  value={form.socCluster3RelativeIpc}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socCluster3RelativeIpc',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 4 cores"
                  value={form.socCluster4Cores}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update(
                      'socCluster4Cores',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 4 max clock"
                  suffix="GHz"
                  value={form.socCluster4ClockGhz}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socCluster4ClockGhz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cluster 4 relative IPC"
                  value={form.socCluster4RelativeIpc}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'socCluster4RelativeIpc',
                      value,
                    )
                  }
                />
              </div>
            </details>

            <details className="il-advanced">
              <summary>Advanced thermal model</summary>

              <p className="il-help">
                The lumped resistance/mass fields drive the legacy thermal trace.
                The optional two-node fields separately model the SoC/package and
                chassis/surface. Supply all four two-node physical parameters or
                leave them blank. Do not guess them.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Thermal resistance"
                  suffix="°C/W"
                  value={form.thermalResistanceCPerW}
                  placeholder="3"
                  onChange={(value) =>
                    update('thermalResistanceCPerW', value)
                  }
                />

                <NumericField
                  label="Thermal mass"
                  suffix="J/°C"
                  value={form.thermalMassJPerC}
                  placeholder="45"
                  onChange={(value) =>
                    update('thermalMassJPerC', value)
                  }
                />

                <NumericField
                  label="SoC → chassis resistance"
                  suffix="°C/W"
                  value={
                    form.socToChassisResistanceCPerW
                  }
                  placeholder="2.5"
                  onChange={(value) =>
                    update(
                      'socToChassisResistanceCPerW',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Chassis → ambient resistance"
                  suffix="°C/W"
                  value={
                    form.chassisToAmbientResistanceCPerW
                  }
                  placeholder="3.5"
                  onChange={(value) =>
                    update(
                      'chassisToAmbientResistanceCPerW',
                      value,
                    )
                  }
                />

                <NumericField
                  label="SoC/package thermal mass"
                  suffix="J/°C"
                  value={form.socThermalMassJPerC}
                  placeholder="12"
                  onChange={(value) =>
                    update(
                      'socThermalMassJPerC',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Chassis thermal mass"
                  suffix="J/°C"
                  value={
                    form.chassisThermalMassJPerC
                  }
                  placeholder="55"
                  onChange={(value) =>
                    update(
                      'chassisThermalMassJPerC',
                      value,
                    )
                  }
                />

                <NumericField
                  label="SoC/package throttle ceiling"
                  suffix="°C"
                  value={
                    form.socPackageThrottleTemperatureC
                  }
                  placeholder="85"
                  onChange={(value) =>
                    update(
                      'socPackageThrottleTemperatureC',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Surface comfort threshold"
                  suffix="°C"
                  value={
                    form.surfaceComfortTemperatureC
                  }
                  placeholder="42"
                  onChange={(value) =>
                    update(
                      'surfaceComfortTemperatureC',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Test duration"
                  suffix="s"
                  value={form.thermalDurationSeconds}
                  placeholder="600"
                  onChange={(value) =>
                    update('thermalDurationSeconds', value)
                  }
                />
              </div>

              {incompleteTwoNodeInput ? (
                <p className="il-simple-error" role="alert">
                  Two-node thermal physics needs all four physical parameters:
                  SoC-to-chassis resistance, chassis-to-ambient resistance,
                  SoC/package thermal mass, chassis thermal mass and an
                  SoC/package throttle ceiling. The two-node trace is disabled
                  until all five required values are supplied.
                </p>
              ) : null}
            </details>

            <p className="il-help">
              Peak benchmark evidence and sustained-performance evidence are
              intentionally separate. Peak scores use protocol-compatible
              measured benchmarks. Any future-generation uplift is an explicit
              assumption. Sustained performance remains evidence-calibrated
              thermal behavior.
            </p>
          </div>

          <div className="il-section">
            <div className="il-section-heading il-section-heading-action">
              <div className="il-heading-copy">
                <span>06</span>
                <div>
                  <h2>Cameras</h2>
                  <p>
                    Add only what is actually known.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={addCamera}
              >
                + Add camera
              </button>
            </div>

            <details className="il-advanced">
              <summary>
                Multi-camera zoom handoff
              </summary>

              <p className="il-help">
                Optional. Ask the simulator which supplied camera can reach a
                target equivalent focal length while retaining a requested
                native output resolution. Computational fusion and AI
                reconstruction are not assumed.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Zoom target"
                  suffix="mm eq."
                  value={
                    form.zoomTargetEquivalentFocalLengthMm
                  }
                  placeholder="120"
                  step="1"
                  onChange={(value) =>
                    update(
                      'zoomTargetEquivalentFocalLengthMm',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Minimum native output"
                  suffix="MP"
                  value={
                    form.zoomMinimumOutputResolutionMp
                  }
                  placeholder="12"
                  step="0.1"
                  onChange={(value) =>
                    update(
                      'zoomMinimumOutputResolutionMp',
                      value,
                    )
                  }
                />
              </div>
            </details>

            {cameras.length === 0 ? (
              <div className="il-empty">
                No camera modules added. Camera
                calculations will remain unknown.
              </div>
            ) : (
              <div className="il-camera-list">
                {cameras.map((camera, index) => (
                  <article
                    className="il-camera"
                    key={camera.id}
                  >
                    <div className="il-camera-title">
                      <strong>
                        Camera {index + 1}
                      </strong>

                      <button
                        type="button"
                        className="il-remove"
                        onClick={() =>
                          removeCamera(camera.id)
                        }
                      >
                        Remove
                      </button>
                    </div>

                    <div className="il-grid">
                      <label className="il-field">
                        <span>Type</span>

                        <select
                          value={camera.type}
                          onChange={(event) =>
                            updateCamera(camera.id, {
                              type: event.currentTarget
                                .value as CameraModuleType,
                            })
                          }
                        >
                          <option value="wide">
                            Wide
                          </option>
                          <option value="ultrawide">
                            Ultrawide
                          </option>
                          <option value="telephoto">
                            Telephoto
                          </option>
                          <option value="periscope">
                            Periscope
                          </option>
                          <option value="front">
                            Front
                          </option>
                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <NumericField
                        label="Sensor format"
                        suffix="1/x″"
                        value={
                          camera.sensorFormatDenominator
                        }
                        placeholder="1.3"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            sensorFormatDenominator:
                              value,
                          })
                        }
                      />

                      <NumericField
                        label="Exact sensor width"
                        suffix="mm"
                        value={
                          camera.sensorWidthMm ?? ''
                        }
                        placeholder="Optional"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            sensorWidthMm: value,
                          })
                        }
                      />

                      <NumericField
                        label="Exact sensor height"
                        suffix="mm"
                        value={
                          camera.sensorHeightMm ?? ''
                        }
                        placeholder="Optional"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            sensorHeightMm: value,
                          })
                        }
                      />

                      <NumericField
                        label="Resolution"
                        suffix="MP"
                        value={camera.resolutionMp}
                        placeholder="50"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            resolutionMp: value,
                          })
                        }
                      />

                      <NumericField
                        label="Equivalent focal length"
                        suffix="mm"
                        value={
                          camera.equivalentFocalLengthMm
                        }
                        placeholder="24"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            equivalentFocalLengthMm:
                              value,
                          })
                        }
                      />

                      <NumericField
                        label="Aperture"
                        suffix="f/"
                        value={
                          camera.apertureFNumber
                        }
                        placeholder="1.6"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            apertureFNumber: value,
                          })
                        }
                      />
                    </div>

                    <details className="il-advanced">
                      <summary>
                        Advanced optical & module data
                      </summary>

                      <div className="il-grid">
                        <NumericField
                          label="Physical focal length"
                          suffix="mm"
                          value={
                            camera.physicalFocalLengthMm
                          }
                          placeholder="6.5"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              physicalFocalLengthMm:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Focus distance"
                          suffix="m"
                          value={
                            camera.focusDistanceM
                          }
                          placeholder="2"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              focusDistanceM: value,
                            })
                          }
                        />

                        <NumericField
                          label="Exposure time"
                          suffix="s"
                          value={
                            camera.exposureTimeSeconds ?? ''
                          }
                          placeholder="0.0333"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              exposureTimeSeconds: value,
                            })
                          }
                        />

                        <NumericField
                          label="Sensor readout"
                          suffix="s"
                          value={
                            camera.sensorReadoutTimeSeconds ?? ''
                          }
                          placeholder="0.0167"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              sensorReadoutTimeSeconds: value,
                            })
                          }
                        />

                        <NumericField
                          label="Video frame rate"
                          suffix="fps"
                          value={
                            camera.videoFrameRateFps ?? ''
                          }
                          placeholder="60"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoFrameRateFps: value,
                            })
                          }
                        />

                        <NumericField
                          label="Subject angular speed"
                          suffix="°/s"
                          value={
                            camera.subjectAngularSpeedDegPerSecond ?? ''
                          }
                          placeholder="2"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              subjectAngularSpeedDegPerSecond:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Camera angular shake"
                          suffix="°/s"
                          value={
                            camera.cameraAngularShakeDegPerSecond ?? ''
                          }
                          placeholder="1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              cameraAngularShakeDegPerSecond:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="OIS shake compensation"
                          suffix="0–1"
                          value={
                            camera.oisAngularCompensationFraction ?? ''
                          }
                          placeholder="0.75"
                          step="0.01"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              oisAngularCompensationFraction:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Lens transmission"
                          suffix="0–1"
                          value={
                            camera.lensTransmissionFraction ?? ''
                          }
                          placeholder="0.8"
                          step="0.01"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              lensTransmissionFraction: value,
                            })
                          }
                        />

                        <NumericField
                          label="Quantum efficiency"
                          suffix="0–1"
                          value={
                            camera.quantumEfficiencyFraction ?? ''
                          }
                          placeholder="0.65"
                          step="0.01"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              quantumEfficiencyFraction: value,
                            })
                          }
                        />

                        <NumericField
                          label="Pixel binning"
                          suffix="linear"
                          value={
                            camera.binningLinearFactor ?? ''
                          }
                          placeholder="2"
                          step="1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              binningLinearFactor: value,
                            })
                          }
                        />

                        <NumericField
                          label="Crop zoom"
                          suffix="×"
                          value={
                            camera.cropZoomRatio ?? ''
                          }
                          placeholder="2"
                          step="0.1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              cropZoomRatio: value,
                            })
                          }
                        />

                        <NumericField
                          label="Target output"
                          suffix="MP"
                          value={
                            camera.targetOutputResolutionMp ?? ''
                          }
                          placeholder="12"
                          step="0.1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              targetOutputResolutionMp: value,
                            })
                          }
                        />

                        <NumericField
                          label="Module width"
                          suffix="mm"
                          value={camera.moduleWidthMm}
                          placeholder="20"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              moduleWidthMm: value,
                            })
                          }
                        />

                        <NumericField
                          label="Module height"
                          suffix="mm"
                          value={camera.moduleHeightMm}
                          placeholder="20"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              moduleHeightMm: value,
                            })
                          }
                        />

                        <NumericField
                          label="Module depth"
                          suffix="mm"
                          value={camera.moduleDepthMm}
                          placeholder="6"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              moduleDepthMm: value,
                            })
                          }
                        />
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>07</span>
              <div>
                <h2>Packaging</h2>
                <p>
                  Model the known internal volume
                  budget.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <NumericField
                label="Reserved volume"
                suffix="%"
                value={form.reservedVolumePercent}
                placeholder="20"
                onChange={(value) =>
                  update(
                    'reservedVolumePercent',
                    value,
                  )
                }
              />
            </div>

            <details className="il-advanced">
              <summary>
                Known component volumes
              </summary>

              <p className="il-help">
                Battery and camera volume are calculated
                automatically when enough geometry is
                supplied.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Thermal"
                  suffix="mm³"
                  value={form.thermalMm3}
                  onChange={(value) =>
                    update('thermalMm3', value)
                  }
                />

                <NumericField
                  label="Logic board"
                  suffix="mm³"
                  value={form.boardMm3}
                  onChange={(value) =>
                    update('boardMm3', value)
                  }
                />

                <NumericField
                  label="Speakers"
                  suffix="mm³"
                  value={form.speakersMm3}
                  onChange={(value) =>
                    update('speakersMm3', value)
                  }
                />

                <NumericField
                  label="Other known components"
                  suffix="mm³"
                  value={form.otherMm3}
                  onChange={(value) =>
                    update('otherMm3', value)
                  }
                />
              </div>
            </details>
          </div>

          <div className="il-run">
            <button
              type="button"
              className="il-simulate"
              onClick={simulate}
            >
              Run simulation →
            </button>

            <p>
              Unknown inputs stay unknown. The engine
              does not silently invent missing data.
            </p>
          </div>
        </section>

        <aside
          className="il-results"
          aria-live="polite"
          aria-label="Simulation results"
        >
          <div className="il-results-top">
            <span className="eyebrow">
              Simulation result
            </span>

            <span>
              v{SIMULATION_ENGINE_VERSION}
            </span>
          </div>

          {!hasSimulated || !result ? (
            <div className="il-result-empty">
              <div className="il-orbit" aria-hidden="true">
                <span />
              </div>

              <h2>Nothing simulated yet.</h2>

              <p>
                Enter the specifications you know, or
                load the reference example, then run
                the model.
              </p>
            </div>
          ) : (
            <>
              <div className="il-result-identity">
                <span>
                  {simulationInput?.formFactor
                    .replaceAll('_', ' ')
                    .toUpperCase()}
                </span>

                <h2>
                  {simulationInput?.name ||
                    'Untitled concept'}
                </h2>
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Display
                </span>

                <div className="il-metrics">
                  <div>
                    <strong>
                      {format(
                        simulationInput?.displays
                          .primary.diagonalInches,
                        2,
                      )}
                      {simulationInput?.displays.primary
                        .diagonalInches !== undefined
                        ? '″'
                        : ''}
                    </strong>
                    <span>Diagonal</span>
                  </div>

                  <div>
                    <strong>
                      {format(display?.ppi, 0)}
                    </strong>
                    <span>PPI</span>
                  </div>

                  <div>
                    <strong>
                      {format(
                        display?.screenToBodyRatio,
                        1,
                      )}
                      {display?.screenToBodyRatio !==
                      undefined
                        ? '%'
                        : ''}
                    </strong>
                    <span>Screen to body</span>
                  </div>
                </div>
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Display load · {LIVE_DISPLAY_EXPERIENCE_VERSION}
                </span>

                {displayExperience &&
                displayExperience.status !== 'unresolved' ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {displayExperience.megapixelsPerFrame !==
                          undefined
                            ? `${format(
                                displayExperience.megapixelsPerFrame,
                                2,
                              )} MP`
                            : 'Unknown'}
                        </strong>
                        <span>Pixels per frame</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.pixelThroughputMpxPerSecond !==
                          undefined
                            ? `${format(
                                displayExperience
                                  .pixelThroughputMpxPerSecond,
                                1,
                              )} MP/s`
                            : 'Unknown'}
                        </strong>
                        <span>Pixel throughput</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.refreshMultiplierVs60 !==
                          undefined
                            ? `${format(
                                displayExperience
                                  .refreshMultiplierVs60,
                                2,
                              )}×`
                            : 'Unknown'}
                        </strong>
                        <span>Refresh load vs 60 Hz</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.rasterLoadIndex !==
                          undefined
                            ? `${format(
                                displayExperience.rasterLoadIndex,
                                2,
                              )}×`
                            : 'Unknown'}
                        </strong>
                        <span>Raster load vs 1080×2400@60</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.luminanceAreaNitCm2 !==
                          undefined
                            ? format(
                                displayExperience
                                  .luminanceAreaNitCm2,
                                0,
                              )
                            : 'Unknown'}
                        </strong>
                        <span>Luminance-area demand</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.panelTechnology ??
                            'Unknown'}
                        </strong>
                        <span>Panel technology</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.load.operatingRefreshRateHz !==
                          undefined
                            ? `${format(
                                displayExperience.load
                                  .operatingRefreshRateHz,
                                0,
                              )} Hz`
                            : 'Unknown'}
                        </strong>
                        <span>Operating refresh</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.load.aplFraction !== undefined
                            ? `${format(
                                displayExperience.load.aplFraction *
                                  100,
                                0,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Average picture level</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.load.emissiveContentLoadIndex !==
                          undefined
                            ? format(
                                displayExperience.load
                                  .emissiveContentLoadIndex,
                                0,
                              )
                            : 'Unknown'}
                        </strong>
                        <span>OLED emissive content load index</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.load.refreshDutyVsMaximum !==
                          undefined
                            ? `${format(
                                displayExperience.load
                                  .refreshDutyVsMaximum *
                                  100,
                                0,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Refresh duty vs maximum</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.electricalPower.status ===
                            'resolved' &&
                          displayExperience.electricalPower
                            .expectedPowerW !== undefined
                            ? `${format(
                                displayExperience.electricalPower
                                  .expectedPowerW,
                                2,
                              )} W`
                            : 'Unresolved'}
                        </strong>
                        <span>Measured-calibrated panel power</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.electricalPower.referenceCount}
                        </strong>
                        <span>Isolated panel-power references</span>
                      </div>
                    </div>

                    <p className="il-help">
                      Electrical panel power:{' '}
                      {displayExperience.electricalPower.status === 'resolved'
                        ? displayExperience.electricalPower.note
                        : displayExperience.electricalPower.unresolvedReason ??
                          displayExperience.electricalPower.note}
                    </p>

                    {displayExperience.load.scenarios.length ? (
                      <div className="il-display-sensitivity">
                        <span className="il-result-label">
                          Content-aware display load
                        </span>

                        <div className="il-sensitivity-grid">
                          {displayExperience.load.scenarios.map(
                            (scenario) => (
                              <div
                                className="il-sensitivity-card"
                                key={scenario.scenario}
                              >
                                <strong>{scenario.label}</strong>

                                {scenario.deltaEmissionLoadPercent !==
                                undefined ? (
                                  <span>
                                    Δ emissive load{' '}
                                    {scenario.deltaEmissionLoadPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaEmissionLoadPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaPixelScanPercent !==
                                undefined ? (
                                  <span>
                                    Δ pixel scan{' '}
                                    {scenario.deltaPixelScanPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaPixelScanPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>

                        <p className="il-help">
                          {displayExperience.load.note}
                        </p>
                      </div>
                    ) : null}

                    {displayRuntimeSensitivity &&
                    displayRuntimeSensitivity.status !==
                      'unresolved' ? (
                      <div className="il-display-runtime-impact">
                        <span className="il-result-label">
                          Measured runtime impact ·{' '}
                          {DISPLAY_RUNTIME_SENSITIVITY_VERSION}
                        </span>

                        <div className="il-sensitivity-grid">
                          {displayRuntimeSensitivity.scenarios.map(
                            (scenario) => (
                              <div
                                className="il-sensitivity-card"
                                key={`${scenario.workload}-${scenario.scenario}`}
                              >
                                <strong>
                                  {scenario.workload.replaceAll(
                                    '_',
                                    ' ',
                                  )}
                                </strong>

                                <span>
                                  {scenario.label}
                                </span>

                                <span>
                                  Δ runtime{' '}
                                  {scenario.deltaRuntimePercent >= 0
                                    ? '+'
                                    : ''}
                                  {format(
                                    scenario.deltaRuntimePercent,
                                    1,
                                  )}%
                                </span>

                                <span>
                                  Δ drain{' '}
                                  {scenario.deltaDrainPercent >= 0
                                    ? '+'
                                    : ''}
                                  {format(
                                    scenario.deltaDrainPercent,
                                    1,
                                  )}%
                                </span>

                                <small>
                                  {scenario.referenceCount} refs ·{' '}
                                  {format(
                                    scenario.averageCoverage * 100,
                                    0,
                                  )}% coverage ·{' '}
                                  {format(
                                    scenario.averageSimilarity * 100,
                                    0,
                                  )}% similarity
                                </small>
                              </div>
                            ),
                          )}
                        </div>

                        <p className="il-help">
                          {displayRuntimeSensitivity.note}
                        </p>
                      </div>
                    ) : displayRuntimeSensitivity?.status ===
                      'unresolved' &&
                    simulationInput?.battery ? (
                      <p className="il-help">
                        Measured display runtime impact is unresolved because
                        the current corpus does not yet have enough strong
                        protocol-compatible display/runtime references for
                        this configuration.
                      </p>
                    ) : null}

                    {displayExperience.scenarios.length ? (
                      <div className="il-display-sensitivity">
                        <span className="il-result-label">
                          Display what-if sensitivity
                        </span>

                        <div className="il-sensitivity-grid">
                          {displayExperience.scenarios.map(
                            (scenario) => (
                              <div
                                className="il-sensitivity-card"
                                key={scenario.scenario}
                              >
                                <strong>
                                  {scenario.label}
                                </strong>
                                <span>
                                  {format(
                                    scenario
                                      .pixelThroughputMpxPerSecond,
                                    1,
                                  )} MP/s
                                </span>
                                <span>
                                  Δ throughput{' '}
                                  {scenario
                                    .deltaPixelThroughputPercent >= 0
                                    ? '+'
                                    : ''}
                                  {format(
                                    scenario
                                      .deltaPixelThroughputPercent,
                                    1,
                                  )}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    {displayExperience.warnings.length ? (
                      <div className="il-warnings">
                        {displayExperience.warnings.map(
                          (warning) => (
                            <div
                              className="il-warning"
                              key={warning}
                            >
                              <strong>DISPLAY_INPUT</strong>
                              <p>{warning}</p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}

                    <p className="il-help">
                      {displayExperience.note} Brightness is not yet
                      propagated into battery life because the current runtime
                      evidence does not consistently record test luminance.
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    Add resolution, refresh rate and optional brightness
                    to calculate display workload.
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Battery
                </span>

                <div className="il-metrics">
                  <div>
                    <strong>
                      {format(
                        battery?.totalCapacityMah,
                        0,
                      )}
                    </strong>
                    <span>mAh</span>
                  </div>

                  <div>
                    <strong>
                      {format(
                        battery?.totalEnergyWh,
                        2,
                      )}
                    </strong>
                    <span>Wh</span>
                  </div>

                  <div>
                    <strong>
                      {format(
                        battery?.totalVolumeCm3,
                        2,
                      )}
                    </strong>
                    <span>cm³</span>
                  </div>
                </div>
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Battery life · {LIVE_BATTERY_EXPERIENCE_VERSION}
                </span>

                {batteryExperience?.mixedUse ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {format(
                            batteryExperience.mixedUse.minActiveUseHoursPerCharge,
                            1,
                          )}
                          –
                          {format(
                            batteryExperience.mixedUse.maxActiveUseHoursPerCharge,
                            1,
                          )} h
                        </strong>
                        <span>Active-use-only range per charge</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            batteryExperience.mixedUse.expectedActiveUseHoursPerCharge,
                            1,
                          )} h
                        </strong>
                        <span>Expected active-use-only hours</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            batteryExperience.mixedUse.activeHoursPerDay,
                            1,
                          )}
                        </strong>
                        <span>Entered active h/day</span>
                      </div>

                      <div>
                        <strong>
                          {batteryExperience.mixedUse.energyBasis === 'wh'
                            ? `${format(
                                batteryExperience.mixedUse.expectedDrainWhPerDay,
                                2,
                              )} Wh/day`
                            : `${format(
                                batteryExperience.mixedUse.expectedDrainMahPerDay,
                                0,
                              )} mAh/day`}
                        </strong>
                        <span>
                          Expected active drain ·{' '}
                          {batteryExperience.mixedUse.energyBasis === 'wh'
                            ? 'energy-normalized'
                            : 'capacity-normalized'}
                        </span>
                      </div>
                    </div>

                    <div className="il-battery-workloads">
                      {batteryExperience.mixedUse.workloads.map(
                        (workload) => (
                          <div key={workload.workload}>
                            <strong>
                              {workload.workload.replaceAll('_', ' ')}
                            </strong>
                            <span>
                              {format(workload.hoursPerDay, 1)} h/day ·{' '}
                              {workload.energyBasis === 'wh'
                                ? `${format(
                                    workload.expectedDrainWhPerHour,
                                    2,
                                  )} Wh/h`
                                : `${format(
                                    workload.expectedDrainMahPerHour,
                                    0,
                                  )} mAh/h`}
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="il-runtime-evidence">
                      <span className="il-result-label">
                        Runtime evidence quality
                      </span>

                      <div className="il-sensitivity-grid">
                        {batteryExperience.runtimes
                          .filter(
                            (runtime) =>
                              runtime.status === 'resolved',
                          )
                          .map((runtime) => (
                            <div
                              className="il-sensitivity-card"
                              key={runtime.workload}
                            >
                              <strong>
                                {runtime.workload.replaceAll(
                                  '_',
                                  ' ',
                                )}
                              </strong>

                              <span>
                                {runtime.averageSimilarity !== undefined
                                  ? `${format(
                                      runtime.averageSimilarity * 100,
                                      0,
                                    )}% similarity`
                                  : 'Similarity unknown'}
                              </span>

                              <span>
                                {runtime.averageCoverage !== undefined
                                  ? `${format(
                                      runtime.averageCoverage * 100,
                                      0,
                                    )}% spec coverage`
                                  : 'Coverage unknown'}
                              </span>

                              <span>
                                {runtime.confidence !== undefined
                                  ? `${format(
                                      runtime.confidence * 100,
                                      0,
                                    )}% confidence`
                                  : 'Confidence unknown'}
                              </span>

                              <small>
                                {runtime.referenceCount ?? 0}{' '}
                                measured devices
                                {runtime.evidenceScope
                                  ? ` · ${runtime.evidenceScope.replaceAll('-', ' ')}`
                                  : ''}
                              </small>

                              <small>
                                {runtime.energyBasis === 'wh'
                                  ? `${format(
                                      runtime.expectedDrainWhPerHour,
                                      2,
                                    )} Wh/h · energy-normalized`
                                  : `${format(
                                      runtime.expectedDrainMahPerHour,
                                      0,
                                    )} mAh/h · capacity-normalized`}
                              </small>
                              {runtime.sameSocFamilyReferences !== undefined ||
                              runtime.sameSocVendorReferences !== undefined ? (
                                <small>
                                  {runtime.sameSocFamilyReferences ?? 0} same-family ·{' '}
                                  {runtime.sameSocVendorReferences ?? 0} same-vendor
                                </small>
                              ) : null}
                              <small>
                                {runtime.sourceRecordCount ?? 0} source page
                                {(runtime.sourceRecordCount ?? 0) === 1
                                  ? ''
                                  : 's'} ·{' '}
                                {runtime.publisherCount ?? 0} publisher
                                {(runtime.publisherCount ?? 0) === 1
                                  ? ''
                                  : 's'} ·{' '}
                                {runtime.protocolFamilyCount ?? 0}{' '}
                                {(runtime.protocolFamilyCount ?? 0) === 1
                                  ? 'protocol family'
                                  : 'protocol families'}
                              </small>
                            </div>
                          ))}
                      </div>
                    </div>

                    <p className="il-help">
                      Runtime uses protocol-isolated released-device evidence,
                      now matched on display resolution and refresh rate when
                      those fields are available. Camera-use runtime remains
                      excluded until isolated camera battery measurements are
                      available.
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    Add battery capacity and daily web, video or gaming use to
                    calculate corpus-calibrated battery life.
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Wired charging · {LIVE_BATTERY_EXPERIENCE_VERSION}
                </span>

                {chargingResult?.status === 'resolved' &&
                chargingResult.estimate ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {chargingResult.estimate.charge30mPercent
                            ? `${format(
                                chargingResult.estimate.charge30mPercent.expected,
                                0,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Expected after 30 min</span>
                      </div>

                      <div>
                        <strong>
                          {formatDurationMinutes(
                            chargingResult.estimate.timeTo50Minutes?.expected,
                          )}
                        </strong>
                        <span>0–50%</span>
                      </div>

                      <div>
                        <strong>
                          {formatDurationMinutes(
                            chargingResult.estimate.timeTo80Minutes?.expected,
                          )}
                        </strong>
                        <span>0–80%</span>
                      </div>

                      <div>
                        <strong>
                          {formatDurationMinutes(
                            chargingResult.estimate.timeTo100Minutes?.expected,
                          )}
                        </strong>
                        <span>0–100%</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.confidenceGrade}
                        </strong>
                        <span>Evidence confidence</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.evidenceMode ===
                          'comparable-only'
                            ? 'Comparable'
                            : chargingResult.estimate.evidenceMode ===
                                'interpolated'
                              ? 'Interpolated'
                              : chargingResult.estimate.evidenceMode ===
                                  'near-extrapolated'
                                ? 'Near extrapolation'
                                : chargingResult.estimate.evidenceMode ===
                                    'far-extrapolated'
                                  ? 'Far extrapolation'
                                  : 'Measured'}
                        </strong>
                        <span>Evidence mode</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.referenceCount}
                        </strong>
                        <span>Independent devices</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.referenceModeCount}
                        </strong>
                        <span>Charging modes used</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.sourceRecordCount}
                        </strong>
                        <span>Source pages</span>
                      </div>

                      <div>
                        <strong>
                          {chargingResult.estimate.publisherCount}
                        </strong>
                        <span>Distinct publishers</span>
                      </div>

                      {chargingResult.estimate.measurementCount !== undefined ? (
                        <div>
                          <strong>
                            {chargingResult.estimate.measurementCount}
                          </strong>
                          <span>Measured milestone rows</span>
                        </div>
                      ) : null}

                      <div>
                        <strong>
                          {chargingResult.estimate.normalizationBasis === 'wh'
                            ? chargingResult.estimate.normalized
                                ?.expectedMinutesPerWh !== undefined
                              ? `${format(
                                  chargingResult.estimate.normalized
                                    .expectedMinutesPerWh,
                                  2,
                                )} min/Wh`
                              : 'Unknown'
                            : chargingResult.estimate.normalized
                                ?.expectedMinutesPer1000Mah !== undefined
                              ? `${format(
                                  chargingResult.estimate.normalized
                                    .expectedMinutesPer1000Mah,
                                  1,
                                )} min/1,000 mAh`
                              : 'Unknown'}
                        </strong>
                        <span>
                          {chargingResult.estimate.normalizationBasis === 'wh'
                            ? 'Energy normalization'
                            : 'Capacity normalization'}
                        </span>
                      </div>
                    </div>

                    {chargingResult.estimate.thermalResponse ? (
                      <p className="il-help">
                        Thermal speed adjustment:{' '}
                        {chargingResult.estimate.thermalResponse.applied
                          ? `${format(
                              (chargingResult.estimate.thermalResponse
                                .averageTimeScale -
                                1) *
                                100,
                              1,
                            )}% slower across ${chargingResult.estimate.thermalResponse.adjustedReferenceModes} measured mode${chargingResult.estimate.thermalResponse.adjustedReferenceModes === 1 ? '' : 's'}`
                          : 'not applied'}
                        {' · '}
                        {chargingResult.estimate.thermalResponse.note}
                      </p>
                    ) : null}

                    {chargingResult.estimate.powerResponse
                      ?.targetPosition ? (
                      <p className="il-help">
                        Power response:{' '}
                        {chargingResult.estimate.powerResponse.targetPosition
                          .replaceAll('-', ' ')}
                        {chargingResult.estimate.powerResponse
                          .evidenceRangeWatts
                          ? ` · evidence range ${format(
                              chargingResult.estimate.powerResponse
                                .evidenceRangeWatts.min,
                              0,
                            )}–${format(
                              chargingResult.estimate.powerResponse
                                .evidenceRangeWatts.max,
                              0,
                            )} W`
                          : ''}
                      </p>
                    ) : null}

                    <p className="il-help">
                      {chargingResult.estimate.note}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    {chargingResult?.unresolvedReason ??
                      'Add battery capacity and wired charging wattage to estimate charging.'}
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Wireless charging · {LIVE_BATTERY_EXPERIENCE_VERSION}
                </span>

                {wirelessChargingResult?.status === 'resolved' ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {wirelessChargingResult.expectedFullChargeMinutes !==
                          undefined
                            ? formatDurationMinutes(
                                wirelessChargingResult.expectedFullChargeMinutes,
                              )
                            : 'Unknown'}
                        </strong>
                        <span>Expected 0–100%</span>
                      </div>

                      <div>
                        <strong>
                          {wirelessChargingResult.confidenceGrade ??
                            'Unknown'}
                        </strong>
                        <span>Evidence confidence</span>
                      </div>

                      <div>
                        <strong>
                          {wirelessChargingResult.referenceCount ??
                            'Unknown'}
                        </strong>
                        <span>Measured references</span>
                      </div>
                    </div>

                    <p className="il-help">
                      {wirelessChargingResult.note}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    {wirelessChargingWatts === undefined
                      ? 'Add wireless charging wattage to estimate wireless charging.'
                      : wirelessChargingResult?.unresolvedReason ??
                        'No measured wireless charging evidence is available for a reliable estimate yet.'}
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  SoC architecture · {SOC_ARCHITECTURE_MODEL_VERSION}
                </span>

                {socArchitecture ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {socArchitecture.totalCpuCores ??
                            'Unknown'}
                        </strong>
                        <span>Total CPU cores</span>
                      </div>

                      <div>
                        <strong>
                          {socArchitecture.maximumCpuClockGhz !==
                          undefined
                            ? `${format(
                                socArchitecture.maximumCpuClockGhz,
                                2,
                              )} GHz`
                            : 'Unknown'}
                        </strong>
                        <span>Maximum CPU clock</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            socArchitecture.clockCapacityIndex,
                            2,
                          )}
                        </strong>
                        <span>Clock/core capacity index</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            socArchitecture.ipcAdjustedSingleThreadIndex,
                            2,
                          )}
                        </strong>
                        <span>IPC-adjusted single-thread index</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            socArchitecture.ipcAdjustedAggregateIndex,
                            2,
                          )}
                        </strong>
                        <span>IPC-adjusted aggregate index</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            socArchitecture.ipcAdjustedAggregatePerWIndex,
                            3,
                          )}
                        </strong>
                        <span>IPC-adjusted aggregate / W</span>
                      </div>

                      <div>
                        <strong>
                          {socArchitecture.memoryBandwidthPerCoreGbps !==
                          undefined
                            ? `${format(
                                socArchitecture.memoryBandwidthPerCoreGbps,
                                1,
                              )} GB/s`
                            : 'Unknown'}
                        </strong>
                        <span>Memory bandwidth per core</span>
                      </div>

                      <div>
                        <strong>
                          {socArchitecture.fabricationNodeNm !==
                          undefined
                            ? `${format(
                                socArchitecture.fabricationNodeNm,
                                1,
                              )} nm`
                            : 'Unknown'}
                        </strong>
                        <span>Fabrication node metadata</span>
                      </div>
                    </div>

                    <p className="il-help">
                      {socArchitecture.note}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    Add at least one CPU cluster with core count and max clock
                    to calculate architecture indices.
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Peak performance · {PEAK_PERFORMANCE_ESTIMATOR_VERSION}
                </span>

                {peakPerformanceEstimate?.status === 'resolved' ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {format(
                            peakPerformanceEstimate.baselineExpected,
                            0,
                          )}
                        </strong>
                        <span>Measured evidence baseline</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            peakPerformanceEstimate.adjustedExpected,
                            0,
                          )}
                        </strong>
                        <span>
                          {peakPerformanceEstimate.assumptionApplied
                            ? 'Adjusted peak estimate'
                            : 'Peak estimate'}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {peakPerformanceEstimate.baselineMin !== undefined &&
                          peakPerformanceEstimate.baselineMax !== undefined
                            ? `${format(
                                peakPerformanceEstimate.baselineMin,
                                0,
                              )}–${format(
                                peakPerformanceEstimate.baselineMax,
                                0,
                              )}`
                            : 'Unknown'}
                        </strong>
                        <span>Measured peer range</span>
                      </div>

                      <div>
                        <strong>
                          {peakPerformanceEstimate.referenceCount}
                        </strong>
                        <span>Measured references</span>
                      </div>

                      <div>
                        <strong>
                          {peakPerformanceEstimate.evidenceScope
                            ? peakPerformanceEstimate.evidenceScope.replaceAll(
                                '-',
                                ' ',
                              )
                            : 'Unknown'}
                        </strong>
                        <span>Evidence scope</span>
                      </div>

                      <div>
                        <strong>
                          {peakPerformanceEstimate.assumptionApplied
                            ? `+${format(
                                peakPerformanceEstimate.assumedGenerationUpliftPercent,
                                1,
                              )}%`
                            : 'None'}
                        </strong>
                        <span>Generation uplift assumption</span>
                      </div>
                    </div>

                    <p className="il-help">
                      {peakPerformanceEstimate.note}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    {peakPerformanceEstimate?.unresolvedReason ??
                      'No compatible measured peak benchmark evidence is available.'}
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Thermal & performance · {LIVE_THERMAL_EXPERIENCE_VERSION}
                </span>

                {thermalResult?.status === 'resolved' ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {thermalResult.peakTemperatureC !== undefined
                            ? `${format(
                                thermalResult.peakTemperatureC,
                                1,
                              )} °C`
                            : 'Unknown'}
                        </strong>
                        <span>Peak model-node temperature</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.endTemperatureC !== undefined
                            ? `${format(
                                thermalResult.endTemperatureC,
                                1,
                              )} °C`
                            : 'Unknown'}
                        </strong>
                        <span>End model-node temperature</span>
                      </div>

                      {thermalResult.evidencePriorPercent !== undefined ? (
                        <div>
                          <strong>
                            {format(
                              thermalResult.evidencePriorPercent,
                              1,
                            )}%
                          </strong>
                          <span>Measured sustained prior</span>
                        </div>
                      ) : null}

                      {thermalResult.rawPhysicsSustainedPercent !== undefined ? (
                        <div>
                          <strong>
                            {format(
                              thermalResult.rawPhysicsSustainedPercent,
                              1,
                            )}%
                          </strong>
                          <span>Raw thermal physics ceiling</span>
                        </div>
                      ) : null}

                      <div>
                        <strong>
                          {thermalResult.sustainedPerformancePercent !== undefined
                            ? `${format(
                                thermalResult.sustainedPerformancePercent,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Final sustained performance</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.sustainedPowerW !== undefined
                            ? `${format(
                                thermalResult.sustainedPowerW,
                                2,
                              )} W`
                            : 'Unknown'}
                        </strong>
                        <span>Sustained SoC power</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.throttleStartSecond !== undefined
                            ? formatDurationSeconds(
                                thermalResult.throttleStartSecond,
                              )
                            : 'No throttle detected'}
                        </strong>
                        <span>Throttle onset</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.evidenceMode === 'calibrated'
                            ? 'Calibrated'
                            : 'Physics fallback'}
                        </strong>
                        <span>Evidence mode</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.referenceCount ?? 'None'}
                        </strong>
                        <span>Measured references used</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.evidenceScope
                            ? thermalResult.evidenceScope.replaceAll('-', ' ')
                            : 'Unknown'}
                        </strong>
                        <span>Calibration scope</span>
                      </div>

                      {thermalResult.sameSocFamilyReferences !== undefined ||
                      thermalResult.sameSocVendorReferences !== undefined ? (
                        <div>
                          <strong>
                            {thermalResult.sameSocFamilyReferences ?? 0} /{' '}
                            {thermalResult.sameSocVendorReferences ?? 0}
                          </strong>
                          <span>Same family / same vendor refs</span>
                        </div>
                      ) : null}

                      {thermalResult.sourceRecordCount !== undefined ? (
                        <div>
                          <strong>
                            {thermalResult.sourceRecordCount} /{' '}
                            {thermalResult.publisherCount ?? 0}
                          </strong>
                          <span>Source pages / publishers</span>
                        </div>
                      ) : null}

                      <div>
                        <strong>
                          {thermalResult.sourceRecordCount ?? 0}
                        </strong>
                        <span>Source pages</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.publisherCount ?? 0}
                        </strong>
                        <span>Distinct publishers</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.confidence !== undefined
                            ? `${format(
                                thermalResult.confidence * 100,
                                0,
                              )}%`
                            : 'Unrated'}
                        </strong>
                        <span>Evidence confidence</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.averageSimilarity !== undefined
                            ? `${format(
                                thermalResult.averageSimilarity * 100,
                                0,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Comparable similarity</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.averageCoverage !== undefined
                            ? `${format(
                                thermalResult.averageCoverage * 100,
                                0,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Spec coverage</span>
                      </div>
                    </div>

                    {twoNodeThermalSummary}

                    {thermalResult.protocolKey ? (
                      <p className="il-help">
                        Measured sustained-performance protocol:{' '}
                        {thermalResult.protocolKey.replace(
                          '::',
                          ' · ',
                        )}
                      </p>
                    ) : null}

                    {thermalResult.points &&
                    thermalResult.points.length > 1 ? (
                      <div className="il-thermal-timeline">
                        <div className="il-result-label">
                          Thermal timeline
                        </div>

                        <div className="il-thermal-table">
                          {thermalResult.points
                            .filter(
                              (_, index, points) =>
                                index === 0 ||
                                index === points.length - 1 ||
                                index %
                                  Math.max(
                                    1,
                                    Math.floor(points.length / 6),
                                  ) ===
                                  0,
                            )
                            .map((point) => (
                              <div
                                className="il-thermal-row"
                                key={point.second}
                              >
                                <strong>
                                  {formatDurationSeconds(
                                    point.second,
                                  )}
                                </strong>
                                <span>
                                  {format(
                                    point.temperatureC,
                                    1,
                                  )} °C
                                </span>
                                <span>
                                  {format(
                                    point.performancePercent,
                                    0,
                                  )}% perf
                                </span>
                                <span>
                                  {format(
                                    point.powerW,
                                    2,
                                  )} W
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}

                    {thermalResult.sensitivity?.length ? (
                      <div className="il-thermal-sensitivity">
                        <div className="il-result-label">
                          What-if sensitivity
                        </div>

                        <div className="il-sensitivity-grid">
                          {thermalResult.sensitivity.map(
                            (scenario) => (
                              <div
                                className="il-sensitivity-card"
                                key={scenario.scenario}
                              >
                                <strong>{scenario.label}</strong>
                                <span>
                                  {format(
                                    scenario.peakTemperatureC,
                                    1,
                                  )} °C peak
                                </span>
                                <span>
                                  {format(
                                    scenario.sustainedPerformancePercent,
                                    1,
                                  )}% sustained
                                </span>
                                <span>
                                  {format(
                                    scenario.sustainedPowerW,
                                    2,
                                  )} W sustained
                                </span>
                                <span>
                                  Δ temp {scenario.deltaPeakTemperatureC >= 0 ? '+' : ''}
                                  {format(
                                    scenario.deltaPeakTemperatureC,
                                    1,
                                  )} °C
                                </span>
                                <span>
                                  Δ perf {scenario.deltaSustainedPerformancePercent >= 0 ? '+' : ''}
                                  {format(
                                    scenario.deltaSustainedPerformancePercent,
                                    1,
                                  )}%
                                </span>
                                <small>
                                  {scenario.throttleStartSecond !== undefined
                                    ? `Throttle ${formatDurationSeconds(
                                        scenario.throttleStartSecond,
                                      )}`
                                    : 'No throttle detected'}
                                </small>
                              </div>
                            ),
                          )}
                        </div>

                        <p className="il-help">
                          Controlled sensitivity probes only. They change one
                          thermal assumption at a time and are not additional
                          measured device results.
                        </p>
                      </div>
                    ) : null}

                    {thermalResult.warnings?.length ? (
                      <div className="il-warnings">
                        {thermalResult.warnings.map(
                          (warning) => (
                            <div
                              className="il-warning"
                              key={warning.code}
                            >
                              <strong>{warning.code}</strong>
                              <p>{warning.message}</p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}

                    <p className="il-help">
                      {thermalResult.note}
                    </p>
                  </>
                ) : sustainedPerformanceEstimate?.status ===
                  'resolved' ? (
                  <>
                    <div className="il-metrics">
                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.expectedPercent !==
                          undefined
                            ? `${format(
                                sustainedPerformanceEstimate.expectedPercent,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Estimated sustained GPU performance</span>
                      </div>

                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.minPercent !==
                            undefined &&
                          sustainedPerformanceEstimate.maxPercent !==
                            undefined
                            ? `${format(
                                sustainedPerformanceEstimate.minPercent,
                                1,
                              )}–${format(
                                sustainedPerformanceEstimate.maxPercent,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Measured peer range</span>
                      </div>

                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.referenceCount}
                        </strong>
                        <span>Measured references used</span>
                      </div>

                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.sourceRecordCount} /{' '}
                          {sustainedPerformanceEstimate.publisherCount}
                        </strong>
                        <span>Source pages / publishers</span>
                      </div>

                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.evidenceScope
                            ? sustainedPerformanceEstimate.evidenceScope.replaceAll(
                                '-',
                                ' ',
                              )
                            : 'Unknown'}
                        </strong>
                        <span>Evidence scope</span>
                      </div>

                      <div>
                        <strong>
                          {sustainedPerformanceEstimate.confidence !==
                          undefined
                            ? `${format(
                                sustainedPerformanceEstimate.confidence *
                                  100,
                                0,
                              )}%`
                            : 'Unrated'}
                        </strong>
                        <span>Evidence confidence</span>
                      </div>
                    </div>

                    {twoNodeThermalSummary}

                    <p className="il-help">
                      Evidence-only estimate ·{' '}
                      {SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION}. This
                      predicts sustained performance from protocol-compatible
                      measured peers without inventing package or surface
                      temperatures. Add explicit thermal physics in Advanced
                      Mode to simulate temperatures.
                    </p>
                  </>
                ) : twoNodeThermalResult ? (
                  <>
                    {twoNodeThermalSummary}
                    <div className="il-empty">
                      {sustainedPerformanceEstimate?.unresolvedReason ??
                        'No compatible measured sustained-performance evidence is available for this configuration. Package and surface temperatures are still shown from the explicit two-node physics.'}
                    </div>
                  </>
                ) : (
                  <div className="il-empty">
                    {thermalResult?.unresolvedReason ??
                      sustainedPerformanceEstimate?.unresolvedReason ??
                      'Add target SoC power, ambient temperature, throttle ceiling, thermal resistance and thermal mass to simulate thermal behavior.'}
                  </div>
                )}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Camera system · {LIVE_CAMERA_EXPERIENCE_VERSION}
                </span>

                <div className="il-metrics">
                  <div>
                    <strong>
                      {result.cameras?.length ??
                        'Unknown'}
                    </strong>
                    <span>Modules</span>
                  </div>

                  <div>
                    <strong>
                      {knownCameraVolumeMm3 !==
                      undefined
                        ? format(
                            knownCameraVolumeMm3 /
                              1000,
                            2,
                          )
                        : 'Unknown'}
                    </strong>
                    <span>Known volume cm³</span>
                  </div>
                </div>

                {cameraZoomHandoff ? (
                  <div className="il-camera-evidence">
                    <span className="il-result-label">
                      Zoom handoff · {CAMERA_ZOOM_HANDOFF_VERSION}
                    </span>

                    {cameraZoomHandoff.status === 'resolved' &&
                    cameraZoomHandoff.selected ? (
                      <>
                        <div className="il-metrics">
                          <div>
                            <strong>
                              Camera {cameraZoomHandoff.selectedCameraId}
                            </strong>
                            <span>Selected module</span>
                          </div>

                          <div>
                            <strong>
                              {format(
                                cameraZoomHandoff.selected
                                  .baseEquivalentFocalLengthMm,
                                1,
                              )}
                              {cameraZoomHandoff.selected
                                .baseEquivalentFocalLengthMm !==
                              undefined
                                ? ' mm'
                                : ''}
                            </strong>
                            <span>Native focal length</span>
                          </div>

                          <div>
                            <strong>
                              {format(
                                cameraZoomHandoff.selected
                                  .requiredCropZoom,
                                2,
                              )}
                              {cameraZoomHandoff.selected
                                .requiredCropZoom !==
                              undefined
                                ? '×'
                                : ''}
                            </strong>
                            <span>Required crop</span>
                          </div>

                          <div>
                            <strong>
                              {format(
                                cameraZoomHandoff.selected
                                  .retainedResolutionMp,
                                1,
                              )}
                              {cameraZoomHandoff.selected
                                .retainedResolutionMp !==
                              undefined
                                ? ' MP'
                                : ''}
                            </strong>
                            <span>Retained native resolution</span>
                          </div>
                        </div>

                        <p className="il-help">
                          {cameraZoomHandoff.note}
                        </p>
                      </>
                    ) : (
                      <div className="il-empty">
                        {cameraZoomHandoff.unresolvedReason ??
                          'Zoom handoff is unresolved for this camera set.'}
                      </div>
                    )}
                  </div>
                ) : null}

                {result.cameras?.map((camera, index) => (
                  <div
                    className="il-camera-result"
                    key={`${camera.type}-${index}`}
                  >
                    <strong>
                      {camera.type.replaceAll('_', ' ')} · Camera {index + 1}
                    </strong>

                    <div className="il-metrics">
                      <div>
                        <strong>
                          {format(
                            camera.activeSensorAreaMm2 ??
                              camera.approximateSensorAreaMm2,
                            1,
                          )}
                        </strong>
                        <span>Active sensor area mm²</span>
                      </div>

                      <div>
                        <strong>
                          {camera.sensorGeometrySource
                            ? camera.sensorGeometrySource.replaceAll(
                                '-',
                                ' ',
                              )
                            : 'Unknown'}
                        </strong>
                        <span>Sensor geometry source</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.approximatePixelPitchMicrons,
                            2,
                          )}
                          {camera.approximatePixelPitchMicrons !== undefined
                            ? ' µm'
                            : ''}
                        </strong>
                        <span>Approx. pixel pitch</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.geometricLightCaptureIndex,
                            2,
                          )}
                        </strong>
                        <span>Total-light geometry proxy</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.perPixelLightCaptureIndex,
                            3,
                          )}
                        </strong>
                        <span>Per-pixel light proxy</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.exposureLightCaptureIndex,
                            4,
                          )}
                        </strong>
                        <span>Exposure-aware total light</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.photoelectronCaptureIndex,
                            4,
                          )}
                        </strong>
                        <span>QE-aware capture proxy</span>
                      </div>

                      <div>
                        <strong>
                          {camera.effectiveBinnedResolutionMp !== undefined
                            ? `${format(camera.effectiveBinnedResolutionMp, 1)} MP`
                            : 'Unknown'}
                        </strong>
                        <span>Binned output resolution</span>
                      </div>

                      <div>
                        <strong>
                          {camera.effectiveBinnedPixelPitchMicrons !== undefined
                            ? `${format(camera.effectiveBinnedPixelPitchMicrons, 2)} µm`
                            : 'Unknown'}
                        </strong>
                        <span>Effective binned pixel pitch</span>
                      </div>

                      <div>
                        <strong>
                          {camera.croppedEquivalentFocalLengthMm !== undefined
                            ? `${format(camera.croppedEquivalentFocalLengthMm, 1)} mm`
                            : 'Unknown'}
                        </strong>
                        <span>Crop-equivalent focal length</span>
                      </div>

                      <div>
                        <strong>
                          {camera.croppedResolutionMp !== undefined
                            ? `${format(camera.croppedResolutionMp, 1)} MP`
                            : 'Unknown'}
                        </strong>
                        <span>Resolution after crop</span>
                      </div>

                      <div>
                        <strong>
                          {camera.maxNativeCropZoomForTargetResolution !== undefined
                            ? `${format(camera.maxNativeCropZoomForTargetResolution, 2)}×`
                            : 'Unknown'}
                        </strong>
                        <span>Max native crop zoom at target MP</span>
                      </div>

                      <div>
                        <strong>
                          {camera.cropTotalLightLossStops !== undefined
                            ? `${format(camera.cropTotalLightLossStops, 2)} stops`
                            : 'Unknown'}
                        </strong>
                        <span>Total retained-light loss from crop</span>
                      </div>

                      <div>
                        <strong>
                          {camera.subjectMotionBlurPixels !== undefined
                            ? `${format(
                                camera.subjectMotionBlurPixels,
                                2,
                              )} px`
                            : 'Unknown'}
                        </strong>
                        <span>Subject motion blur</span>
                      </div>

                      <div>
                        <strong>
                          {camera.cameraShakeBlurPixelsAfterOis !== undefined
                            ? `${format(
                                camera.cameraShakeBlurPixelsAfterOis,
                                2,
                              )} px`
                            : 'Unknown'}
                        </strong>
                        <span>Camera shake after OIS</span>
                      </div>

                      <div>
                        <strong>
                          {camera.rollingShutterCameraSkewPixels !== undefined
                            ? `${format(
                                camera.rollingShutterCameraSkewPixels,
                                2,
                              )} px`
                            : 'Unknown'}
                        </strong>
                        <span>Rolling-shutter camera skew</span>
                      </div>

                      <div>
                        <strong>
                          {camera.rollingShutterSubjectSkewPixels !== undefined
                            ? `${format(
                                camera.rollingShutterSubjectSkewPixels,
                                2,
                              )} px`
                            : 'Unknown'}
                        </strong>
                        <span>Rolling-shutter subject skew</span>
                      </div>

                      <div>
                        <strong>
                          {camera.readoutFractionOfFrame !== undefined
                            ? `${format(
                                camera.readoutFractionOfFrame *
                                  100,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Readout fraction of video frame</span>
                      </div>

                      <div>
                        <strong>
                          {camera.equivalentApertureFNumber !== undefined
                            ? `f/${format(
                                camera.equivalentApertureFNumber,
                                1,
                              )}`
                            : 'Unknown'}
                        </strong>
                        <span>35 mm equivalent aperture</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.diagonalFieldOfViewDeg,
                            1,
                          )}
                          {camera.diagonalFieldOfViewDeg !== undefined
                            ? '°'
                            : ''}
                        </strong>
                        <span>Approx. diagonal field of view</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.entrancePupilDiameterMm,
                            2,
                          )}
                          {camera.entrancePupilDiameterMm !== undefined
                            ? ' mm'
                            : ''}
                        </strong>
                        <span>Entrance pupil</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            camera.airyDiskToPixelPitchRatio,
                            2,
                          )}
                        </strong>
                        <span>Diffraction / pixel pitch ratio</span>
                      </div>

                      <div>
                        <strong>
                          {camera.diffractionTwoPixelFNumber !== undefined
                            ? `f/${format(
                                camera.diffractionTwoPixelFNumber,
                                1,
                              )}`
                            : 'Unknown'}
                        </strong>
                        <span>Two-pixel diffraction reference</span>
                      </div>

                      <div>
                        <strong>
                          {camera.hyperfocalDistanceM !== undefined
                            ? `${format(
                                camera.hyperfocalDistanceM,
                                2,
                              )} m`
                            : 'Unknown'}
                        </strong>
                        <span>Approx. hyperfocal distance</span>
                      </div>

                      <div>
                        <strong>
                          {camera.focusNearLimitM !== undefined
                            ? `${format(
                                camera.focusNearLimitM,
                                2,
                              )} m`
                            : 'Unknown'}
                        </strong>
                        <span>Focus near limit</span>
                      </div>

                      <div>
                        <strong>
                          {camera.focusFarLimitM === 'infinity'
                            ? '∞'
                            : camera.focusFarLimitM !== undefined
                              ? `${format(
                                  camera.focusFarLimitM,
                                  2,
                                )} m`
                              : 'Unknown'}
                        </strong>
                        <span>Focus far limit</span>
                      </div>

                      <div>
                        <strong>
                          {camera.totalDepthOfFieldM === 'infinity'
                            ? '∞'
                            : camera.totalDepthOfFieldM !== undefined
                              ? `${format(
                                  camera.totalDepthOfFieldM,
                                  2,
                                )} m`
                              : 'Unknown'}
                        </strong>
                        <span>Total depth of field</span>
                      </div>

                      <div>
                        <strong>
                          {camera.minimumOpticalFootprintWidthMm !== undefined &&
                          camera.minimumOpticalFootprintHeightMm !== undefined
                            ? `${format(
                                camera.minimumOpticalFootprintWidthMm,
                                1,
                              )} × ${format(
                                camera.minimumOpticalFootprintHeightMm,
                                1,
                              )} mm`
                            : 'Unknown'}
                        </strong>
                        <span>Minimum optical footprint</span>
                      </div>

                      <div>
                        <strong>
                          {camera.opticalFootprintFitsModule === undefined
                            ? 'Unresolved'
                            : camera.opticalFootprintFitsModule
                              ? 'Fits entered footprint'
                              : 'Does not fit'}
                        </strong>
                        <span>Optical footprint check</span>
                      </div>
                    </div>

                    {cameraExperiences[index]?.warnings.length ? (
                      <div className="il-warnings">
                        {cameraExperiences[index]?.warnings.map(
                          (warning) => (
                            <div
                              className="il-warning"
                              key={warning.code}
                            >
                              <strong>{warning.code}</strong>
                              <p>{warning.message}</p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}

                    {cameraExperiences[index]?.sensitivity.length ? (
                      <div className="il-camera-sensitivity">
                        <span className="il-result-label">
                          Optical what-if sensitivity
                        </span>

                        <div className="il-sensitivity-grid">
                          {cameraExperiences[index]?.sensitivity.map(
                            (scenario) => (
                              <div
                                className="il-sensitivity-card"
                                key={scenario.scenario}
                              >
                                <strong>{scenario.label}</strong>

                                {scenario.deltaTotalLightPercent !== undefined ? (
                                  <span>
                                    Δ total light{' '}
                                    {scenario.deltaTotalLightPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaTotalLightPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaPerPixelLightPercent !== undefined ? (
                                  <span>
                                    Δ per-pixel light{' '}
                                    {scenario.deltaPerPixelLightPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaPerPixelLightPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaExposureLightPercent !== undefined ? (
                                  <span>
                                    Δ exposure light{' '}
                                    {scenario.deltaExposureLightPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaExposureLightPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaBinnedOutputPixelLightPercent !== undefined ? (
                                  <span>
                                    Δ output-sample light{' '}
                                    {scenario.deltaBinnedOutputPixelLightPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaBinnedOutputPixelLightPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaSubjectMotionBlurPercent !== undefined ? (
                                  <span>
                                    Δ subject blur{' '}
                                    {scenario.deltaSubjectMotionBlurPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaSubjectMotionBlurPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaCameraShakeBlurPercent !== undefined ? (
                                  <span>
                                    Δ camera shake blur{' '}
                                    {scenario.deltaCameraShakeBlurPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaCameraShakeBlurPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaPixelPitchPercent !== undefined ? (
                                  <span>
                                    Δ pixel pitch{' '}
                                    {scenario.deltaPixelPitchPercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaPixelPitchPercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.deltaEquivalentAperturePercent !== undefined ? (
                                  <span>
                                    Δ equiv. aperture{' '}
                                    {scenario.deltaEquivalentAperturePercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.deltaEquivalentAperturePercent,
                                      1,
                                    )}%
                                  </span>
                                ) : null}

                                {scenario.sensorFootprintPressurePercent !== undefined ? (
                                  <small>
                                    Sensor footprint pressure{' '}
                                    {scenario.sensorFootprintPressurePercent >= 0
                                      ? '+'
                                      : ''}
                                    {format(
                                      scenario.sensorFootprintPressurePercent,
                                      1,
                                    )}%
                                  </small>
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>

                        <p className="il-help">
                          Controlled optical probes only. Sensor footprint
                          pressure is a linear sensor-size proxy, not a claim
                          about exact camera-module volume.
                        </p>
                      </div>
                    ) : null}

                    {cameraExperiences[index]?.outcomes.some(
                      (outcome) => outcome.status === 'resolved',
                    ) ? (
                      <div className="il-camera-evidence">
                        <span className="il-result-label">
                          Observed comparable outcomes
                        </span>

                        <div className="il-metrics">
                          {cameraExperiences[index]?.outcomes
                            .filter(
                              (outcome) =>
                                outcome.status === 'resolved' &&
                                outcome.value !== undefined,
                            )
                            .map((outcome) => (
                              <div key={outcome.domain}>
                                <strong>
                                  {format(outcome.value, 2)}
                                  {outcome.unit ? ` ${outcome.unit}` : ''}
                                </strong>
                                <span>
                                  {cameraOutcomeLabel(
                                    outcome.domain,
                                  )}
                                </span>
                                <small>
                                  {outcome.referenceCount} refs ·{' '}
                                  {outcome.confidence !== undefined
                                    ? `${format(
                                        outcome.confidence * 100,
                                        0,
                                      )}% confidence`
                                    : 'confidence unrated'}
                                </small>
                                <small>
                                  {outcome.sourceRecordCount ?? 0} source page
                                  {(outcome.sourceRecordCount ?? 0) === 1
                                    ? ''
                                    : 's'} ·{' '}
                                  {outcome.publisherCount ?? 0} publisher
                                  {(outcome.publisherCount ?? 0) === 1
                                    ? ''
                                    : 's'}
                                </small>
                                {outcome.averageSimilarity !== undefined ||
                                outcome.averageCoverage !== undefined ? (
                                  <small>
                                    {outcome.averageSimilarity !== undefined
                                      ? `${format(
                                          outcome.averageSimilarity * 100,
                                          0,
                                        )}% similarity`
                                      : ''}
                                    {outcome.averageSimilarity !== undefined &&
                                    outcome.averageCoverage !== undefined
                                      ? ' · '
                                      : ''}
                                    {outcome.averageCoverage !== undefined
                                      ? `${format(
                                          outcome.averageCoverage * 100,
                                          0,
                                        )}% spec coverage`
                                      : ''}
                                  </small>
                                ) : null}
                                {outcome.protocolKey ? (
                                  <small>
                                    {outcome.protocolKey.replace('::', ' · ')}
                                  </small>
                                ) : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <p className="il-help">
                        No matching measured camera outcome evidence is available
                        for this optical configuration yet.
                      </p>
                    )}

                    <p className="il-help">
                      Light-capture values are geometric comparison proxies
                      derived from optical sensor format and aperture. They do
                      not claim final image quality, exposure or noise because
                      shutter time, lens transmission, sensor efficiency,
                      stabilization and processing are not inferred.
                    </p>
                  </div>
                ))}
              </div>

              <div className="il-result-group">
                <span className="il-result-label">
                  Internal volume
                </span>

                <div className="il-volume-number">
                  <strong>
                    {format(
                      packaging?.knownComponentVolumeCm3,
                      2,
                    )}
                  </strong>

                  <span>/</span>

                  <strong>
                    {format(
                      packaging?.availableInternalVolumeCm3,
                      2,
                    )}
                  </strong>

                  <small>cm³ known / available</small>
                </div>

                <div className="il-metrics">
                  <div>
                    <strong>
                      {format(
                        packaging?.remainingVolumeCm3,
                        2,
                      )}
                    </strong>
                    <span>cm³ remaining</span>
                  </div>

                  <div>
                    <strong>
                      {format(
                        packaging?.usedInternalVolumePercent,
                        1,
                      )}
                      {packaging?.usedInternalVolumePercent !==
                      undefined
                        ? '%'
                        : ''}
                    </strong>
                    <span>Known allocation</span>
                  </div>

                  <div>
                    <strong>
                      {packaging?.packagingPressure
                        ? packaging.packagingPressure
                            .replaceAll('_', ' ')
                        : 'Unknown'}
                    </strong>
                    <span>Aggregate pressure</span>
                  </div>

                  <div>
                    <strong>
                      {packaging?.minimumAggregateThicknessMm !==
                      undefined
                        ? `${format(
                            packaging.minimumAggregateThicknessMm,
                            2,
                          )} mm`
                        : 'Unknown'}
                    </strong>
                    <span>Minimum aggregate thickness</span>
                  </div>

                  <div>
                    <strong>
                      {packaging?.aggregateThicknessHeadroomMm !==
                      undefined
                        ? `${format(
                            packaging.aggregateThicknessHeadroomMm,
                            2,
                          )} mm`
                        : 'Unknown'}
                    </strong>
                    <span>Gross thickness headroom</span>
                  </div>

                  <div>
                    <strong>
                      {packaging?.largestKnownComponent
                        ? packaging.largestKnownComponent.component
                        : 'Unknown'}
                    </strong>
                    <span>Largest known component</span>
                  </div>
                </div>

                {packaging?.thinnerByHalfMm ? (
                  <div className="il-packaging-sensitivity">
                    <span className="il-result-label">
                      Thin-phone what-if
                    </span>

                    <div className="il-sensitivity-card">
                      <strong>
                        Thickness → {format(
                          packaging.thinnerByHalfMm
                            .targetThicknessMm,
                          2,
                        )} mm
                      </strong>

                      <span>
                        Lost internal volume{' '}
                        {format(
                          packaging.thinnerByHalfMm
                            .lostAvailableVolumeCm3,
                          2,
                        )} cm³
                      </span>

                      <span>
                        Known allocation{' '}
                        {format(
                          packaging.thinnerByHalfMm
                            .usedInternalVolumePercent,
                          1,
                        )}%
                      </span>

                      <span>
                        Remaining{' '}
                        {format(
                          packaging.thinnerByHalfMm
                            .remainingVolumeCm3,
                          2,
                        )} cm³
                      </span>

                      <small>
                        {packaging.thinnerByHalfMm
                          .fitsAvailableVolume
                          ? 'Aggregate volume budget still passes'
                          : 'Aggregate volume budget fails'}
                      </small>
                    </div>

                    <p className="il-help">
                      This keeps all known component volumes unchanged and
                      reduces device thickness by 0.5 mm. It is an aggregate
                      volume sensitivity test, not a claim that the component
                      shapes can be repackaged successfully.
                    </p>
                  </div>
                ) : null}

                {packaging?.componentGrowthSensitivity?.length ? (
                  <div className="il-packaging-growth">
                    <span className="il-result-label">
                      Subsystem growth tradeoffs
                    </span>

                    <div className="il-sensitivity-grid">
                      {packaging.componentGrowthSensitivity.map(
                        (scenario) => (
                          <div
                            className="il-sensitivity-card"
                            key={scenario.component}
                          >
                            <strong>
                              +{scenario.growthPercent}%{' '}
                              {scenario.component}
                            </strong>

                            <span>
                              Added volume{' '}
                              {format(
                                scenario.addedVolumeCm3,
                                2,
                              )} cm³
                            </span>

                            <span>
                              Known allocation{' '}
                              {format(
                                scenario.usedInternalVolumePercent,
                                1,
                              )}%
                            </span>

                            <span>
                              Remaining{' '}
                              {format(
                                scenario.remainingVolumeCm3,
                                2,
                              )} cm³
                            </span>

                            <small>
                              {scenario.fitsAvailableVolume
                                ? 'Aggregate volume budget passes'
                                : 'Aggregate volume budget fails'}
                            </small>
                          </div>
                        ),
                      )}
                    </div>

                    <p className="il-help">
                      Each probe grows one known subsystem by 10% while all
                      other known component volumes stay fixed.
                    </p>
                  </div>
                ) : null}

                {packaging?.componentVolumePercent ? (
                  <div className="il-packaging-breakdown">
                    <span className="il-result-label">
                      Known internal allocation
                    </span>

                    <div className="il-packaging-bars">
                      {Object.entries(
                        packaging.componentVolumePercent,
                      ).map(([component, percent]) => (
                        <div
                          className="il-packaging-bar"
                          key={component}
                        >
                          <div>
                            <strong>{component}</strong>
                            <span>
                              {format(percent, 1)}%
                            </span>
                          </div>

                          <div className="il-packaging-track">
                            <span
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, percent),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="il-help">
                      Shares are percentages of the aggregate allocatable
                      internal volume. They do not model exact component shape,
                      stacking, routing, shielding, or mechanical clearances.
                    </p>
                  </div>
                ) : null}
              </div>

              {packaging?.fitsAvailableVolume !==
                undefined && (
                <div
                  className={`il-verdict ${
                    packaging.fitsAvailableVolume
                      ? 'passes'
                      : 'fails'
                  }`}
                >
                  <strong>
                    {packaging.fitsAvailableVolume
                      ? 'Volume budget passes'
                      : 'Volume budget exceeded'}
                  </strong>

                  <p>
                    {packaging.fitsAvailableVolume
                      ? 'Known components do not exceed the calculated internal volume budget. This does not prove their physical shapes can be packaged together.'
                      : 'Known component volume exceeds the calculated internal volume available in this device envelope.'}
                  </p>
                </div>
              )}

              {simulationInput && (
                <DeterministicShareCard input={simulationInput} result={result} />
              )}

              {result.warnings.length > 0 && (
                <div className="il-warnings">
                  <span className="il-result-label">
                    Engine notes
                  </span>

                  {result.warnings.map(
                    (warning, index) => (
                      <div
                        className="il-warning"
                        key={`${warning.code}-${index}`}
                      >
                        <strong>
                          {warning.code}
                        </strong>

                        <p>{warning.message}</p>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="il-method">
                <strong>
                  Deterministic model
                </strong>

                <p>
                  This result uses only the values
                  supplied above and calculations
                  supported by PhoneFuturist Engine
                  v{SIMULATION_ENGINE_VERSION}.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}