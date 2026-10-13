import { SOC_MODELS, isSelectableSoc } from '../../lib/simulation/soc-model-catalog';
import BrandSelect from './BrandSelect';
import { SIMPLE_USAGE_SCENARIOS } from '../../lib/simulation/simple-usage-scenarios';
import { CAMERA_SENSOR_FORMATS, CAMERA_APERTURES, cameraApertureRangeValid } from '../../lib/simulation/camera-option-catalog';
import { getSocEfficiencyCurve, evaluateSocAtBoardPower } from '../../lib/simulation/modules/soc-efficiency-registry';
import { suggestLiveDeviceComparisons, suggestLiveCompetingDevices } from '../../lib/simulation/modules/live-device-comparison-suggestions';
import { publicEvidenceText } from '../../lib/simulation/public-evidence-copy';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  PERFORMANCE_CONTEXT_VERSION,
  buildPerformanceContext,
} from '../../lib/simulation/modules/performance-context';

import {
  GPU_ARCHITECTURE_MODEL_VERSION,
  calculateGpuArchitecture,
} from '../../lib/simulation/modules/gpu-architecture';

import {
  GPU_POWER_ENVELOPE_VERSION,
  calculateGpuPowerEnvelope,
} from '../../lib/simulation/modules/gpu-power-envelope';

import {
  GPU_WORKLOAD_DEMAND_VERSION,
  calculateGpuWorkloadDemand,
} from '../../lib/simulation/modules/gpu-workload-demand';

import {
  GPU_WORKLOAD_RESPONSE_VERSION,
  interpretGpuWorkloadResponse,
} from '../../lib/simulation/modules/gpu-workload-response';

import {
  GAMING_DISPLAY_ENVELOPE_VERSION,
  calculateGamingDisplayEnvelope,
} from '../../lib/simulation/modules/gaming-display-envelope';

import {
  SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
  calculateSustainedBenchmarkEnvelope,
} from '../../lib/simulation/modules/sustained-benchmark-envelope';

import {
  GAMING_SESSION_ENVELOPE_VERSION,
  calculateGamingSessionEnvelope,
} from '../../lib/simulation/modules/gaming-session-envelope';

import {
  BATTERY_AGING_ENVELOPE_VERSION,
  calculateBatteryAgingEnvelope,
} from '../../lib/simulation/modules/battery-aging-envelope';

import {
  BATTERY_AGING_RUNTIME_VERSION,
  calculateBatteryAgingRuntime,
} from '../../lib/simulation/modules/battery-aging-runtime';

import {
  BATTERY_CYCLE_EXPOSURE_VERSION,
  calculateBatteryCycleExposure,
} from '../../lib/simulation/modules/battery-cycle-exposure';

import {
  BATTERY_HEALTH_FORECAST_VERSION,
  forecastBatteryHealthThreshold,
} from '../../lib/simulation/modules/battery-health-forecast';

import {
  CAMERA_VIDEO_WORKLOAD_VERSION,
  calculateCameraVideoWorkload,
} from '../../lib/simulation/modules/camera-video-workload';

import {
  CAMERA_VIDEO_THERMAL_VERSION,
  calculateCameraVideoThermal,
} from '../../lib/simulation/modules/camera-video-thermal';

import {
  CONNECTIVITY_WORKLOAD_VERSION,
  calculateConnectivityWorkload,
  type ConnectivityMode,
} from '../../lib/simulation/modules/connectivity-workload';

import {
  DISPLAY_REFRESH_PROFILE_VERSION,
  calculateDisplayRefreshProfile,
} from '../../lib/simulation/modules/display-refresh-profile';

import {
  CAMERA_SENSOR_NOISE_VERSION,
  calculateCameraSensorNoise,
} from '../../lib/simulation/modules/camera-sensor-noise';

import {
  GEEKERWAN_CHARGING_CONTEXT_VERSION,
  estimateLiveGeekerwanChargingContext,
} from '../../lib/simulation/modules/geekerwan-charging-context';

import {
  GEEKERWAN_SOCPK_EVIDENCE_VERSION,
  findGeekerwanBatteryResult,
  summarizeGeekerwanSocCurve,
} from '../../lib/simulation/modules/geekerwan-socpk-evidence';

import {
  PHONEARENA_BATTERY_EVIDENCE_VERSION,
  findPhoneArenaChargingResult,
} from '../../lib/simulation/modules/phonearena-battery-evidence';

import {
  CROSS_LAB_BATTERY_CONTEXT_VERSION,
  buildCrossLabBatteryContext,
} from '../../lib/simulation/modules/cross-lab-battery-context';

import {
  CHARGING_INPUT_POWER_ESTIMATOR_VERSION,
  estimateLiveObservedChargingInputPower,
} from '../../lib/simulation/modules/charging-input-power-estimator';

import {
  CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION,
  estimateChargerLabPeakInputContext,
} from '../../lib/simulation/modules/chargerlab-peak-input-context';

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
  variableAperture: boolean;
  variableApertureWide: string;
  variableApertureNarrow: string;
  exposureTimeSeconds?: string;
  sensorReadoutTimeSeconds?: string;
  videoFrameRateFps?: string;
  videoWidthPx?: string;
  videoHeightPx?: string;
  videoBitDepth?: string;
  videoChromaSubsampling?:
    | ''
    | '4:2:0'
    | '4:2:2'
    | '4:4:4';
  videoEncodedBitrateMbps?: string;
  videoRecordingDurationMinutes?: string;
  videoPipelinePowerW?: string;
  videoThermalResistanceCPerW?: string;
  videoThermalMassJPerC?: string;
  videoThermalLimitTemperatureC?: string;
  fullWellElectrons?: string;
  readNoiseElectrons?: string;
  darkCurrentElectronsPerSecond?: string;
  signalElectrons?: string;
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
  displayRefreshState1Hz: string;
  displayRefreshState1DutyPercent: string;
  displayRefreshState2Hz: string;
  displayRefreshState2DutyPercent: string;

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
  cellArchitecture: 'unknown' | 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell';
  chargingStandard: string;
  wirelessChargingStandard: string;
  batteryAgeYears: string;
  batteryEquivalentFullCycles: string;
  batteryAnnualCalendarFadePercent: string;
  batteryCycleFadePercentPer100Cycles: string;
  batteryHealthThresholdPercent: string;

  connectivityMode: ConnectivityMode;
  connectivityDownloadMbps: string;
  connectivityUploadMbps: string;
  connectivityLinkCapacityMbps: string;
  connectivitySessionMinutes: string;
  connectivityRadioPowerW: string;
  connectivityActiveDutyPercent: string;
  connectivitySignalMetricLabel: string;
  connectivitySignalMetricValue: string;

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
  gpuShaderCores: string;
  gpuExecutionUnits: string;
  gpuPeakClockGhz: string;
  gpuPeakPowerW: string;
  gpuNonGpuPackagePowerW: string;
  gpuMemoryBandwidthGbps: string;
  gpuTextureUnits: string;
  gpuRenderOutputUnits: string;
  gpuRayTracingUnits: string;
  gpuRelativeArchitectureEfficiency: string;
  gpuRenderWidthPx: string;
  gpuRenderHeightPx: string;
  gpuTargetFps: string;
  gpuRenderScalePercent: string;
  gpuRelativeWorkloadComplexity: string;
  gpuRaysPerPixel: string;
  gpuEstimatedMemoryTrafficBytesPerPixel: string;
  gamingSessionMinutes: string;
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
  displayRefreshState1Hz: '',
  displayRefreshState1DutyPercent: '',
  displayRefreshState2Hz: '',
  displayRefreshState2DutyPercent: '',

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
  batteryAgeYears: '',
  batteryEquivalentFullCycles: '',
  batteryAnnualCalendarFadePercent: '',
  batteryCycleFadePercentPer100Cycles: '',
  batteryHealthThresholdPercent: '',

  connectivityMode: 'wifi',
  connectivityDownloadMbps: '',
  connectivityUploadMbps: '',
  connectivityLinkCapacityMbps: '',
  connectivitySessionMinutes: '',
  connectivityRadioPowerW: '',
  connectivityActiveDutyPercent: '',
  connectivitySignalMetricLabel: '',
  connectivitySignalMetricValue: '',

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
  gpuShaderCores: '',
  gpuExecutionUnits: '',
  gpuPeakClockGhz: '',
  gpuPeakPowerW: '',
  gpuNonGpuPackagePowerW: '',
  gpuMemoryBandwidthGbps: '',
  gpuTextureUnits: '',
  gpuRenderOutputUnits: '',
  gpuRayTracingUnits: '',
  gpuRelativeArchitectureEfficiency: '',
  gpuRenderWidthPx: '',
  gpuRenderHeightPx: '',
  gpuTargetFps: '',
  gpuRenderScalePercent: '',
  gpuRelativeWorkloadComplexity: '',
  gpuRaysPerPixel: '',
  gpuEstimatedMemoryTrafficBytesPerPixel: '',
  gamingSessionMinutes: '',
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
  displayRefreshState1Hz: '',
  displayRefreshState1DutyPercent: '',
  displayRefreshState2Hz: '',
  displayRefreshState2DutyPercent: '',

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
  batteryAgeYears: '',
  batteryEquivalentFullCycles: '',
  batteryAnnualCalendarFadePercent: '',
  batteryCycleFadePercentPer100Cycles: '',
  batteryHealthThresholdPercent: '',

  connectivityMode: 'wifi',
  connectivityDownloadMbps: '',
  connectivityUploadMbps: '',
  connectivityLinkCapacityMbps: '',
  connectivitySessionMinutes: '',
  connectivityRadioPowerW: '',
  connectivityActiveDutyPercent: '',
  connectivitySignalMetricLabel: '',
  connectivitySignalMetricValue: '',

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
  gpuShaderCores: '',
  gpuExecutionUnits: '',
  gpuPeakClockGhz: '',
  gpuPeakPowerW: '',
  gpuNonGpuPackagePowerW: '',
  gpuMemoryBandwidthGbps: '',
  gpuTextureUnits: '',
  gpuRenderOutputUnits: '',
  gpuRayTracingUnits: '',
  gpuRelativeArchitectureEfficiency: '',
  gpuRenderWidthPx: '',
  gpuRenderHeightPx: '',
  gpuTargetFps: '',
  gpuRenderScalePercent: '',
  gpuRelativeWorkloadComplexity: '',
  gpuRaysPerPixel: '',
  gpuEstimatedMemoryTrafficBytesPerPixel: '',
  gamingSessionMinutes: '',
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
    variableAperture: false,
    variableApertureWide: '',
    variableApertureNarrow: '',
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
    variableAperture: false,
    variableApertureWide: '',
    variableApertureNarrow: '',
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
    variableAperture: false,
    variableApertureWide: '',
    variableApertureNarrow: '',
    exposureTimeSeconds: '',
    sensorReadoutTimeSeconds: '',
    videoFrameRateFps: '',
    videoWidthPx: '',
    videoHeightPx: '',
    videoBitDepth: '',
    videoChromaSubsampling: '',
    videoEncodedBitrateMbps: '',
    videoRecordingDurationMinutes: '',
    videoPipelinePowerW: '',
    videoThermalResistanceCPerW: '',
    videoThermalMassJPerC: '',
    videoThermalLimitTemperatureC: '',
    fullWellElectrons: '',
    readNoiseElectrons: '',
    darkCurrentElectronsPerSecond: '',
    signalElectrons: '',
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
  mode,
  usage,
  activeUseHours,
  chargeMinutes,
}: {
  input: SimulationInput;
  result: DeterministicResult;
  mode: 'simple' | 'advanced';
  usage: 'Light' | 'Typical' | 'Heavy';
  activeUseHours?: number;
  chargeMinutes?: number;
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

      const simple = mode === 'simple';
      const accent = simple ? '#83e4ec' : '#b6acff';
      const ink = '#f6f8fc';
      const dim = '#a9b7c8';
      ctx.fillStyle = '#080d15';
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = simple ? '#10232d' : '#17192f';
      ctx.fillRect(0, 0, 1080, simple ? 580 : 250);
      ctx.fillStyle = accent;
      ctx.fillRect(72, 65, 55, 7);
      // Use the exact SVG asset rendered by the site's header and mobile navigation.
      // Reject export if it cannot be loaded rather than producing a card with incorrect branding.
      const brandLogo = new Image();
      await new Promise<void>((resolve, reject) => {
        brandLogo.onload = () => resolve();
        brandLogo.onerror = () => reject(new Error('PhoneFuturist logo could not be loaded for export.'));
        brandLogo.src = '/assets/phonefuturist-mark.svg';
      });
      ctx.drawImage(brandLogo, 72, 74, 91, 41);
      ctx.font = '700 31px Arial';
      ctx.fillStyle = ink;
      ctx.fillText('PhoneFuturist', 177, 108);
      ctx.font = '700 19px Arial';
      ctx.fillStyle = accent;
      ctx.fillText(simple ? 'INTERACTIVE LEAKS  /  SIMPLE' : 'INTERACTIVE LEAKS  /  ADVANCED', 72, 175);

      // Wrap safely for PNG, truncate with an ellipsis if the reserved area is exceeded.
      function wrapTitle(title: string, fontSize: number, top: number, maxLines: number) {
        const drawingContext = ctx!;
        drawingContext.font = '700 ' + fontSize + 'px Arial';
        const maxWidth = 920;
        const words = title.trim().split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const candidate = current ? current + ' ' + word : word;
          if (drawingContext.measureText(candidate).width <= maxWidth) {
            current = candidate;
          } else {
            if (current) lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);
        if (!lines.length) lines.push('Untitled concept');

        // A single oversized word must never overflow its card.
        const fit = (value: string, ellipsis: boolean) => {
          const suffix = ellipsis ? '…' : '';
          let output = value;
          while (output.length > 0 && drawingContext.measureText(output + suffix).width > maxWidth) {
            output = output.slice(0, -1);
          }
          return output + suffix;
        };
        lines.slice(0, maxLines).forEach((line, index) => {
          const isLast = index === maxLines - 1;
          const remaining = lines.length > maxLines;
          drawingContext.fillText(
            fit(line, isLast && remaining),
            72,
            top + index * fontSize * 1.16,
            maxWidth,
          );
        });
      }

      ctx.fillStyle = ink;
      wrapTitle(deviceName, simple ? 69 : 54, simple ? 290 : 238, simple ? 3 : 1);
      const metrics: Array<[string, string]> = simple ? [
        ['USAGE', usage],
        ['ACTIVE USE', activeUseHours !== undefined ? activeUseHours.toFixed(1) + ' h' : 'Unresolved'],
        ['FULL CHARGE', chargeMinutes !== undefined ? Math.round(chargeMinutes) + ' min' : 'Unresolved'],
        ['BATTERY', battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : 'Unknown'],
      ] : [
        ['DISPLAY', input.displays.primary.diagonalInches !== undefined ? input.displays.primary.diagonalInches.toFixed(2) + ' in' : 'Unknown'],
        ['PIXEL DENSITY', display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : 'Unknown'],
        ['BATTERY ENERGY', battery?.totalEnergyWh !== undefined ? battery.totalEnergyWh.toFixed(2) + ' Wh' : 'Unknown'],
        ['BATTERY CAPACITY', battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : 'Unknown'],
        ['SCREEN / BODY', display?.screenToBodyRatio !== undefined ? display.screenToBodyRatio.toFixed(1) + '%' : 'Unknown'],
        ['VOLUME CHECK', packaging?.fitsAvailableVolume === undefined ? 'Unresolved' : packaging.fitsAvailableVolume ? 'Pass' : 'Exceeded'],
      ];
      if (simple) {
        ctx.fillStyle = dim;
        ctx.font = '700 19px Arial';
        ctx.fillText('YOUR CONCEPT, AT A GLANCE', 72, 530);
      } else {
        ctx.fillStyle = dim;
        ctx.font = '700 18px Arial';
        ctx.fillText('SIMULATION SUMMARY', 72, 326);
      }
      const baseY = simple ? 612 : 370;
      const cellHeight = simple ? 205 : 194;
      for (let i = 0; i < metrics.length; i++) {
        const x = 72 + (i % 2) * 474;
        const y = baseY + Math.floor(i / 2) * (cellHeight + 16);
        ctx.fillStyle = '#15202e';
        ctx.beginPath();
        ctx.roundRect(x, y, 456, cellHeight, 20);
        ctx.fill();
        ctx.fillStyle = dim;
        ctx.font = '700 18px Arial';
        ctx.fillText(metrics[i][0], x + 26, y + 44);
        ctx.fillStyle = ink;
        const value = metrics[i][1];
        ctx.font = '700 ' + (value.length > 18 ? 30 : value.length > 11 ? 40 : 53) + 'px Arial';
        ctx.fillText(value, x + 26, y + 116, 407);
      }
      ctx.fillStyle = dim;
      ctx.font = '20px Arial';
      ctx.fillText(simple ? 'Estimated active use, not days per charge.' : 'Modelled results · Not laboratory measurements', 72, 1208);
      ctx.fillStyle = accent;
      ctx.fillRect(72, 1250, 936, 2);
      ctx.fillStyle = ink;
      ctx.font = '700 21px Arial';
      ctx.fillText('ENGINE ' + SIMULATION_ENGINE_VERSION, 72, 1294);
      ctx.fillStyle = dim;
      ctx.font = '20px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('phonefuturist', 1006, 1294);
      ctx.textAlign = 'left';

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG could not be generated.')), 'image/png'),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slug = deviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'untitled-concept';
      link.download = 'phonefuturist-' + slug + '-simulation.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
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
      ...(mode === 'simple'
        ? [usage + ' usage scenario', activeUseHours !== undefined ? 'Active-use estimate: ' + activeUseHours.toFixed(1) + ' h' : null, chargeMinutes !== undefined ? 'Full-charge estimate: ' + Math.round(chargeMinutes) + ' min' : null, 'Illustrative scenario; not time between charges']
        : [display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : null,
           packaging?.fitsAvailableVolume === undefined ? null : packaging.fitsAvailableVolume ? 'Volume budget passes' : 'Volume budget exceeded']),
      'Interactive Leaks · PhoneFuturist · Engine v' + SIMULATION_ENGINE_VERSION,
    ].filter(Boolean).join(' · ');

    try {
      if (navigator.share) {
        await navigator.share({ title: deviceName + ' · Interactive Leaks', text });
        setShareMessage('Shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareMessage('Result summary copied.');
      } else {
        // Clipboard APIs can be unavailable in embedded or non-secure contexts.
        // The read-only prompt keeps the text accessible rather than losing the result.
        window.prompt('Copy your simulation summary:', text);
        setShareMessage('Summary ready to copy.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareMessage('Sharing is unavailable. Download the card instead.');
    }
  }

  return (
    <section className={`il-share-card il-share-card--${mode}`} aria-label="Share simulation result">
      <div className="il-share-card-brand">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/assets/phonefuturist-mark.svg" alt="" width="48" height="24" style={{ objectFit: 'contain' }} />
          PhoneFuturist
        </span>
        <small>{mode === 'simple' ? 'Simple overview' : 'Advanced lab report'}</small>
      </div>
      <strong>{deviceName}</strong>
      <div className="il-share-card-metrics">
        <span>{battery?.totalCapacityMah !== undefined ? Math.round(battery.totalCapacityMah) + ' mAh' : 'Battery unknown'}</span>
        {mode === 'simple' ? <>
          <span>{usage} usage scenario</span>
          <span>{activeUseHours !== undefined ? activeUseHours.toFixed(1) + ' h estimated active use' : 'Active use unresolved'}</span>
          <span>{chargeMinutes !== undefined ? Math.round(chargeMinutes) + ' min estimated full charge' : 'Charging unresolved'}</span>
        </> : <>
          <span>{display?.ppi !== undefined ? Math.round(display.ppi) + ' PPI' : 'PPI unknown'}</span>
          <span>{packaging?.fitsAvailableVolume === undefined ? 'Packaging unresolved' : packaging.fitsAvailableVolume ? 'Volume budget passes' : 'Volume budget exceeded'}</span>
        </>}
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
  const [simulationPending, setSimulationPending] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [simulationResult, setSimulationResult] = useState<ReturnType<typeof simulateDevice> | null>(null);
  const activeWorker = useRef<Worker | null>(null);
  const jobNumber = useRef(0);
  const [form, setForm] =
    useState<FormState>(initialForm);

  const [cameras, setCameras] = useState<
    CameraDraft[]
  >([]);

  const [hasSimulated, setHasSimulated] =
    useState(false);
  const [resultRevision, setResultRevision] = useState(0);

  const [simulationInput, setSimulationInput] =
    useState<SimulationInput | null>(null);

  const [workspaceMode, setWorkspaceMode] =
    useState<'simple' | 'advanced'>('simple');
  const [usagePreset, setUsagePreset] = useState<'Light' | 'Typical' | 'Heavy'>('Typical');
  const [benchmarkLoad, setBenchmarkLoad] = useState<'low' | 'medium' | 'high'>('medium');

  const [predictionSaveState, setPredictionSaveState] =
    useState<
      | { status: 'idle' }
      | { status: 'saving'; message: string }
      | { status: 'saved'; message: string }
      | { status: 'error'; message: string }
    >({ status: 'idle' });

  const result = simulationResult;

  useEffect(() => () => {
    jobNumber.current++;
    activeWorker.current?.terminate();
  }, []);

  function calculateInWorker(input: SimulationInput) {
    const job = ++jobNumber.current;
    activeWorker.current?.terminate();
    activeWorker.current = null;
    setSimulationPending(true);
    setSimulationError('');
    setSimulationResult(null);
    setSimulationInput(null);

    const finish = (nextResult: ReturnType<typeof simulateDevice>) => {
      if (job !== jobNumber.current) return;
      setSimulationInput(input);
      setSimulationResult(nextResult);
      setHasSimulated(true);
      setSimulationPending(false);
    };

    try {
      if (typeof Worker === 'undefined') throw new Error('Web Workers unavailable');
      const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
      activeWorker.current = worker;
      worker.onmessage = (event: MessageEvent<{ id: number; result?: ReturnType<typeof simulateDevice>; error?: string }>) => {
        if (job !== jobNumber.current || event.data.id !== job) return;
        worker.terminate();
        activeWorker.current = null;
        if (event.data.result) finish(event.data.result);
        else {
          setSimulationPending(false);
          setSimulationError(event.data.error || 'Simulation could not be completed.');
        }
      };
      worker.onerror = () => {
        if (job !== jobNumber.current) return;
        worker.terminate();
        activeWorker.current = null;
        setSimulationPending(false);
        setSimulationError('Simulation worker failed. Try running it again.');
      };
      worker.postMessage({ id: job, input });
    } catch {
      // Compatibility fallback is synchronous but preserves the deterministic engine.
      try { finish(simulateDevice(input)); }
      catch (error) {
        setSimulationPending(false);
        setSimulationError(error instanceof Error ? error.message : 'Simulation failed.');
      }
    }
  }

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

  function runSimpleMode(input: SimpleModeInput, usage: 'Light' | 'Typical' | 'Heavy') {
    setUsagePreset(usage);
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
      // Scenario hours are configurable assumptions, not demographic averages.
      // Keep them distinct from screen-on measurements and preserve Advanced inputs.
      webHours: SIMPLE_USAGE_SCENARIOS[usage].webHours,
      videoHours: SIMPLE_USAGE_SCENARIOS[usage].videoHours,
      gamingHours: SIMPLE_USAGE_SCENARIOS[usage].gamingHours,
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
              variableAperture: mainCamera.variableApertureWide !== undefined && mainCamera.variableApertureNarrow !== undefined,
              variableApertureWide: mainCamera.variableApertureWide !== undefined ? String(mainCamera.variableApertureWide) : '',
              variableApertureNarrow: mainCamera.variableApertureNarrow !== undefined ? String(mainCamera.variableApertureNarrow) : '',
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

    calculateInWorker(expansion.simulationInput);
  }

  function simulate() {
    setResultRevision(current => current + 1);
    setPredictionSaveState({ status: 'idle' });
    const nextInput = buildInput();
    calculateInWorker(nextInput);
  }

  function loadExample() {
    jobNumber.current++;
    activeWorker.current?.terminate();
    activeWorker.current = null;
    setSimulationPending(false);
    setSimulationError('');
    setSimulationResult(null);
    setPredictionSaveState({ status: 'idle' });
    setForm(flagshipExample);
    setCameras(flagshipCameras);
    setSimulationInput(null);
    setHasSimulated(false);
  }

  function clearSimulation() {
    jobNumber.current++;
    activeWorker.current?.terminate();
    activeWorker.current = null;
    setSimulationPending(false);
    setSimulationError('');
    setSimulationResult(null);
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

  const displayRefreshProfileInputsPresent = [
    form.displayRefreshState1Hz,
    form.displayRefreshState1DutyPercent,
    form.displayRefreshState2Hz,
    form.displayRefreshState2DutyPercent,
  ].some((value) => value.trim() !== '');

  const displayRefreshProfile =
    displayRefreshProfileInputsPresent
      ? calculateDisplayRefreshProfile({
          resolutionWidthPx: numeric(
            form.resolutionWidthPx,
          ),
          resolutionHeightPx: numeric(
            form.resolutionHeightPx,
          ),
          states: [
            {
              label: 'State 1',
              refreshRateHz:
                numeric(
                  form.displayRefreshState1Hz,
                ) ?? Number.NaN,
              dutyFraction:
                (
                  numeric(
                    form.displayRefreshState1DutyPercent,
                  ) ?? Number.NaN
                ) / 100,
            },
            {
              label: 'State 2',
              refreshRateHz:
                numeric(
                  form.displayRefreshState2Hz,
                ) ?? Number.NaN,
              dutyFraction:
                (
                  numeric(
                    form.displayRefreshState2DutyPercent,
                  ) ?? Number.NaN
                ) / 100,
            },
          ],
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

  const batteryAgingInputsPresent = [
    form.batteryAgeYears,
    form.batteryEquivalentFullCycles,
    form.batteryAnnualCalendarFadePercent,
    form.batteryCycleFadePercentPer100Cycles,
  ].some((value) => value.trim() !== '');

  const batteryCycleExposure =
    numeric(form.batteryAgeYears) !==
      undefined &&
    batteryExperience?.mixedUse &&
    result
      ? calculateBatteryCycleExposure({
          ageYears: numeric(
            form.batteryAgeYears,
          ),
          ...(batteryExperience.mixedUse
            .energyBasis === 'wh'
            ? {
                dailyDrainWh:
                  batteryExperience.mixedUse
                    .expectedDrainWhPerDay,
                batteryEnergyWh:
                  result.battery?.totalEnergyWh,
              }
            : {
                dailyDrainMah:
                  batteryExperience.mixedUse
                    .expectedDrainMahPerDay,
                batteryCapacityMah:
                  result.battery
                    ?.totalCapacityMah,
              }),
        })
      : undefined;

  const explicitEquivalentFullCycles =
    numeric(
      form.batteryEquivalentFullCycles,
    );

  const agingEquivalentFullCycles =
    explicitEquivalentFullCycles ??
    (batteryCycleExposure?.status ===
      'resolved'
      ? batteryCycleExposure
          .equivalentFullCycles
      : undefined);

  const batteryAging =
    batteryAgingInputsPresent && result
      ? calculateBatteryAgingEnvelope({
          initialCapacityMah:
            result.battery?.totalCapacityMah,
          initialEnergyWh:
            result.battery?.totalEnergyWh,
          ageYears: numeric(
            form.batteryAgeYears,
          ),
          equivalentFullCycles:
            agingEquivalentFullCycles,
          annualCalendarFadePercent: numeric(
            form.batteryAnnualCalendarFadePercent,
          ),
          cycleFadePercentPer100Cycles:
            numeric(
              form.batteryCycleFadePercentPer100Cycles,
            ),
        })
      : undefined;

  const batteryHealthForecast =
    numeric(
      form.batteryHealthThresholdPercent,
    ) !== undefined
      ? forecastBatteryHealthThreshold({
          targetRetentionPercent:
            numeric(
              form.batteryHealthThresholdPercent,
            )!,
          currentAgeYears: numeric(
            form.batteryAgeYears,
          ),
          annualCalendarFadePercent:
            numeric(
              form.batteryAnnualCalendarFadePercent,
            ),
          cycleFadePercentPer100Cycles:
            numeric(
              form.batteryCycleFadePercentPer100Cycles,
            ),
          equivalentFullCyclesPerYear:
            batteryCycleExposure?.status ===
            'resolved'
              ? batteryCycleExposure
                  .equivalentFullCyclesPerYear
              : undefined,
        })
      : undefined;

  const agedRuntimeRows =
    batteryAging?.combinedRetentionFraction !==
      undefined
      ? (batteryExperience?.runtimes ?? [])
          .filter(
            (runtime) =>
              runtime.status === 'resolved' &&
              runtime.expectedHours !==
                undefined,
          )
          .map((runtime) => ({
            workload: runtime.workload,
            result:
              calculateBatteryAgingRuntime({
                baselineRuntimeHours:
                  runtime.expectedHours,
                retainedEnergyFraction:
                  batteryAging.combinedRetentionFraction,
              }),
          }))
          .filter(
            (row) =>
              row.result.status ===
              'resolved',
          )
      : [];

  const connectivityInputsPresent = [
    form.connectivityDownloadMbps,
    form.connectivityUploadMbps,
    form.connectivityLinkCapacityMbps,
    form.connectivitySessionMinutes,
    form.connectivityRadioPowerW,
    form.connectivityActiveDutyPercent,
    form.connectivitySignalMetricLabel,
    form.connectivitySignalMetricValue,
  ].some((value) => value.trim() !== '');

  const connectivityWorkload =
    connectivityInputsPresent
      ? calculateConnectivityWorkload({
          mode: form.connectivityMode,
          downloadMbps: numeric(
            form.connectivityDownloadMbps,
          ),
          uploadMbps: numeric(
            form.connectivityUploadMbps,
          ),
          linkCapacityMbps: numeric(
            form.connectivityLinkCapacityMbps,
          ),
          sessionDurationMinutes: numeric(
            form.connectivitySessionMinutes,
          ),
          radioPowerW: numeric(
            form.connectivityRadioPowerW,
          ),
          ...(numeric(
            form.connectivityActiveDutyPercent,
          ) !== undefined
            ? {
                activeDutyFraction:
                  numeric(
                    form.connectivityActiveDutyPercent,
                  )! / 100,
              }
            : {}),
          signalMetricLabel:
            form.connectivitySignalMetricLabel.trim() ||
            undefined,
          signalMetricValue: numeric(
            form.connectivitySignalMetricValue,
          ),
        })
      : undefined;

  const connectivityBatteryPercent =
    connectivityWorkload?.radioEnergyWh !==
      undefined &&
    result?.battery?.totalEnergyWh !==
      undefined &&
    result.battery.totalEnergyWh > 0
      ? connectivityWorkload.radioEnergyWh /
        result.battery.totalEnergyWh *
        100
      : undefined;

  const chargingResult = batteryExperience?.charging;

  const observedChargingInput =
    chargingWatts !== undefined
      ? estimateLiveObservedChargingInputPower({
          advertisedWatts:
            chargingWatts,
          manufacturer:
            form.manufacturer.trim() ||
            undefined,
          chargingStandard:
            form.chargingStandard.trim() ||
            undefined,
        })
      : undefined;

  const wirelessChargingResult =
    batteryExperience?.wirelessCharging;

  const geekerwanChargingContext =
    result?.battery?.totalEnergyWh !==
      undefined &&
    numeric(form.wiredChargeW) !==
      undefined
      ? estimateLiveGeekerwanChargingContext({
          batteryEnergyWh:
            result.battery.totalEnergyWh,
          chargerWatts:
            numeric(form.wiredChargeW),
          manufacturer:
            form.manufacturer.trim() ||
            undefined,
        })
      : undefined;

  const chargerLabPeakInputContext =
    form.manufacturer.trim() &&
    numeric(form.wiredChargeW) !== undefined
      ? estimateChargerLabPeakInputContext(
          form.manufacturer.trim(),
          numeric(form.wiredChargeW)!,
        )
      : undefined;

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

  const suggestedComparisons = simulationInput && result && form.name.trim()
    ? suggestLiveDeviceComparisons(form.name.trim())
    : [];

  const competingDevices = simulationInput && result && workspaceMode === 'simple'
    ? suggestLiveCompetingDevices({
        manufacturer: form.manufacturer.trim() || undefined,
        batteryMah: result.battery?.totalCapacityMah,
        displayInches: simulationInput.displays.primary.diagonalInches,
        limit: 3,
      })
    : [];

  const simpleCpuScores = workspaceMode === 'simple' && simulationInput && result
    ? (['geekbench6_single', 'geekbench6_multi'] as const).map(domain => ({
        domain,
        estimate: estimateLivePeakPerformance({
          domain,
          manufacturer: form.manufacturer.trim() || undefined,
          socVendor: form.socVendor.trim() || undefined,
          socName: form.socName.trim() || undefined,
          batteryMah: result.battery?.totalCapacityMah,
          displayDiagonalInches: simulationInput.displays.primary.diagonalInches,
          refreshRateHz: simulationInput.displays.primary.refreshRateHz,
          coolingClass: form.coolingClass === 'unknown' ? undefined : form.coolingClass,
        }),
      }))
    : [];

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

  const gpuArchitectureInputsPresent = [
    form.gpuShaderCores,
    form.gpuExecutionUnits,
    form.gpuPeakClockGhz,
    form.gpuPeakPowerW,
    form.gpuMemoryBandwidthGbps,
    form.gpuTextureUnits,
    form.gpuRenderOutputUnits,
    form.gpuRayTracingUnits,
    form.gpuRelativeArchitectureEfficiency,
  ].some((value) => value.trim() !== '');

  const gpuArchitecture =
    gpuArchitectureInputsPresent
      ? calculateGpuArchitecture({
          shaderCores: numeric(
            form.gpuShaderCores,
          ),
          executionUnits: numeric(
            form.gpuExecutionUnits,
          ),
          peakClockGhz: numeric(
            form.gpuPeakClockGhz,
          ),
          peakGpuPowerW: numeric(
            form.gpuPeakPowerW,
          ),
          memoryBandwidthGbps: numeric(
            form.gpuMemoryBandwidthGbps,
          ),
          textureUnits: numeric(
            form.gpuTextureUnits,
          ),
          renderOutputUnits: numeric(
            form.gpuRenderOutputUnits,
          ),
          rayTracingUnits: numeric(
            form.gpuRayTracingUnits,
          ),
          relativeArchitectureEfficiency:
            numeric(
              form.gpuRelativeArchitectureEfficiency,
            ),
          fabricationNodeNm: numeric(
            form.socFabricationNodeNm,
          ),
        })
      : undefined;

  const gpuPowerEnvelope =
    gpuArchitecture &&
    form.thermalDomain !== 'cpu_sustained'
      ? calculateGpuPowerEnvelope({
          workload:
            form.thermalDomain,
          peakGpuPowerW:
            gpuArchitecture.peakGpuPowerW,
          sustainableSocPowerW:
            thermalResult?.status === 'resolved'
              ? thermalResult.sustainedPowerW
              : undefined,
          nonGpuPackagePowerW: numeric(
            form.gpuNonGpuPackagePowerW,
          ),
        })
      : undefined;

  const gpuWorkloadInputsPresent = [
    form.gpuRenderWidthPx,
    form.gpuRenderHeightPx,
    form.gpuTargetFps,
    form.gpuRenderScalePercent,
    form.gpuRelativeWorkloadComplexity,
    form.gpuRaysPerPixel,
    form.gpuEstimatedMemoryTrafficBytesPerPixel,
  ].some((value) => value.trim() !== '');

  const gpuWorkloadDemand =
    gpuWorkloadInputsPresent
      ? calculateGpuWorkloadDemand({
          workload:
            form.thermalDomain ===
            'ray_tracing'
              ? 'ray-tracing'
              : form.thermalDomain ===
                  'gaming_sustained'
                ? 'gaming'
                : 'raster',
          renderWidthPx: numeric(
            form.gpuRenderWidthPx,
          ),
          renderHeightPx: numeric(
            form.gpuRenderHeightPx,
          ),
          targetFps: numeric(
            form.gpuTargetFps,
          ),
          ...(numeric(
            form.gpuRenderScalePercent,
          ) !== undefined
            ? {
                renderScaleFraction:
                  numeric(
                    form.gpuRenderScalePercent,
                  )! / 100,
              }
            : {}),
          relativeComplexity: numeric(
            form.gpuRelativeWorkloadComplexity,
          ),
          raysPerPixel: numeric(
            form.gpuRaysPerPixel,
          ),
          estimatedMemoryTrafficBytesPerPixel:
            numeric(
              form.gpuEstimatedMemoryTrafficBytesPerPixel,
            ),
        })
      : undefined;

  const gpuWorkloadResponse =
    gpuArchitecture ||
    gpuPowerEnvelope ||
    gpuWorkloadDemand
      ? interpretGpuWorkloadResponse({
          ...(gpuArchitecture
            ? { architecture: gpuArchitecture }
            : {}),
          ...(gpuPowerEnvelope
            ? { powerEnvelope: gpuPowerEnvelope }
            : {}),
          ...(gpuWorkloadDemand
            ? { demand: gpuWorkloadDemand }
            : {}),
        })
      : undefined;

  const gamingDisplayEnvelope =
    numeric(form.gpuTargetFps) !== undefined ||
    numeric(form.operatingRefreshRateHz) !==
      undefined ||
    numeric(form.refreshRateHz) !== undefined
      ? calculateGamingDisplayEnvelope({
          targetFps: numeric(
            form.gpuTargetFps,
          ),
          operatingRefreshRateHz:
            numeric(
              form.operatingRefreshRateHz,
            ),
          maxRefreshRateHz: numeric(
            form.refreshRateHz,
          ),
        })
      : undefined;

  const sustainedBenchmarkEnvelope =
    peakPerformanceEstimate &&
    sustainedPerformanceEstimate
      ? calculateSustainedBenchmarkEnvelope({
          peak: peakPerformanceEstimate,
          sustained:
            sustainedPerformanceEstimate,
          ...(thermalResult?.status ===
            'resolved' &&
          thermalResult.evidenceScope ===
            'same-soc-family' &&
          thermalResult.sustainedPerformancePercent !==
            undefined
            ? {
                finalSustainedPerformancePercent:
                  thermalResult.sustainedPerformancePercent,
              }
            : {}),
        })
      : undefined;

  const gamingSessionEnvelope =
    numeric(form.gamingSessionMinutes) !==
      undefined ||
    thermalResult?.throttleStartSecond !==
      undefined ||
    thermalResult?.sustainedPerformancePercent !==
      undefined
      ? calculateGamingSessionEnvelope({
          sessionDurationMinutes: numeric(
            form.gamingSessionMinutes,
          ),
          throttleStartSecond:
            thermalResult?.throttleStartSecond,
          sustainedPerformancePercent:
            thermalResult
              ?.sustainedPerformancePercent,
        })
      : undefined;

  const performanceContext =
    peakPerformanceEstimate
      ? buildPerformanceContext({
          peak: peakPerformanceEstimate,
          ...(socArchitecture
            ? { architecture: socArchitecture }
            : {}),
          ...(gpuArchitecture
            ? { gpuArchitecture }
            : {}),
        })
      : undefined;

  const geekerwanCpuContext =
    form.socName.trim()
      ? summarizeGeekerwanSocCurve(
          form.socName.trim(),
          'geekbench6_multi',
          numeric(form.targetSocPowerW),
        )
      : undefined;

  const geekerwanGpuContext =
    form.socName.trim()
      ? summarizeGeekerwanSocCurve(
          form.socName.trim(),
          '3dmark_steel_nomad_light',
          numeric(form.gpuPeakPowerW) ??
            numeric(form.targetSocPowerW),
        )
      : undefined;

  const geekerwanBatteryResult =
    form.manufacturer.trim() &&
    form.name.trim()
      ? findGeekerwanBatteryResult(
          form.manufacturer.trim(),
          form.name.trim(),
        )
      : undefined;

  const phoneArenaChargingResult =
    form.manufacturer.trim() &&
    form.name.trim()
      ? findPhoneArenaChargingResult(
          form.manufacturer.trim(),
          form.name.trim(),
        )
      : undefined;

  const crossLabBatteryContext =
    form.manufacturer.trim() &&
    form.name.trim()
      ? buildCrossLabBatteryContext(
          form.manufacturer.trim(),
          form.name.trim(),
        )
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

  const cameraVideoWorkloads =
    cameras.map((camera) => {
      const hasVideoWorkloadInput = [
        camera.videoWidthPx ?? '',
        camera.videoHeightPx ?? '',
        camera.videoFrameRateFps ?? '',
        camera.videoBitDepth ?? '',
        camera.videoEncodedBitrateMbps ?? '',
        camera.videoRecordingDurationMinutes ?? '',
        camera.videoPipelinePowerW ?? '',
      ].some((value) => value.trim() !== '') ||
        Boolean(
          camera.videoChromaSubsampling,
        );

      return hasVideoWorkloadInput
        ? calculateCameraVideoWorkload({
            widthPx: numeric(
              camera.videoWidthPx ?? '',
            ),
            heightPx: numeric(
              camera.videoHeightPx ?? '',
            ),
            frameRateFps: numeric(
              camera.videoFrameRateFps ?? '',
            ),
            bitDepth: numeric(
              camera.videoBitDepth ?? '',
            ),
            chromaSubsampling:
              camera.videoChromaSubsampling ||
              undefined,
            encodedBitrateMbps: numeric(
              camera.videoEncodedBitrateMbps ??
                '',
            ),
            recordingDurationMinutes:
              numeric(
                camera.videoRecordingDurationMinutes ??
                  '',
              ),
            cameraPipelinePowerW: numeric(
              camera.videoPipelinePowerW ??
                '',
            ),
          })
        : undefined;
    });

  const cameraVideoThermals =
    cameras.map((camera, index) => {
      const workload =
        cameraVideoWorkloads[index];

      const hasThermalInput = [
        camera.videoThermalResistanceCPerW ??
          '',
        camera.videoThermalMassJPerC ?? '',
        camera.videoThermalLimitTemperatureC ??
          '',
      ].some((value) => value.trim() !== '');

      if (
        !workload &&
        !hasThermalInput
      ) {
        return undefined;
      }

      return calculateCameraVideoThermal({
        cameraPipelinePowerW:
          workload?.cameraPipelinePowerW,
        ambientTemperatureC: numeric(
          form.ambientTemperatureC,
        ),
        thermalResistanceCPerW: numeric(
          camera.videoThermalResistanceCPerW ??
            '',
        ),
        thermalMassJPerC: numeric(
          camera.videoThermalMassJPerC ??
            '',
        ),
        thermalLimitTemperatureC: numeric(
          camera.videoThermalLimitTemperatureC ??
            '',
        ),
        recordingDurationMinutes:
          workload?.recordingDurationMinutes,
      });
    });

  const cameraSensorNoise =
    cameras.map((camera) => {
      const hasNoiseInput = [
        camera.fullWellElectrons ?? '',
        camera.readNoiseElectrons ?? '',
        camera.darkCurrentElectronsPerSecond ??
          '',
        camera.signalElectrons ?? '',
      ].some((value) => value.trim() !== '');

      return hasNoiseInput
        ? calculateCameraSensorNoise({
            fullWellElectrons: numeric(
              camera.fullWellElectrons ?? '',
            ),
            readNoiseElectrons: numeric(
              camera.readNoiseElectrons ?? '',
            ),
            darkCurrentElectronsPerSecond:
              numeric(
                camera.darkCurrentElectronsPerSecond ??
                  '',
              ),
            exposureTimeSeconds: numeric(
              camera.exposureTimeSeconds ??
                '',
            ),
            signalElectrons: numeric(
              camera.signalElectrons ?? '',
            ),
          })
        : undefined;
    });

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
    displayRefreshProfile,
    battery: batteryExperience,
    observedChargingInput,
    geekerwanChargingContext,
    chargerLabPeakInputContext,
    geekerwanCpuContext,
    geekerwanGpuContext,
    geekerwanBatteryResult,
    phoneArenaChargingResult,
    crossLabBatteryContext,
    batteryAging,
    batteryCycleExposure,
    batteryHealthForecast,
    agedRuntimeRows,
    connectivityWorkload,
    connectivityBatteryPercent,
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
    performanceContext,
    socArchitecture,
    gpuArchitecture,
    gpuPowerEnvelope,
    gpuWorkloadDemand,
    gpuWorkloadResponse,
    gamingDisplayEnvelope,
    sustainedBenchmarkEnvelope,
    gamingSessionEnvelope,
    camera: cameraExperiences.map(
      (experience) => ({
        physics: experience.physics,
        outcomes: experience.outcomes,
        warnings: experience.warnings,
      }),
    ),
    cameraVideoWorkloads,
    cameraVideoThermals,
    cameraSensorNoise,
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
          ...(displayExperience?.expectedPanelPowerW !==
            undefined
            ? {
                displayPanelPowerW:
                  displayExperience.expectedPanelPowerW,
                displayPanelPowerProvenance:
                  displayExperience.electricalPowerMode ===
                  'direct-calibration'
                    ? ('measured-calibrated' as const)
                    : ('derived' as const),
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
    <div className="il-app" data-mode={workspaceMode}>
      <div className="il-toolbar" aria-label="Simulation workspace">
        <div>
          <span className="il-status">
            Interactive Leaks
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
              aria-pressed={workspaceMode === 'simple'}
              onClick={() => { setWorkspaceMode('simple'); setHasSimulated(false); }}
            >
              Simple
            </button>
            <button
              type="button"
              className={workspaceMode === 'advanced' ? 'active' : ''}
              aria-pressed={workspaceMode === 'advanced'}
              onClick={() => { setWorkspaceMode('advanced'); setHasSimulated(false); }}
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

                <BrandSelect value={form.manufacturer} onChange={(value) => update('manufacturer', value)} />
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

              <label className="il-field">
                <span>Display aspect ratio · portrait</span>
                <select
                  value={(() => {
                    const w = Number(form.aspectWidth), h = Number(form.aspectHeight);
                    if (!w || !h) return 'custom';
                    const ratio = w / h;
                    const options = ['9:21','9:20.5','9:20','9:19.5','9:19','9:18.5','9:18','9:17','10:19','10:18','9.5:16','10:16','3:4','1:1'];
                    return options.find(value => {
                      const [width,height] = value.split(':').map(Number);
                      return Math.abs(width/height-ratio)<0.00001;
                    }) ?? 'custom';
                  })()}
                  onChange={event => {
                    if (event.currentTarget.value === 'custom') return;
                    const [width,height] = event.currentTarget.value.split(':');
                    update('aspectWidth', width);
                    update('aspectHeight', height);
                  }}
                >
                  <optgroup label="Portrait phone">
                    <option value="9:21">21:9 · tall</option>
                    <option value="9:20.5">20.5:9</option>
                    <option value="9:20">20:9</option>
                    <option value="9:19.5">19.5:9</option>
                    <option value="9:19">19:9</option>
                    <option value="9:18.5">18.5:9</option>
                    <option value="9:18">18:9</option>
                    <option value="9:17">17:9</option>
                    <option value="10:19">19:10</option>
                    <option value="10:18">18:10</option>
                  </optgroup>
                  <optgroup label="Wide portrait and foldables">
                    <option value="9.5:16">16:9.5 · Huawei Pura X View</option>
                    <option value="10:16">16:10 · Huawei Pura X</option>
                    <option value="3:4">4:3</option>
                    <option value="1:1">1:1 · square</option>
                  </optgroup>
                  <option value="custom">Custom ratio</option>
                </select>
              </label>
              <label className="il-field"><span>Portrait width</span><input type="number" min="0.1" step="0.1" value={form.aspectWidth} onChange={event=>update('aspectWidth',event.currentTarget.value)} /></label>
              <label className="il-field"><span>Portrait height</span><input type="number" min="0.1" step="0.1" value={form.aspectHeight} onChange={event=>update('aspectHeight',event.currentTarget.value)} /></label>
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
                <select
                  value={form.panelTechnology}
                  onChange={(event) => update('panelTechnology', event.currentTarget.value)}
                >
                  <option value="">Select display panel</option>
                  <optgroup label="OLED">
                    <option value="LTPO OLED">LTPO OLED</option>
                    <option value="LTPS OLED">LTPS OLED</option>
                    <option value="AMOLED">AMOLED</option>
                    <option value="Super AMOLED">Super AMOLED</option>
                    <option value="Dynamic AMOLED 2X">Dynamic AMOLED 2X</option>
                    <option value="Tandem OLED">Tandem OLED</option>
                    <option value="Micro-lens Array OLED">MLA OLED</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="IPS LCD">IPS LCD</option>
                    <option value="TFT LCD">TFT LCD</option>
                    <option value="microLED">microLED</option>
                  </optgroup>
                  {form.panelTechnology && !['LTPO OLED','LTPS OLED','AMOLED','Super AMOLED','Dynamic AMOLED 2X','Tandem OLED','Micro-lens Array OLED','IPS LCD','TFT LCD','microLED'].includes(form.panelTechnology) && <option value={form.panelTechnology}>{form.panelTechnology} (saved selection)</option>}
                </select>
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

                <NumericField
                  label="Adaptive state 1"
                  suffix="Hz"
                  value={form.displayRefreshState1Hz}
                  placeholder="10"
                  step="1"
                  onChange={(value) =>
                    update(
                      'displayRefreshState1Hz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="State 1 duty"
                  suffix="%"
                  value={
                    form.displayRefreshState1DutyPercent
                  }
                  placeholder="70"
                  step="1"
                  onChange={(value) =>
                    update(
                      'displayRefreshState1DutyPercent',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Adaptive state 2"
                  suffix="Hz"
                  value={form.displayRefreshState2Hz}
                  placeholder="120"
                  step="1"
                  onChange={(value) =>
                    update(
                      'displayRefreshState2Hz',
                      value,
                    )
                  }
                />

                <NumericField
                  label="State 2 duty"
                  suffix="%"
                  value={
                    form.displayRefreshState2DutyPercent
                  }
                  placeholder="30"
                  step="1"
                  onChange={(value) =>
                    update(
                      'displayRefreshState2DutyPercent',
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

            <details className="il-advanced">
              <summary>Battery aging assumptions</summary>

              <p className="il-help">
                Optional aging scenario. Enter only rates you have evidence
                for or explicitly want to test. PhoneFuturist does not assign
                a default degradation rate from battery chemistry.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Battery age"
                  suffix="years"
                  value={form.batteryAgeYears}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'batteryAgeYears',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Equivalent full cycles"
                  value={
                    form.batteryEquivalentFullCycles
                  }
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'batteryEquivalentFullCycles',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Calendar fade"
                  suffix="% / year"
                  value={
                    form.batteryAnnualCalendarFadePercent
                  }
                  placeholder="Evidence / assumption"
                  onChange={(value) =>
                    update(
                      'batteryAnnualCalendarFadePercent',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Cycle fade"
                  suffix="% / 100 cycles"
                  value={
                    form.batteryCycleFadePercentPer100Cycles
                  }
                  placeholder="Evidence / assumption"
                  onChange={(value) =>
                    update(
                      'batteryCycleFadePercentPer100Cycles',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Health threshold"
                  suffix="% retained"
                  value={
                    form.batteryHealthThresholdPercent
                  }
                  placeholder="80"
                  onChange={(value) =>
                    update(
                      'batteryHealthThresholdPercent',
                      value,
                    )
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
                        | 'dual-cell'
                        | 'tri-cell'
                        | 'quad-cell',
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
                  <option value="tri-cell">Tri-cell (3 cells)</option>
                  <option value="quad-cell">Quad-cell (4 cells)</option>
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
                <h2>Connectivity</h2>
                <p>
                  Model one explicit radio/network workload.
                </p>
              </div>
            </div>

            <div className="il-grid">
              <label className="il-field">
                <span>Network mode</span>
                <select
                  value={form.connectivityMode}
                  onChange={(event) =>
                    update(
                      'connectivityMode',
                      event.currentTarget
                        .value as ConnectivityMode,
                    )
                  }
                >
                  <option value="wifi">Wi-Fi</option>
                  <option value="lte">LTE</option>
                  <option value="5g-sub6">5G sub-6</option>
                  <option value="5g-mmwave">5G mmWave</option>
                  <option value="hotspot">Hotspot</option>
                  <option value="gnss">GNSS</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <NumericField
                label="Download traffic"
                suffix="Mbps"
                value={form.connectivityDownloadMbps}
                placeholder="100"
                onChange={(value) =>
                  update(
                    'connectivityDownloadMbps',
                    value,
                  )
                }
              />

              <NumericField
                label="Upload traffic"
                suffix="Mbps"
                value={form.connectivityUploadMbps}
                placeholder="20"
                onChange={(value) =>
                  update(
                    'connectivityUploadMbps',
                    value,
                  )
                }
              />

              <NumericField
                label="Link capacity"
                suffix="Mbps"
                value={
                  form.connectivityLinkCapacityMbps
                }
                placeholder="300"
                onChange={(value) =>
                  update(
                    'connectivityLinkCapacityMbps',
                    value,
                  )
                }
              />

              <NumericField
                label="Session duration"
                suffix="min"
                value={form.connectivitySessionMinutes}
                placeholder="30"
                onChange={(value) =>
                  update(
                    'connectivitySessionMinutes',
                    value,
                  )
                }
              />

              <NumericField
                label="Radio power"
                suffix="W"
                value={form.connectivityRadioPowerW}
                placeholder="Evidence / assumption"
                onChange={(value) =>
                  update(
                    'connectivityRadioPowerW',
                    value,
                  )
                }
              />

              <NumericField
                label="Radio active duty"
                suffix="%"
                value={
                  form.connectivityActiveDutyPercent
                }
                placeholder="100"
                onChange={(value) =>
                  update(
                    'connectivityActiveDutyPercent',
                    value,
                  )
                }
              />

              <label className="il-field">
                <span>Signal metric label</span>
                <input
                  type="text"
                  value={
                    form.connectivitySignalMetricLabel
                  }
                  placeholder="RSRP dBm"
                  onChange={(event) =>
                    update(
                      'connectivitySignalMetricLabel',
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <NumericField
                label="Signal metric value"
                value={
                  form.connectivitySignalMetricValue
                }
                placeholder="-105"
                onChange={(value) =>
                  update(
                    'connectivitySignalMetricValue',
                    value,
                  )
                }
              />
            </div>

            <p className="il-help">
              Network type and signal labels do not secretly change power.
              Enter measured or explicit radio power when you want an energy
              estimate.
            </p>
          </div>

          <div className="il-section">
            <div className="il-section-heading">
              <span>06</span>
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
                <select
                  value={form.socVendor}
                  onChange={(event) => setForm(current => ({ ...current, socVendor: event.currentTarget.value, socName: '' }))}
                >
                  <option value="">Select SoC vendor</option>
                  {['Qualcomm','Samsung','MediaTek','Apple','Google','Huawei','Unisoc','other'].map(vendor => <option key={vendor} value={vendor}>{vendor}</option>)}
                  {form.socVendor && !['Qualcomm','Samsung','MediaTek','Apple','Google','Huawei','Unisoc','other'].includes(form.socVendor) && <option value={form.socVendor}>{form.socVendor}</option>}
                </select>
              </label>

              <label className="il-field">
                <span>SoC model</span>
                <select
                  value={isSelectableSoc(form.socVendor, form.socName) ? form.socName : ''}
                  onChange={(event) => update('socName', event.currentTarget.value)}
                >
                  <option value="">Select processor</option>
                  {(SOC_MODELS[form.socVendor]?.released ?? []).map(chip => <option key={chip} value={chip}>{chip}</option>)}
                  {(SOC_MODELS[form.socVendor]?.preview ?? []).map(chip => <option key={chip} value={chip}>{chip} (rumored / experimental)</option>)}
                </select>
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
              <summary>GPU architecture assumptions</summary>

              <p className="il-help">
                Optional GPU structure for raster, gaming and ray-tracing
                context. Shader cores and execution units are not assumed to
                be equivalent across vendors. Relative architecture efficiency
                is only used when you explicitly supply it. Nothing here is
                automatically converted into a 3DMark score.
              </p>

              <div className="il-grid">
                <NumericField
                  label="GPU shader cores"
                  value={form.gpuShaderCores}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update('gpuShaderCores', value)
                  }
                />

                <NumericField
                  label="GPU execution units"
                  value={form.gpuExecutionUnits}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update('gpuExecutionUnits', value)
                  }
                />

                <NumericField
                  label="GPU peak clock"
                  suffix="GHz"
                  value={form.gpuPeakClockGhz}
                  placeholder="Optional"
                  onChange={(value) =>
                    update('gpuPeakClockGhz', value)
                  }
                />

                <NumericField
                  label="Peak GPU power"
                  suffix="W"
                  value={form.gpuPeakPowerW}
                  placeholder="Optional"
                  onChange={(value) =>
                    update('gpuPeakPowerW', value)
                  }
                />

                <NumericField
                  label="Non-GPU package power"
                  suffix="W"
                  value={form.gpuNonGpuPackagePowerW}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'gpuNonGpuPackagePowerW',
                      value,
                    )
                  }
                />

                <NumericField
                  label="GPU memory bandwidth"
                  suffix="GB/s"
                  value={form.gpuMemoryBandwidthGbps}
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'gpuMemoryBandwidthGbps',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Texture units"
                  value={form.gpuTextureUnits}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update('gpuTextureUnits', value)
                  }
                />

                <NumericField
                  label="Render output units"
                  value={form.gpuRenderOutputUnits}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update(
                      'gpuRenderOutputUnits',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Ray-tracing units"
                  value={form.gpuRayTracingUnits}
                  placeholder="Optional"
                  step="1"
                  onChange={(value) =>
                    update(
                      'gpuRayTracingUnits',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Relative GPU architecture efficiency"
                  value={
                    form.gpuRelativeArchitectureEfficiency
                  }
                  placeholder="1.0 = reference"
                  onChange={(value) =>
                    update(
                      'gpuRelativeArchitectureEfficiency',
                      value,
                    )
                  }
                />
              </div>
            </details>

            <details className="il-advanced">
              <summary>GPU workload target</summary>

              <p className="il-help">
                Optional demand-side inputs. These calculate frame budget,
                pixel throughput and RT ray demand. They describe what the
                workload asks from the GPU, not what FPS the phone will
                achieve.
              </p>

              <div className="il-grid">
                <NumericField
                  label="Render width"
                  suffix="px"
                  value={form.gpuRenderWidthPx}
                  placeholder="1920"
                  step="1"
                  onChange={(value) =>
                    update('gpuRenderWidthPx', value)
                  }
                />

                <NumericField
                  label="Render height"
                  suffix="px"
                  value={form.gpuRenderHeightPx}
                  placeholder="1080"
                  step="1"
                  onChange={(value) =>
                    update('gpuRenderHeightPx', value)
                  }
                />

                <NumericField
                  label="Target FPS"
                  value={form.gpuTargetFps}
                  placeholder="60"
                  onChange={(value) =>
                    update('gpuTargetFps', value)
                  }
                />

                <NumericField
                  label="Render scale"
                  suffix="%"
                  value={form.gpuRenderScalePercent}
                  placeholder="100"
                  onChange={(value) =>
                    update(
                      'gpuRenderScalePercent',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Relative workload complexity"
                  value={
                    form.gpuRelativeWorkloadComplexity
                  }
                  placeholder="1.0 = reference"
                  onChange={(value) =>
                    update(
                      'gpuRelativeWorkloadComplexity',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Estimated memory traffic"
                  suffix="B/rendered px"
                  value={
                    form.gpuEstimatedMemoryTrafficBytesPerPixel
                  }
                  placeholder="Optional"
                  onChange={(value) =>
                    update(
                      'gpuEstimatedMemoryTrafficBytesPerPixel',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Gaming session"
                  suffix="min"
                  value={form.gamingSessionMinutes}
                  placeholder="30"
                  onChange={(value) =>
                    update(
                      'gamingSessionMinutes',
                      value,
                    )
                  }
                />

                <NumericField
                  label="Rays per pixel"
                  value={form.gpuRaysPerPixel}
                  placeholder="RT only"
                  onChange={(value) =>
                    update('gpuRaysPerPixel', value)
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
                <span>07</span>
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

                      <label className="il-field">
                        <span>Sensor format (optical type)</span>
                        <select value={camera.sensorFormatDenominator}
                          onChange={(event) => updateCamera(camera.id, { sensorFormatDenominator: event.currentTarget.value })}>
                          <option value="">Select sensor format</option>
                          {CAMERA_SENSOR_FORMATS.map(value => (
                            <option value={String(value)} key={value}>1/{value}″ type</option>
                          ))}
                          {camera.sensorFormatDenominator && !CAMERA_SENSOR_FORMATS.some(value => String(value) === camera.sensorFormatDenominator) &&
                            <option value={camera.sensorFormatDenominator}>1/{camera.sensorFormatDenominator}″ (saved)</option>}
                        </select>
                        <small>Optical format designation, not literal sensor width. Exact dimensions remain available below.</small>
                      </label>

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

                      <label className="il-field">
                        <span>Aperture mechanism</span>
                        <select value={camera.variableAperture ? 'variable' : 'fixed'} onChange={(event) =>
                          updateCamera(camera.id, { variableAperture: event.currentTarget.value === 'variable' })}>
                          <option value="fixed">Fixed aperture</option>
                          <option value="variable">Variable aperture</option>
                        </select>
                      </label>
                      {camera.variableAperture && (
                        <>
                          <label className="il-field">
                            <span>Widest aperture</span>
                            <select value={camera.variableApertureWide}
                              onChange={(event) => {
                                const wide = event.currentTarget.value;
                                updateCamera(camera.id, { variableApertureWide: wide,
                                  apertureFNumber: wide });
                              }}>
                              <option value="">Select widest aperture</option>
                              {CAMERA_APERTURES.map(value => <option key={value} value={String(value)}>f/{value}</option>)}
                            </select>
                          </label>
                          <label className="il-field">
                            <span>Narrowest aperture</span>
                            <select value={camera.variableApertureNarrow}
                              onChange={(event) => updateCamera(camera.id, { variableApertureNarrow: event.currentTarget.value })}>
                              <option value="">Select narrowest aperture</option>
                              {CAMERA_APERTURES.map(value => <option key={value} value={String(value)}>f/{value}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                      <label className="il-field">
                        <span>{camera.variableAperture ? 'Active aperture for simulation' : 'Fixed aperture'}</span>
                        <select value={camera.apertureFNumber}
                          onChange={(event) => updateCamera(camera.id, { apertureFNumber: event.currentTarget.value })}>
                          <option value="">Select f-number</option>
                          {CAMERA_APERTURES.filter(value => !camera.variableAperture ||
                            (cameraApertureRangeValid(camera.variableApertureWide, camera.variableApertureNarrow) &&
                            value >= Number(camera.variableApertureWide) &&
                            value <= Number(camera.variableApertureNarrow)))
                            .map(value => <option key={value} value={String(value)}>f/{value}</option>)}
                          {camera.apertureFNumber && !CAMERA_APERTURES.some(value => String(value) === camera.apertureFNumber) &&
                            <option value={camera.apertureFNumber}>f/{camera.apertureFNumber} (saved)</option>}
                        </select>
                        {camera.variableAperture && <small>{cameraApertureRangeValid(camera.variableApertureWide, camera.variableApertureNarrow)
                          ? 'Results use the selected active aperture, not an assumed automatic exposure curve.'
                          : 'Choose a valid widest/narrowest range (the narrowest f-number must be larger).'}</small>}
                      </label>
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
                          label="Video width"
                          suffix="px"
                          value={
                            camera.videoWidthPx ?? ''
                          }
                          placeholder="3840"
                          step="1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoWidthPx: value,
                            })
                          }
                        />

                        <NumericField
                          label="Video height"
                          suffix="px"
                          value={
                            camera.videoHeightPx ?? ''
                          }
                          placeholder="2160"
                          step="1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoHeightPx: value,
                            })
                          }
                        />

                        <NumericField
                          label="Video bit depth"
                          suffix="bit"
                          value={
                            camera.videoBitDepth ?? ''
                          }
                          placeholder="10"
                          step="1"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoBitDepth: value,
                            })
                          }
                        />

                        <label className="il-field">
                          <span>Video chroma</span>
                          <select
                            value={
                              camera.videoChromaSubsampling ??
                              ''
                            }
                            onChange={(event) =>
                              updateCamera(camera.id, {
                                videoChromaSubsampling:
                                  event.currentTarget
                                    .value as CameraDraft['videoChromaSubsampling'],
                              })
                            }
                          >
                            <option value="">
                              Unknown
                            </option>
                            <option value="4:2:0">
                              4:2:0
                            </option>
                            <option value="4:2:2">
                              4:2:2
                            </option>
                            <option value="4:4:4">
                              4:4:4
                            </option>
                          </select>
                        </label>

                        <NumericField
                          label="Encoded bitrate"
                          suffix="Mbps"
                          value={
                            camera.videoEncodedBitrateMbps ??
                            ''
                          }
                          placeholder="200"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoEncodedBitrateMbps:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Recording duration"
                          suffix="min"
                          value={
                            camera.videoRecordingDurationMinutes ??
                            ''
                          }
                          placeholder="10"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoRecordingDurationMinutes:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Camera pipeline power"
                          suffix="W"
                          value={
                            camera.videoPipelinePowerW ??
                            ''
                          }
                          placeholder="Evidence / assumption"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoPipelinePowerW:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Video thermal resistance"
                          suffix="°C/W"
                          value={
                            camera.videoThermalResistanceCPerW ??
                            ''
                          }
                          placeholder="Optional"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoThermalResistanceCPerW:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Video thermal mass"
                          suffix="J/°C"
                          value={
                            camera.videoThermalMassJPerC ??
                            ''
                          }
                          placeholder="Optional"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoThermalMassJPerC:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Video thermal ceiling"
                          suffix="°C"
                          value={
                            camera.videoThermalLimitTemperatureC ??
                            ''
                          }
                          placeholder="Optional"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              videoThermalLimitTemperatureC:
                                value,
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
                          label="Full-well capacity"
                          suffix="e⁻"
                          value={
                            camera.fullWellElectrons ?? ''
                          }
                          placeholder="Evidence only"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              fullWellElectrons: value,
                            })
                          }
                        />

                        <NumericField
                          label="Read noise"
                          suffix="e⁻ RMS"
                          value={
                            camera.readNoiseElectrons ?? ''
                          }
                          placeholder="Evidence only"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              readNoiseElectrons: value,
                            })
                          }
                        />

                        <NumericField
                          label="Dark current"
                          suffix="e⁻/s"
                          value={
                            camera.darkCurrentElectronsPerSecond ??
                            ''
                          }
                          placeholder="Optional"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              darkCurrentElectronsPerSecond:
                                value,
                            })
                          }
                        />

                        <NumericField
                          label="Signal electrons"
                          suffix="e⁻"
                          value={
                            camera.signalElectrons ?? ''
                          }
                          placeholder="Optional SNR probe"
                          onChange={(value) =>
                            updateCamera(camera.id, {
                              signalElectrons: value,
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
              <span>08</span>
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
            {simulationPending && <p role="status" aria-live="polite">Simulating device performance in the background…</p>}
            {simulationError && <p role="alert">{simulationError}</p>}
            <button
              type="button"
              className="il-simulate"
              onClick={simulate}
              disabled={simulationPending}
              aria-busy={simulationPending}
            >
              {simulationPending ? 'Simulating…' : 'Run simulation →'}
            </button>

            <p>
              Unknown inputs stay unknown. The engine
              does not silently invent missing data.
            </p>
          </div>
        </section>

        <aside
          key={resultRevision}
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

              <h2>Ready to simulate</h2>

              
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

              {workspaceMode === 'simple' ? (
                <div className="il-result-group">
                  <span className="il-result-label">Simple overview</span>
                  <div className="il-metrics" aria-label="CPU benchmark scores">
                    {simpleCpuScores.map(({domain, estimate}) => (
                      <div key={domain}>
                        <strong>{estimate.status === 'resolved' && estimate.adjustedExpected !== undefined
                          ? format(estimate.adjustedExpected, 0)
                          : 'Not enough evidence'}</strong>
                        <span>{domain === 'geekbench6_single' ? 'Geekbench 6 · Single-core' : 'Geekbench 6 · Multi-core'}</span>
                        <small>{estimate.status === 'resolved' ? (estimate.evidenceScope === 'same-soc-family' ? 'Same-chip-family reference estimate' : 'Comparable-device estimate') : 'No defensible score available'}</small>
                      </div>
                    ))}
                  </div>
                  {suggestedComparisons.some(item=>item.status==='found') && (
                    <div className="il-sensitivity-card">
                      <strong>Compare generations</strong>
                      <div className="il-metrics">
                        {suggestedComparisons.filter(item=>item.status==='found').map(item=>(
                          <div key={item.query}>
                            <strong>{item.label}</strong>
                            <span>{item.role === 'predecessor' ? 'Predecessor' : item.role === 'older-generation' ? 'Earlier model' : 'Related model'}{item.released?.region ? ` · ${item.released.region}` : ''}</span>
                            {item.released?.batteryMah !== undefined && <small>Battery: {format(item.released.batteryMah, 0)} mAh · Concept: {format(result.battery?.totalCapacityMah, 0)} mAh</small>}
                            {item.released?.displayInches !== undefined && <small>Display: {format(item.released.displayInches, 2)}″ · Concept: {format(simulationInput?.displays.primary.diagonalInches, 2)}″</small>}
                            {item.released?.refreshRateHz !== undefined && <small>Refresh: {format(item.released.refreshRateHz, 0)} Hz · Concept: {format(simulationInput?.displays.primary.refreshRateHz, 0)} Hz</small>}
                            {item.released?.wiredWatts !== undefined && <small>Wired charging: {format(item.released.wiredWatts, 0)} W · Concept: {format(numeric(form.wiredChargeW), 0)} W</small>}
                            {item.released?.socName && <small>Predecessor chip: {item.released.socName}</small>}
                            {item.released?.catalogUnverified && <small>Catalog specifications are not independently verified.</small>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {competingDevices.length > 0 && (
                    <div className="il-sensitivity-card">
                      <strong>Other phones to compare</strong>
                      <div className="il-metrics">
                        {competingDevices.map(device=>(
                          <div key={device.deviceId}>
                            <strong>{device.label}</strong>
                            <span>{device.released?.socName ?? 'Processor unspecified'}</span>
                            {device.released?.batteryMah !== undefined && <small>{format(device.released.batteryMah,0)} mAh</small>}
                            {device.released?.displayInches !== undefined && <small>{format(device.released.displayInches,2)}″ display</small>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="il-simple-battery-readout">
                    <span className="il-result-label">Active-use endurance · one charge</span>
                    <strong>{batteryExperience?.mixedUse ? `${format(batteryExperience.mixedUse.expectedActiveUseHoursPerCharge, 1)} hours` : 'Not enough evidence'}</strong>
                    <p>Estimated total time actively using the screen across browsing, video and gaming. <b>Not continuous screen-on time under one workload, and not calendar-day battery life.</b></p>
                    <small>Standby, background tasks and overnight drain are excluded. This is a modeled estimate, not a measured result for this concept phone.</small>
                  </div>
                  <div className="il-metrics">
                    <div><strong>{usagePreset}</strong><span>Selected usage mix</span></div>
                    <div><strong>{batteryExperience?.mixedUse ? `${format(batteryExperience.mixedUse.activeHoursPerDay, 1)} h/day` : '—'}</strong><span>Daily active-use assumption (not battery endurance)</span></div>
                    <div><strong>{format(result.battery?.totalCapacityMah, 0)} mAh</strong><span>Battery capacity</span></div>
                    <div><strong>{format(simulationInput?.displays.primary.diagonalInches, 1)}″</strong><span>Screen size</span></div>
                    <div><strong>{chargingResult?.status === 'resolved' ? formatDurationMinutes(chargingResult.estimate?.timeTo100Minutes?.expected) : 'Not enough evidence'}</strong><span>Estimated charging time · 0–100%</span></div>
                    {result.displays.primary.renderingPixelRatio !== undefined && <div><strong>{format(result.displays.primary.renderingPixelRatio * 100, 1)}%</strong><span>GPU rendered pixels relative to native panel</span><small>Not a measured battery-saving percentage.</small></div>}
                  </div>
                  <p className="il-help">Light, Typical and Heavy currently change the usage mix and hours per day, but do not calibrate processor load intensity. Similar endurance predictions across presets are therefore expected. Do not interpret active-use hours divided by hours/day as actual days between charges.</p>
                </div>
              ) : (
              <>
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
                          {displayExperience.expectedPanelPowerW !==
                          undefined
                            ? `${format(
                                displayExperience.expectedPanelPowerW,
                                2,
                              )} W`
                            : 'Unresolved'}
                        </strong>
                        <span>
                          {displayExperience.electricalPowerMode ===
                          'direct-calibration'
                            ? 'Measured-calibrated panel power'
                            : displayExperience.electricalPowerMode ===
                                'controlled-interpolation'
                              ? 'Interpolated measured panel power'
                              : 'Electrical panel power'}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.electricalPowerMode ===
                          'controlled-interpolation'
                            ? displayExperience.electricalResponse
                                .referenceCount
                            : displayExperience.electricalPower
                                .referenceCount}
                        </strong>
                        <span>Isolated panel-power references</span>
                      </div>

                      <div>
                        <strong>
                          {displayExperience.electricalPowerMode.replaceAll(
                            '-',
                            ' ',
                          )}
                        </strong>
                        <span>Electrical power provenance</span>
                      </div>
                    </div>

                    <p className="il-help">
                      Electrical panel power:{' '}
                      {publicEvidenceText(displayExperience.note)}
                    </p>

                    {displayRefreshProfile ? (
                      displayRefreshProfile.status ===
                      'resolved' ? (
                        <div className="il-display-sensitivity">
                          <span className="il-result-label">
                            Adaptive refresh ·{' '}
                            {DISPLAY_REFRESH_PROFILE_VERSION}
                          </span>

                          <div className="il-metrics">
                            <div>
                              <strong>
                                {displayRefreshProfile.weightedAverageRefreshRateHz !==
                                undefined
                                  ? `${format(
                                      displayRefreshProfile.weightedAverageRefreshRateHz,
                                      1,
                                    )} Hz`
                                  : 'Unknown'}
                              </strong>
                              <span>Time-weighted refresh</span>
                            </div>

                            <div>
                              <strong>
                                {displayRefreshProfile.highRefreshDutyPercent !==
                                undefined
                                  ? `${format(
                                      displayRefreshProfile.highRefreshDutyPercent,
                                      1,
                                    )}%`
                                  : 'Unknown'}
                              </strong>
                              <span>Time above 60 Hz</span>
                            </div>

                            <div>
                              <strong>
                                {displayRefreshProfile.weightedPixelThroughputMpxPerSecond !==
                                undefined
                                  ? `${format(
                                      displayRefreshProfile.weightedPixelThroughputMpxPerSecond,
                                      1,
                                    )} MP/s`
                                  : 'Unknown'}
                              </strong>
                              <span>Weighted pixel scan demand</span>
                            </div>

                            <div>
                              <strong>
                                {displayRefreshProfile.minimumRefreshRateHz !==
                                  undefined &&
                                displayRefreshProfile.maximumRefreshRateHz !==
                                  undefined
                                  ? `${format(
                                      displayRefreshProfile.minimumRefreshRateHz,
                                      0,
                                    )}–${format(
                                      displayRefreshProfile.maximumRefreshRateHz,
                                      0,
                                    )} Hz`
                                  : 'Unknown'}
                              </strong>
                              <span>Refresh range in profile</span>
                            </div>
                          </div>

                          <p className="il-help">
                            {publicEvidenceText(displayRefreshProfile.note)}
                          </p>
                        </div>
                      ) : (
                        <p className="il-help">
                          Adaptive refresh unresolved:{' '}
                          {publicEvidenceText(displayRefreshProfile.unresolvedReason)}
                        </p>
                      )
                    ) : null}

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
                          {publicEvidenceText(displayExperience.load.note)}
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
                          {publicEvidenceText(displayRuntimeSensitivity.note)}
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
                      {publicEvidenceText(displayExperience.note)} Brightness is not yet
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

              {batteryAging ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Battery aging · {BATTERY_AGING_ENVELOPE_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {batteryAging.combinedRetentionPercent !==
                        undefined
                          ? `${format(
                              batteryAging.combinedRetentionPercent,
                              1,
                            )}%`
                          : 'Unresolved'}
                      </strong>
                      <span>Retained energy / capacity</span>
                    </div>

                    <div>
                      <strong>
                        {batteryAging.estimatedCapacityMah !==
                        undefined
                          ? `${format(
                              batteryAging.estimatedCapacityMah,
                              0,
                            )} mAh`
                          : 'Unknown'}
                      </strong>
                      <span>Aged capacity scenario</span>
                    </div>

                    <div>
                      <strong>
                        {batteryAging.estimatedEnergyWh !==
                        undefined
                          ? `${format(
                              batteryAging.estimatedEnergyWh,
                              2,
                            )} Wh`
                          : 'Unknown'}
                      </strong>
                      <span>Aged energy scenario</span>
                    </div>

                    <div>
                      <strong>
                        {batteryAging.calendarRetentionFraction !==
                        undefined
                          ? `${format(
                              batteryAging.calendarRetentionFraction *
                                100,
                              1,
                            )}%`
                          : 'Not supplied'}
                      </strong>
                      <span>Calendar retention</span>
                    </div>

                    <div>
                      <strong>
                        {batteryAging.cycleRetentionFraction !==
                        undefined
                          ? `${format(
                              batteryAging.cycleRetentionFraction *
                                100,
                              1,
                            )}%`
                          : 'Not supplied'}
                      </strong>
                      <span>Cycle retention</span>
                    </div>

                    <div>
                      <strong>
                        {agingEquivalentFullCycles !==
                        undefined
                          ? format(
                              agingEquivalentFullCycles,
                              0,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>
                        Equivalent full cycles ·{' '}
                        {explicitEquivalentFullCycles !==
                        undefined
                          ? 'explicit'
                          : batteryCycleExposure?.status ===
                              'resolved'
                            ? 'active-use estimate'
                            : 'unresolved'}
                      </span>
                    </div>
                  </div>

                  {agedRuntimeRows.length ? (
                    <div className="il-sensitivity-grid">
                      {agedRuntimeRows.map((row) => (
                        <div
                          className="il-sensitivity-card"
                          key={row.workload}
                        >
                          <strong>
                            {row.workload.replaceAll(
                              '_',
                              ' ',
                            )}
                          </strong>
                          <span>
                            {row.result.baselineRuntimeHours !==
                            undefined
                              ? `${format(
                                  row.result.baselineRuntimeHours,
                                  1,
                                )} h new`
                              : 'Baseline unknown'}
                          </span>
                          <span>
                            {row.result.agedRuntimeHours !==
                            undefined
                              ? `${format(
                                  row.result.agedRuntimeHours,
                                  1,
                                )} h aged`
                              : 'Aged runtime unknown'}
                          </span>
                          <small>
                            {BATTERY_AGING_RUNTIME_VERSION}
                            {row.result.runtimeDeltaPercent !==
                            undefined
                              ? ` · ${format(
                                  row.result.runtimeDeltaPercent,
                                  1,
                                )}% runtime`
                              : ''}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {batteryHealthForecast ? (
                    batteryHealthForecast.status ===
                    'resolved' ? (
                      <>
                        <div className="il-metrics">
                          <div>
                            <strong>
                              {batteryHealthForecast.yearsFromNewToThreshold !==
                              undefined
                                ? `${format(
                                    batteryHealthForecast.yearsFromNewToThreshold,
                                    1,
                                  )} years`
                                : 'Unknown'}
                            </strong>
                            <span>
                              Time from new to{' '}
                              {batteryHealthForecast.targetRetentionPercent}%
                            </span>
                          </div>

                          <div>
                            <strong>
                              {batteryHealthForecast.remainingYearsFromCurrentAge !==
                              undefined
                                ? `${format(
                                    batteryHealthForecast.remainingYearsFromCurrentAge,
                                    1,
                                  )} years`
                                : 'Unknown'}
                            </strong>
                            <span>Remaining from entered age</span>
                          </div>

                          <div>
                            <strong>
                              {batteryHealthForecast.equivalentFullCyclesToThreshold !==
                              undefined
                                ? format(
                                    batteryHealthForecast.equivalentFullCyclesToThreshold,
                                    0,
                                  )
                                : 'Unknown'}
                            </strong>
                            <span>Projected EFC at threshold</span>
                          </div>
                        </div>

                        <p className="il-help">
                          {BATTERY_HEALTH_FORECAST_VERSION} ·{' '}
                          {publicEvidenceText(batteryHealthForecast.note)}
                        </p>
                      </>
                    ) : (
                      <p className="il-help">
                        Health threshold unresolved:{' '}
                        {publicEvidenceText(batteryHealthForecast.unresolvedReason)}
                      </p>
                    )
                  ) : null}

                  {explicitEquivalentFullCycles ===
                    undefined &&
                  batteryCycleExposure?.status ===
                    'resolved' ? (
                    <p className="il-help">
                      {BATTERY_CYCLE_EXPOSURE_VERSION} ·{' '}
                      {publicEvidenceText(batteryCycleExposure.note)}
                    </p>
                  ) : null}

                  <p className="il-help">
                    {publicEvidenceText(batteryAging.note)}
                  </p>
                </div>
              ) : null}

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
                      {form.socName.trim() ? (
                        <div className="il-sensitivity-card" style={{ marginBottom: 16 }}>
                          <strong>Processor efficiency evidence</strong>
                          <label className="il-field">
                            <span>Measured benchmark operating point</span>
                            <select value={benchmarkLoad} onChange={event=>setBenchmarkLoad(event.currentTarget.value as 'low'|'medium'|'high')}>
                              <option value="low">Lower measured load</option>
                              <option value="medium">Middle measured load</option>
                              <option value="high">Higher measured load</option>
                            </select>
                          </label>
                          {(['geekbench6', 'steelNomadLight'] as const).map(protocol => {
                            const curve = getSocEfficiencyCurve(form.socName.trim(), protocol);
                            if (!curve) return (
                              <small key={protocol}>
                                {protocol === 'geekbench6' ? 'CPU' : 'GPU'}: no exact-chip measured efficiency curve.
                              </small>
                            );
                            const point = curve.points[benchmarkLoad === 'low' ? 0 : benchmarkLoad === 'high' ? curve.points.length - 1 : Math.floor(curve.points.length / 2)];
                            const observation = evaluateSocAtBoardPower(curve.soc, protocol, point.boardPowerW);
                            return (
                              <small key={protocol}>
                                {protocol === 'geekbench6' ? 'CPU · Geekbench 6' : 'GPU · Steel Nomad Light'}: {format(point.benchmarkScore, 0)} points · {format(point.boardPowerW, 2)} W · {format(observation.scorePerWatt, 0)} points/W
                              </small>
                            );
                          })}
                          <small>Chip-specific measured benchmark load only. Full-phone runtime requires measured display, idle and workload duty-cycle data.</small>
                        </div>
                      ) : null}
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

                              {runtime.evidenceScope !== 'same-soc-family' && form.socName.trim() ? (
                                <small role="note" style={{ color: '#f6c879', fontWeight: 650 }}>
                                  Chip-specific efficiency unverified. This estimate uses {runtime.evidenceScope === 'same-soc-vendor' ? 'other chips from the same vendor' : 'a broader device group'} and may remain unchanged across chip generations.
                                </small>
                              ) : null}

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
                          {chargingWatts !== undefined
                            ? `${format(
                                chargingWatts,
                                0,
                              )} W`
                            : 'Unknown'}
                        </strong>
                        <span>Advertised / supported class</span>
                      </div>

                      <div>
                        <strong>
                          {observedChargingInput?.status ===
                            'resolved' &&
                          observedChargingInput
                            .expectedObservedPeakWatts !==
                            undefined
                            ? `${format(
                                observedChargingInput
                                  .expectedObservedPeakWatts,
                                1,
                              )} W`
                            : 'Unresolved'}
                        </strong>
                        <span>Estimated observed peak input</span>
                      </div>

                      <div>
                        <strong>
                          {observedChargingInput?.status ===
                            'resolved' &&
                          observedChargingInput
                            .expectedUtilizationPercent !==
                            undefined
                            ? `${format(
                                observedChargingInput
                                  .expectedUtilizationPercent,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Observed / advertised utilization</span>
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

                    {observedChargingInput?.status ===
                    'resolved' ? (
                      <p className="il-help">
                        {CHARGING_INPUT_POWER_ESTIMATOR_VERSION} ·{' '}
                        {publicEvidenceText(observedChargingInput.note)}
                      </p>
                    ) : null}

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
                        {publicEvidenceText(chargingResult.estimate.thermalResponse.note)}
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
                      {publicEvidenceText(chargingResult.estimate.note)}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    {chargingResult?.unresolvedReason ??
                      'Add battery capacity and wired charging wattage to estimate charging.'}
                  </div>
                )}
              </div>

              {chargerLabPeakInputContext?.status ===
              'resolved' ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    ChargerLAB peak-input sanity ·{' '}
                    {CHARGERLAB_PEAK_INPUT_CONTEXT_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {format(
                          chargerLabPeakInputContext
                            .advertisedWiredWatts,
                          0,
                        )} W
                      </strong>
                      <span>Advertised charger class</span>
                    </div>

                    <div>
                      <strong>
                        {chargerLabPeakInputContext
                          .observedPeakExpectedW !==
                        undefined
                          ? `${format(
                              chargerLabPeakInputContext
                                .observedPeakExpectedW,
                              1,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>Measured-peer peak context</span>
                    </div>

                    <div>
                      <strong>
                        {chargerLabPeakInputContext
                          .observedPeakMinW !==
                          undefined &&
                        chargerLabPeakInputContext
                          .observedPeakMaxW !==
                          undefined
                          ? `${format(
                              chargerLabPeakInputContext
                                .observedPeakMinW,
                              1,
                            )}–${format(
                              chargerLabPeakInputContext
                                .observedPeakMaxW,
                              1,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>Recent same-brand peak range</span>
                    </div>

                    <div>
                      <strong>
                        {chargerLabPeakInputContext
                          .utilizationExpectedPercent !==
                        undefined
                          ? `${format(
                              chargerLabPeakInputContext
                                .utilizationExpectedPercent,
                              1,
                            )}%`
                          : 'Unknown'}
                      </strong>
                      <span>Advertised-to-observed peak ratio</span>
                    </div>

                    <div>
                      <strong>
                        {chargerLabPeakInputContext.referenceCount}
                      </strong>
                      <span>ChargerLAB same-brand references</span>
                    </div>
                  </div>

                  <p className="il-help">
                    {chargerLabPeakInputContext.note}
                  </p>
                </div>
              ) : null}

              {geekerwanChargingContext?.status ===
              'resolved' ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Charging energy analysis
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {formatDurationMinutes(
                          geekerwanChargingContext
                            .expectedFullChargeMinutes,
                        )}
                      </strong>
                      <span>Independent full-charge context</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanChargingContext
                          .expectedWallInputEnergyWh !==
                        undefined
                          ? `${format(
                              geekerwanChargingContext
                                .expectedWallInputEnergyWh,
                              2,
                            )} Wh`
                          : 'Unknown'}
                      </strong>
                      <span>Expected wall-input energy</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanChargingContext
                          .expectedWallToCellOverheadPercent !==
                        undefined
                          ? `${format(
                              geekerwanChargingContext
                                .expectedWallToCellOverheadPercent,
                              1,
                            )}%`
                          : 'Unknown'}
                      </strong>
                      <span>Wall-to-cell energy overhead</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanChargingContext
                          .expectedAverageChargerUtilizationPercent !==
                        undefined
                          ? `${format(
                              geekerwanChargingContext
                                .expectedAverageChargerUtilizationPercent,
                              1,
                            )}%`
                          : 'Unknown'}
                      </strong>
                      <span>Average charger utilization</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanChargingContext.referenceCount}
                      </strong>
                      <span>Comparable charging measurements</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanChargingContext.targetPosition
                          ?.replaceAll('-', ' ') ??
                          'Unknown'}
                      </strong>
                      <span>Charger-power evidence position</span>
                    </div>
                  </div>

                  <p className="il-help">
                    Charging estimates incorporate measured power-conversion overhead and comparable charging behaviour.
                  </p>
                </div>
              ) : null}

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
                      {publicEvidenceText(wirelessChargingResult.note)}
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
                      {publicEvidenceText(socArchitecture.note)}
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
                        <span>
                          {peakPerformanceEstimate.evidenceScope ===
                          'same-soc-vendor'
                            ? 'Measured predecessor/vendor baseline'
                            : 'Measured exact-family baseline'}
                        </span>
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
                            ? 'Explicit what-if peak scenario'
                            : 'Measured peak estimate'}
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
                      {publicEvidenceText(peakPerformanceEstimate.note)}
                    </p>
                  </>
                ) : (
                  <div className="il-empty">
                    <p>
                      {peakPerformanceEstimate?.unresolvedReason ??
                        'No compatible measured peak benchmark evidence is available.'}
                    </p>
                    {peakPerformanceEstimate?.note ? (
                      <p className="il-help">
                        {publicEvidenceText(peakPerformanceEstimate.note)}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {crossLabBatteryContext &&
              crossLabBatteryContext.status !==
                'unresolved' ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Cross-lab battery evidence ·{' '}
                    {CROSS_LAB_BATTERY_CONTEXT_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {crossLabBatteryContext.geekerwan
                          ? `${format(
                              crossLabBatteryContext.geekerwan
                                .runtimeMinutes / 60,
                              2,
                            )} h`
                          : 'No exact match'}
                      </strong>
                      <span>Geekerwan Battery Life 5.0</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.geekerwan
                          ?.minutesPerWh !== undefined
                          ? `${format(
                              crossLabBatteryContext.geekerwan
                                .minutesPerWh,
                              1,
                            )} min/Wh`
                          : 'Unknown'}
                      </strong>
                      <span>Geekerwan energy-normalized runtime</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.phoneArena
                          ? `${format(
                              crossLabBatteryContext.phoneArena
                                .browsingMinutes / 60,
                              2,
                            )} h`
                          : 'No exact match'}
                      </strong>
                      <span>PhoneArena browsing</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.phoneArena
                          ? `${format(
                              crossLabBatteryContext.phoneArena
                                .videoMinutes / 60,
                              2,
                            )} h`
                          : 'No exact match'}
                      </strong>
                      <span>PhoneArena video</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.phoneArena
                          ? `${format(
                              crossLabBatteryContext.phoneArena
                                .gamingMinutes / 60,
                              2,
                            )} h`
                          : 'No exact match'}
                      </strong>
                      <span>PhoneArena gaming</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.phoneArena
                          ? `${format(
                              crossLabBatteryContext.phoneArena
                                .gamingMinutesPer1000Mah,
                              1,
                            )} min/1000mAh`
                          : 'Unknown'}
                      </strong>
                      <span>PhoneArena gaming efficiency</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.tomsGuide
                          ? `${format(
                              crossLabBatteryContext.tomsGuide
                                .runtimeMinutes / 60,
                              2,
                            )} h`
                          : 'No exact match'}
                      </strong>
                      <span>Tom's Guide 5G web-surf runtime</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.tomsGuide
                          ? `${format(
                              crossLabBatteryContext.tomsGuide
                                .minutesPer1000Mah,
                              1,
                            )} min/1000mAh`
                          : 'Unknown'}
                      </strong>
                      <span>Tom's Guide mAh-normalized runtime</span>
                    </div>

                    <div>
                      <strong>
                        {crossLabBatteryContext.evidenceCount}
                      </strong>
                      <span>Independent lab protocols</span>
                    </div>
                  </div>

                  <p className="il-help">
                    {publicEvidenceText(crossLabBatteryContext.note)}
                  </p>

                  {crossLabBatteryContext.warnings.map(
                    (warning) => (
                      <p
                        className="il-help"
                        key={warning}
                      >
                        {warning}
                      </p>
                    ),
                  )}
                </div>
              ) : null}

              {phoneArenaChargingResult ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    PhoneArena charging lab ·{' '}
                    {PHONEARENA_BATTERY_EVIDENCE_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {phoneArenaChargingResult.wiredFullMinutes !==
                        undefined
                          ? `${format(
                              phoneArenaChargingResult.wiredFullMinutes,
                              0,
                            )} min`
                          : 'Untested'}
                      </strong>
                      <span>Measured wired full charge</span>
                    </div>

                    <div>
                      <strong>
                        {phoneArenaChargingResult.wiredChargerWatts !==
                        undefined
                          ? `${format(
                              phoneArenaChargingResult.wiredChargerWatts,
                              0,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>PhoneArena charger class</span>
                    </div>

                    <div>
                      <strong>
                        {phoneArenaChargingResult.wired30MinutePercent !==
                        undefined
                          ? `${format(
                              phoneArenaChargingResult.wired30MinutePercent,
                              0,
                            )}%`
                          : 'Untested'}
                      </strong>
                      <span>30-minute wired charge</span>
                    </div>

                    <div>
                      <strong>
                        {phoneArenaChargingResult.wirelessFullMinutes !==
                        undefined
                          ? `${format(
                              phoneArenaChargingResult.wirelessFullMinutes,
                              0,
                            )} min`
                          : 'Untested'}
                      </strong>
                      <span>Measured wireless full charge</span>
                    </div>
                  </div>

                  <p className="il-help">
                    PhoneArena measurements remain a separate lab protocol.
                    Charger class is not treated as sustained battery input
                    power.
                  </p>
                </div>
              ) : null}

              {(geekerwanCpuContext?.status ===
                'resolved' ||
                geekerwanGpuContext?.status ===
                  'resolved' ||
                geekerwanBatteryResult) ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Performance and battery measurements
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {geekerwanCpuContext?.status ===
                          'resolved'
                          ? `${format(
                              geekerwanCpuContext.minPowerW,
                              2,
                            )}–${format(
                              geekerwanCpuContext.maxPowerW,
                              2,
                            )} W`
                          : 'No exact curve'}
                      </strong>
                      <span>GB6 board-power range</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanCpuContext?.status ===
                          'resolved'
                          ? format(
                              geekerwanCpuContext.maxScore,
                              0,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>GB6 published-curve max</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanCpuContext?.status ===
                          'resolved'
                          ? `${format(
                              geekerwanCpuContext.peakEfficiencyScorePerW,
                              0,
                            )} score/W`
                          : 'Unknown'}
                      </strong>
                      <span>GB6 peak curve efficiency</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanCpuContext?.selectedPoint
                          ? `${format(
                              geekerwanCpuContext.selectedPoint
                                .score,
                              0,
                            )} @ ${format(
                              geekerwanCpuContext.selectedPoint
                                .powerW,
                              2,
                            )} W`
                          : 'No power target'}
                      </strong>
                      <span>Nearest published GB6 point</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanGpuContext?.status ===
                          'resolved'
                          ? `${format(
                              geekerwanGpuContext.minPowerW,
                              2,
                            )}–${format(
                              geekerwanGpuContext.maxPowerW,
                              2,
                            )} W`
                          : 'No exact curve'}
                      </strong>
                      <span>Steel Nomad Light power range</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanGpuContext?.status ===
                          'resolved'
                          ? format(
                              geekerwanGpuContext.maxScore,
                              0,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>Steel Nomad Light curve max</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanGpuContext?.selectedPoint
                          ? `${format(
                              geekerwanGpuContext.selectedPoint
                                .score,
                              0,
                            )} @ ${format(
                              geekerwanGpuContext.selectedPoint
                                .powerW,
                              2,
                            )} W`
                          : 'No power target'}
                      </strong>
                      <span>Nearest published GPU point</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanBatteryResult
                          ? `${format(
                              geekerwanBatteryResult.runtimeMinutes /
                                60,
                              2,
                            )} h`
                          : 'No exact phone match'}
                      </strong>
                      <span>Battery Life 5.0 runtime</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanBatteryResult?.ratedEnergyWh !==
                        undefined
                          ? `${format(
                              geekerwanBatteryResult.ratedEnergyWh,
                              2,
                            )} Wh`
                          : 'Unknown'}
                      </strong>
                      <span>Tested phone rated energy</span>
                    </div>

                    <div>
                      <strong>
                        {geekerwanBatteryResult?.averagePowerW !==
                        undefined
                          ? `${format(
                              geekerwanBatteryResult.averagePowerW,
                              2,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>Battery 5.0 average device power</span>
                    </div>
                  </div>

                  {geekerwanCpuContext?.status ===
                  'resolved' ? (
                    <p className="il-help">
                      CPU estimates are informed by available measured power and performance curves.
                    </p>
                  ) : null}

                  {geekerwanGpuContext?.status ===
                  'resolved' ? (
                    <p className="il-help">
                      GPU estimates are informed by available measured power and performance curves.
                    </p>
                  ) : null}

                  {geekerwanBatteryResult ? (
                    <p className="il-help">
                      Battery runtime reference is based on an existing device measurement.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {gpuArchitecture ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    GPU architecture · {GPU_ARCHITECTURE_MODEL_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {gpuArchitecture.computeGeometryCount ??
                          'Unknown'}
                      </strong>
                      <span>
                        {gpuArchitecture.computeGeometrySource
                          ? gpuArchitecture.computeGeometrySource.replaceAll(
                              '-',
                              ' ',
                            )
                          : 'Compute geometry'}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {gpuArchitecture.rawComputeClockIndex !== undefined
                          ? format(
                              gpuArchitecture.rawComputeClockIndex,
                              2,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>Compute-clock index</span>
                    </div>

                    <div>
                      <strong>
                        {gpuArchitecture.rawComputePerWIndex !== undefined
                          ? format(
                              gpuArchitecture.rawComputePerWIndex,
                              2,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>Compute-clock / W</span>
                    </div>

                    <div>
                      <strong>
                        {gpuArchitecture.memoryBandwidthGbps !== undefined
                          ? `${format(
                              gpuArchitecture.memoryBandwidthGbps,
                              1,
                            )} GB/s`
                          : 'Unknown'}
                      </strong>
                      <span>GPU memory bandwidth</span>
                    </div>

                    <div>
                      <strong>
                        {gpuArchitecture.rayTracingUnits ??
                          'Unknown'}
                      </strong>
                      <span>Ray-tracing units</span>
                    </div>

                    <div>
                      <strong>
                        {gpuArchitecture.peakGpuPowerW !== undefined
                          ? `${format(
                              gpuArchitecture.peakGpuPowerW,
                              2,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>Peak GPU power</span>
                    </div>
                  </div>

                  <p className="il-help">
                    {publicEvidenceText(gpuArchitecture.note)}
                  </p>

                  {gpuPowerEnvelope ? (
                    <>
                      <div className="il-metrics">
                        <div>
                          <strong>
                            {gpuPowerEnvelope.sustainableSocPowerW !== undefined
                              ? `${format(
                                  gpuPowerEnvelope.sustainableSocPowerW,
                                  2,
                                )} W`
                              : 'Unknown'}
                          </strong>
                          <span>Sustainable package power</span>
                        </div>

                        <div>
                          <strong>
                            {gpuPowerEnvelope.sustainableGpuPowerCeilingW !== undefined
                              ? `${format(
                                  gpuPowerEnvelope.sustainableGpuPowerCeilingW,
                                  2,
                                )} W`
                              : 'Unknown'}
                          </strong>
                          <span>Sustainable GPU power ceiling</span>
                        </div>

                        <div>
                          <strong>
                            {gpuPowerEnvelope.nonGpuPackagePowerW !==
                            undefined
                              ? `${format(
                                  gpuPowerEnvelope.nonGpuPackagePowerW,
                                  2,
                                )} W`
                              : 'Unknown'}
                          </strong>
                          <span>Reserved non-GPU package power</span>
                        </div>

                        <div>
                          <strong>
                            {gpuPowerEnvelope.allocationMode
                              ? gpuPowerEnvelope.allocationMode.replaceAll(
                                  '-',
                                  ' ',
                                )
                              : 'Unknown'}
                          </strong>
                          <span>GPU power allocation mode</span>
                        </div>

                        <div>
                          <strong>
                            {gpuPowerEnvelope.powerRetentionPercent !== undefined
                              ? `${format(
                                  gpuPowerEnvelope.powerRetentionPercent,
                                  1,
                                )}%`
                              : 'Unknown'}
                          </strong>
                          <span>GPU power-envelope retention</span>
                        </div>

                        <div>
                          <strong>
                            {gpuPowerEnvelope.thermallyPowerLimited === undefined
                              ? 'Unknown'
                              : gpuPowerEnvelope.thermallyPowerLimited
                                ? 'Power-limited'
                                : 'Peak power sustainable'}
                          </strong>
                          <span>GPU thermal power state</span>
                        </div>
                      </div>

                      <p className="il-help">
                        {GPU_POWER_ENVELOPE_VERSION} ·{' '}
                        {publicEvidenceText(gpuPowerEnvelope.note)}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}

              {gpuWorkloadResponse ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    GPU workload response · {GPU_WORKLOAD_RESPONSE_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {gpuWorkloadResponse.state.replaceAll(
                          '-',
                          ' ',
                        )}
                      </strong>
                      <span>Workload state</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.frameBudgetMs !== undefined
                          ? `${format(
                              gpuWorkloadResponse.frameBudgetMs,
                              2,
                            )} ms`
                          : 'Unknown'}
                      </strong>
                      <span>Frame-time budget</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.megapixelsPerSecond !== undefined
                          ? `${format(
                              gpuWorkloadResponse.megapixelsPerSecond,
                              1,
                            )} MP/s`
                          : 'Unknown'}
                      </strong>
                      <span>Pixel throughput demand</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.theoreticalBandwidthBytesPerRenderedPixel !==
                        undefined
                          ? `${format(
                              gpuWorkloadResponse.theoreticalBandwidthBytesPerRenderedPixel,
                              1,
                            )} B/pixel`
                          : 'Unknown'}
                      </strong>
                      <span>Theoretical bandwidth budget</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.structuralComputeIndexPerWeightedMegapixelPerSecond !==
                        undefined
                          ? format(
                              gpuWorkloadResponse.structuralComputeIndexPerWeightedMegapixelPerSecond,
                              3,
                            )
                          : 'Unknown'}
                      </strong>
                      <span>Structural compute / demand</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.estimatedRequiredMemoryBandwidthGbps !==
                        undefined
                          ? `${format(
                              gpuWorkloadResponse.estimatedRequiredMemoryBandwidthGbps,
                              1,
                            )} GB/s`
                          : 'Unknown'}
                      </strong>
                      <span>Estimated memory bandwidth demand</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.memoryBandwidthHeadroomGbps !==
                        undefined
                          ? `${format(
                              gpuWorkloadResponse.memoryBandwidthHeadroomGbps,
                              1,
                            )} GB/s`
                          : 'Unknown'}
                      </strong>
                      <span>Memory bandwidth headroom</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.memoryBandwidthPressure}
                      </strong>
                      <span>Memory bandwidth pressure</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.powerPressure}
                      </strong>
                      <span>Power pressure</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.architectureCoverage.replaceAll(
                          '-',
                          ' ',
                        )}
                      </strong>
                      <span>GPU architecture coverage</span>
                    </div>

                    <div>
                      <strong>
                        {gpuWorkloadResponse.megaRaysPerSecondDemand !== undefined
                          ? `${format(
                              gpuWorkloadResponse.megaRaysPerSecondDemand,
                              1,
                            )} Mray/s`
                          : 'Unknown'}
                      </strong>
                      <span>RT ray demand</span>
                    </div>
                  </div>

                  {gamingDisplayEnvelope ? (
                    <>
                      <div className="il-metrics">
                        <div>
                          <strong>
                            {gamingDisplayEnvelope.visibleFrameRateCeilingFps !==
                            undefined
                              ? `${format(
                                  gamingDisplayEnvelope.visibleFrameRateCeilingFps,
                                  0,
                                )} FPS`
                              : 'Unknown'}
                          </strong>
                          <span>Visible frame-rate ceiling</span>
                        </div>

                        <div>
                          <strong>
                            {gamingDisplayEnvelope.refreshHeadroomFps !==
                            undefined
                              ? `${format(
                                  gamingDisplayEnvelope.refreshHeadroomFps,
                                  0,
                                )} FPS`
                              : 'Unknown'}
                          </strong>
                          <span>Display refresh headroom</span>
                        </div>

                        <div>
                          <strong>
                            {gamingDisplayEnvelope.targetExceedsPanelMaximum ===
                            undefined
                              ? 'Unknown'
                              : gamingDisplayEnvelope.targetExceedsPanelMaximum
                                ? 'Above panel max'
                                : 'Within panel max'}
                          </strong>
                          <span>Target vs display</span>
                        </div>
                      </div>

                      <p className="il-help">
                        {GAMING_DISPLAY_ENVELOPE_VERSION} ·{' '}
                        {publicEvidenceText(gamingDisplayEnvelope.note)}
                      </p>
                    </>
                  ) : null}

                  {gamingSessionEnvelope ? (
                    <>
                      <div className="il-metrics">
                        <div>
                          <strong>
                            {gamingSessionEnvelope.thermalState.replaceAll(
                              '-',
                              ' ',
                            )}
                          </strong>
                          <span>Gaming-session thermal state</span>
                        </div>

                        <div>
                          <strong>
                            {gamingSessionEnvelope.minutesBeforeThrottle !==
                            undefined
                              ? `${format(
                                  gamingSessionEnvelope.minutesBeforeThrottle,
                                  1,
                                )} min`
                              : 'Unknown'}
                          </strong>
                          <span>Time before throttle</span>
                        </div>

                        <div>
                          <strong>
                            {gamingSessionEnvelope.percentOfSessionBeforeThrottle !==
                            undefined
                              ? `${format(
                                  gamingSessionEnvelope.percentOfSessionBeforeThrottle,
                                  1,
                                )}%`
                              : 'Unknown'}
                          </strong>
                          <span>Session before throttle</span>
                        </div>
                      </div>

                      <p className="il-help">
                        {GAMING_SESSION_ENVELOPE_VERSION} ·{' '}
                        {publicEvidenceText(gamingSessionEnvelope.note)}
                      </p>
                    </>
                  ) : null}

                  {gpuWorkloadDemand ? (
                    <p className="il-help">
                      {GPU_WORKLOAD_DEMAND_VERSION} ·{' '}
                      {publicEvidenceText(gpuWorkloadDemand.note)}
                    </p>
                  ) : null}

                  <p className="il-help">
                    {publicEvidenceText(gpuWorkloadResponse.note)}
                  </p>

                  {gpuWorkloadResponse.bottleneckSignals.map(
                    (signal) => (
                      <p className="il-help" key={signal}>
                        {signal}
                      </p>
                    ),
                  )}
                </div>
              ) : null}

              {performanceContext ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Performance interpretation · {PERFORMANCE_CONTEXT_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {performanceContext.scoreDisposition.replaceAll(
                          '-',
                          ' ',
                        )}
                      </strong>
                      <span>Peak score provenance</span>
                    </div>

                    <div>
                      <strong>
                        {performanceContext.benchmarkRelevance.replaceAll(
                          '-',
                          ' ',
                        )}
                      </strong>
                      <span>Benchmark domain</span>
                    </div>

                    <div>
                      <strong>
                        {performanceContext.architectureCanExplainDirection
                          ? 'Relevant context'
                          : 'Not predictive'}
                      </strong>
                      <span>Architecture relevance</span>
                    </div>

                    <div>
                      <strong>
                        {performanceContext.architectureSignals.length}
                      </strong>
                      <span>Structural signals available</span>
                    </div>
                  </div>

                  <p className="il-help">
                    {publicEvidenceText(performanceContext.note)}
                  </p>

                  {performanceContext.warnings.map(
                    (warning) => (
                      <p
                        className="il-help"
                        key={warning}
                      >
                        {warning}
                      </p>
                    ),
                  )}
                </div>
              ) : null}

              {sustainedBenchmarkEnvelope ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Sustained benchmark envelope ·{' '}
                    {SUSTAINED_BENCHMARK_ENVELOPE_VERSION}
                  </span>

                  {sustainedBenchmarkEnvelope.status ===
                  'resolved' ? (
                    <>
                      <div className="il-metrics">
                        <div>
                          <strong>
                            {sustainedBenchmarkEnvelope.peakScore !==
                            undefined
                              ? format(
                                  sustainedBenchmarkEnvelope.peakScore,
                                  0,
                                )
                              : 'Unknown'}
                          </strong>
                          <span>Exact-family measured peak</span>
                        </div>

                        <div>
                          <strong>
                            {sustainedBenchmarkEnvelope.sustainedRetentionPercent !==
                            undefined
                              ? `${format(
                                  sustainedBenchmarkEnvelope.sustainedRetentionPercent,
                                  1,
                                )}%`
                              : 'Unknown'}
                          </strong>
                          <span>Sustained retention</span>
                        </div>

                        <div>
                          <strong>
                            {sustainedBenchmarkEnvelope.derivedSustainedScore !==
                            undefined
                              ? format(
                                  sustainedBenchmarkEnvelope.derivedSustainedScore,
                                  0,
                                )
                              : 'Unknown'}
                          </strong>
                          <span>Derived sustained WLE-family score</span>
                        </div>

                        <div>
                          <strong>
                            {sustainedBenchmarkEnvelope.derivedMinScore !==
                              undefined &&
                            sustainedBenchmarkEnvelope.derivedMaxScore !==
                              undefined
                              ? `${format(
                                  sustainedBenchmarkEnvelope.derivedMinScore,
                                  0,
                                )}–${format(
                                  sustainedBenchmarkEnvelope.derivedMaxScore,
                                  0,
                                )}`
                              : 'Unknown'}
                          </strong>
                          <span>Measured peak-range envelope</span>
                        </div>
                      </div>

                      <p className="il-help">
                        {publicEvidenceText(sustainedBenchmarkEnvelope.note)}
                      </p>
                    </>
                  ) : (
                    <div className="il-empty">
                      <p>
                        {sustainedBenchmarkEnvelope.reason}
                      </p>
                      <p className="il-help">
                        {publicEvidenceText(sustainedBenchmarkEnvelope.note)}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {connectivityWorkload ? (
                <div className="il-result-group">
                  <span className="il-result-label">
                    Connectivity · {CONNECTIVITY_WORKLOAD_VERSION}
                  </span>

                  <div className="il-metrics">
                    <div>
                      <strong>
                        {connectivityWorkload.mode.replaceAll(
                          '-',
                          ' ',
                        )}
                      </strong>
                      <span>Network mode</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.aggregateTrafficMbps !==
                        undefined
                          ? `${format(
                              connectivityWorkload.aggregateTrafficMbps,
                              1,
                            )} Mbps`
                          : 'Unknown'}
                      </strong>
                      <span>Aggregate traffic</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.throughputUtilizationPercent !==
                        undefined
                          ? `${format(
                              connectivityWorkload.throughputUtilizationPercent,
                              1,
                            )}%`
                          : 'Unknown'}
                      </strong>
                      <span>Link utilization</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.totalTransferredDataGb !==
                        undefined
                          ? `${format(
                              connectivityWorkload.totalTransferredDataGb,
                              2,
                            )} GB`
                          : 'Unknown'}
                      </strong>
                      <span>Transferred data</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.effectiveRadioPowerW !==
                        undefined
                          ? `${format(
                              connectivityWorkload.effectiveRadioPowerW,
                              2,
                            )} W`
                          : 'Unknown'}
                      </strong>
                      <span>Effective radio power</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.radioEnergyWh !==
                        undefined
                          ? `${format(
                              connectivityWorkload.radioEnergyWh,
                              2,
                            )} Wh`
                          : 'Unknown'}
                      </strong>
                      <span>Radio session energy</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityBatteryPercent !==
                        undefined
                          ? `${format(
                              connectivityBatteryPercent,
                              1,
                            )}%`
                          : 'Unknown'}
                      </strong>
                      <span>Known battery-energy share</span>
                    </div>

                    <div>
                      <strong>
                        {connectivityWorkload.signalMetricValue !==
                        undefined
                          ? `${format(
                              connectivityWorkload.signalMetricValue,
                              1,
                            )}`
                          : 'Unknown'}
                      </strong>
                      <span>
                        {connectivityWorkload.signalMetricLabel ??
                          'Signal metadata'}
                      </span>
                    </div>
                  </div>

                  <p className="il-help">
                    {publicEvidenceText(connectivityWorkload.note)}
                  </p>
                </div>
              ) : null}

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
                      {publicEvidenceText(thermalResult.note)}
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
                          {publicEvidenceText(cameraZoomHandoff.note)}
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

                    {cameraVideoWorkloads[index] ? (
                      <div className="il-camera-evidence">
                        <span className="il-result-label">
                          Video workload · {CAMERA_VIDEO_WORKLOAD_VERSION}
                        </span>

                        <div className="il-metrics">
                          <div>
                            <strong>
                              {cameraVideoWorkloads[index]
                                ?.megapixelsPerSecond !==
                              undefined
                                ? `${format(
                                    cameraVideoWorkloads[index]
                                      ?.megapixelsPerSecond,
                                    1,
                                  )} MP/s`
                                : 'Unknown'}
                            </strong>
                            <span>Sensor/video pixel throughput</span>
                          </div>

                          <div>
                            <strong>
                              {cameraVideoWorkloads[index]
                                ?.uncompressedDataRateGbps !==
                              undefined
                                ? `${format(
                                    cameraVideoWorkloads[index]
                                      ?.uncompressedDataRateGbps,
                                    2,
                                  )} Gbps`
                                : 'Unknown'}
                            </strong>
                            <span>Uncompressed video data rate</span>
                          </div>

                          <div>
                            <strong>
                              {cameraVideoWorkloads[index]
                                ?.compressionRatioVsRaw !==
                              undefined
                                ? `${format(
                                    cameraVideoWorkloads[index]
                                      ?.compressionRatioVsRaw,
                                    1,
                                  )}×`
                                : 'Unknown'}
                            </strong>
                            <span>Raw-to-encoded ratio</span>
                          </div>

                          <div>
                            <strong>
                              {cameraVideoWorkloads[index]
                                ?.estimatedFileSizeGb !==
                              undefined
                                ? `${format(
                                    cameraVideoWorkloads[index]
                                      ?.estimatedFileSizeGb,
                                    2,
                                  )} GB`
                                : 'Unknown'}
                            </strong>
                            <span>Recording file size</span>
                          </div>

                          <div>
                            <strong>
                              {cameraVideoWorkloads[index]
                                ?.estimatedPipelineEnergyWh !==
                              undefined
                                ? `${format(
                                    cameraVideoWorkloads[index]
                                      ?.estimatedPipelineEnergyWh,
                                    2,
                                  )} Wh`
                                : 'Unknown'}
                            </strong>
                            <span>Camera pipeline energy</span>
                          </div>
                        </div>

                        {cameraVideoThermals[index]?.status ===
                        'resolved' ? (
                          <>
                            <div className="il-metrics">
                              <div>
                                <strong>
                                  {cameraVideoThermals[index]
                                    ?.steadyStateTemperatureC !==
                                  undefined
                                    ? `${format(
                                        cameraVideoThermals[index]
                                          ?.steadyStateTemperatureC,
                                        1,
                                      )} °C`
                                    : 'Unknown'}
                                </strong>
                                <span>Video thermal steady state</span>
                              </div>

                              <div>
                                <strong>
                                  {cameraVideoThermals[index]
                                    ?.thermalLimitMinutes !==
                                  undefined
                                    ? `${format(
                                        cameraVideoThermals[index]
                                          ?.thermalLimitMinutes,
                                        1,
                                      )} min`
                                    : cameraVideoThermals[index]
                                          ?.noThermalLimitAtConstantPower
                                      ? 'Not reached'
                                      : 'Unknown'}
                                </strong>
                                <span>Time to thermal ceiling</span>
                              </div>

                              <div>
                                <strong>
                                  {cameraVideoThermals[index]
                                    ?.temperatureAtRequestedDurationC !==
                                  undefined
                                    ? `${format(
                                        cameraVideoThermals[index]
                                          ?.temperatureAtRequestedDurationC,
                                        1,
                                      )} °C`
                                    : 'Unknown'}
                                </strong>
                                <span>Temperature at requested duration</span>
                              </div>

                              <div>
                                <strong>
                                  {cameraVideoThermals[index]
                                    ?.thermalLimitWithinRequestedDuration ===
                                  undefined
                                    ? 'Unknown'
                                    : cameraVideoThermals[index]
                                        ?.thermalLimitWithinRequestedDuration
                                      ? 'Ceiling crossed'
                                      : 'Below ceiling'}
                                </strong>
                                <span>Recording thermal state</span>
                              </div>
                            </div>

                            <p className="il-help">
                              {CAMERA_VIDEO_THERMAL_VERSION} ·{' '}
                              {cameraVideoThermals[index]?.note}
                            </p>
                          </>
                        ) : cameraVideoThermals[index] ? (
                          <p className="il-help">
                            Video thermal limit unresolved:{' '}
                            {cameraVideoThermals[index]
                              ?.unresolvedReason}
                          </p>
                        ) : null}

                        <p className="il-help">
                          {cameraVideoWorkloads[index]?.note}
                        </p>
                      </div>
                    ) : null}

                    {cameraSensorNoise[index] ? (
                      <div className="il-camera-evidence">
                        <span className="il-result-label">
                          Sensor electronics · {CAMERA_SENSOR_NOISE_VERSION}
                        </span>

                        <div className="il-metrics">
                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.dynamicRangeStops !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.dynamicRangeStops,
                                    2,
                                  )} stops`
                                : 'Unknown'}
                            </strong>
                            <span>Electron-domain dynamic range</span>
                          </div>

                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.dynamicRangeDb !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.dynamicRangeDb,
                                    1,
                                  )} dB`
                                : 'Unknown'}
                            </strong>
                            <span>Dynamic range</span>
                          </div>

                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.effectiveNoiseFloorElectrons !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.effectiveNoiseFloorElectrons,
                                    2,
                                  )} e⁻`
                                : 'Unknown'}
                            </strong>
                            <span>Effective noise floor</span>
                          </div>

                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.signalToNoiseRatio !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.signalToNoiseRatio,
                                    1,
                                  )}:1`
                                : 'Unknown'}
                            </strong>
                            <span>Signal-to-noise ratio</span>
                          </div>

                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.signalToNoiseDb !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.signalToNoiseDb,
                                    1,
                                  )} dB`
                                : 'Unknown'}
                            </strong>
                            <span>Signal-to-noise</span>
                          </div>

                          <div>
                            <strong>
                              {cameraSensorNoise[index]
                                ?.saturationFraction !==
                              undefined
                                ? `${format(
                                    cameraSensorNoise[index]
                                      ?.saturationFraction *
                                      100,
                                    1,
                                  )}%`
                                : 'Unknown'}
                            </strong>
                            <span>Full-well utilization</span>
                          </div>
                        </div>

                        <p className="il-help">
                          {cameraSensorNoise[index]?.note}
                        </p>
                      </div>
                    ) : null}

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

              </>
              )}
              {simulationInput && (
                <DeterministicShareCard input={simulationInput} result={result} mode={workspaceMode} usage={usagePreset} activeUseHours={workspaceMode === 'simple' ? batteryExperience?.mixedUse?.expectedActiveUseHoursPerCharge : undefined} chargeMinutes={chargingResult?.status === 'resolved' ? chargingResult.estimate?.timeTo100Minutes?.expected : undefined} />
              )}

              {workspaceMode === 'advanced' && result.warnings.length > 0 && (
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
                  {workspaceMode === 'simple'
                    ? 'This is an illustrative estimate, not a guaranteed real-world result. Unknown measurements remain unknown.'
                    : `This result uses supplied values and supported calculations from PhoneFuturist Engine v${SIMULATION_ENGINE_VERSION}. Unknown inputs are not treated as measured facts.`}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}