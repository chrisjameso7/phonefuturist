import { useMemo, useState } from 'react';

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
  LIVE_DISPLAY_EXPERIENCE_VERSION,
  simulateLiveDisplayExperience,
} from '../../lib/simulation/live-display-experience';

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
  resolutionMp: string;
  equivalentFocalLengthMm: string;
  physicalFocalLengthMm: string;
  apertureFNumber: string;
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
  brightnessNits: string;
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
  wiredChargeW: string;
  wirelessChargeW: string;
  batteryChemistry: string;
  cellArchitecture: 'unknown' | 'single-cell' | 'dual-cell';
  chargingStandard: string;
  wirelessChargingStandard: string;

  socVendor: string;
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
  targetSocPowerW: string;
  ambientTemperatureC: string;
  thermalResistanceCPerW: string;
  thermalMassJPerC: string;
  throttleTemperatureC: string;
  thermalDurationSeconds: string;

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
  brightnessNits: '',
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
  wiredChargeW: '',
  wirelessChargeW: '',
  batteryChemistry: '',
  cellArchitecture: 'unknown',
  chargingStandard: '',
  wirelessChargingStandard: '',

  socVendor: '',
  coolingClass: 'unknown',
  thermalDomain: 'gpu_sustained',
  targetSocPowerW: '',
  ambientTemperatureC: '',
  thermalResistanceCPerW: '',
  thermalMassJPerC: '',
  throttleTemperatureC: '',
  thermalDurationSeconds: '',

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
  brightnessNits: '1000',
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
  wiredChargeW: '60',
  wirelessChargeW: '25',
  batteryChemistry: 'silicon-carbon',
  cellArchitecture: 'single-cell',
  chargingStandard: 'USB PD/PPS',
  wirelessChargingStandard: 'Qi2',

  socVendor: 'Qualcomm',
  coolingClass: 'large-vapor-chamber',
  thermalDomain: 'gpu_sustained',
  targetSocPowerW: '10',
  ambientTemperatureC: '25',
  thermalResistanceCPerW: '3',
  thermalMassJPerC: '45',
  throttleTemperatureC: '42',
  thermalDurationSeconds: '600',

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
    resolutionMp: '50',
    equivalentFocalLengthMm: '24',
    physicalFocalLengthMm: '6.5',
    apertureFNumber: '1.6',
    moduleWidthMm: '20',
    moduleHeightMm: '20',
    moduleDepthMm: '6',
  },
  {
    id: 2,
    type: 'periscope',
    sensorFormatDenominator: '2.5',
    resolutionMp: '50',
    equivalentFocalLengthMm: '120',
    physicalFocalLengthMm: '20',
    apertureFNumber: '2.8',
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
    resolutionMp: '',
    equivalentFocalLengthMm: '',
    physicalFocalLengthMm: '',
    apertureFNumber: '',
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

  function simulate() {
    setSimulationInput(buildInput());
    setHasSimulated(true);
  }

  function loadExample() {
    setForm(flagshipExample);
    setCameras(flagshipCameras);
    setSimulationInput(null);
    setHasSimulated(false);
  }

  function clearSimulation() {
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
          brightnessNits: numeric(form.brightnessNits),
          panelTechnology:
            form.panelTechnology.trim() || undefined,
        })
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

      <div className="il-workspace">
        <section
          className="il-builder"
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
                label="Throttle ceiling"
                suffix="°C"
                value={form.throttleTemperatureC}
                placeholder="42"
                onChange={(value) =>
                  update('throttleTemperatureC', value)
                }
              />
            </div>

            <details className="il-advanced">
              <summary>Advanced thermal model</summary>

              <p className="il-help">
                Thermal resistance and thermal mass are physical model inputs.
                Leave them blank rather than guessing if they are unknown.
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
                  label="Test duration"
                  suffix="s"
                  value={form.thermalDurationSeconds}
                  placeholder="600"
                  onChange={(value) =>
                    update('thermalDurationSeconds', value)
                  }
                />
              </div>
            </details>

            <p className="il-help">
              Comparable measured sustained-performance evidence is used when
              available. Otherwise the simulator falls back to the deterministic
              first-order thermal model and labels that result accordingly.
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
                    </div>

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
                      {displayExperience.note}
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
                            batteryExperience.mixedUse.minDaysPerCharge *
                              batteryExperience.mixedUse.activeHoursPerDay,
                            1,
                          )}
                          –
                          {format(
                            batteryExperience.mixedUse.maxDaysPerCharge *
                              batteryExperience.mixedUse.activeHoursPerDay,
                            1,
                          )} h
                        </strong>
                        <span>Total active-use hours per charge</span>
                      </div>

                      <div>
                        <strong>
                          {format(
                            batteryExperience.mixedUse.expectedDaysPerCharge *
                              batteryExperience.mixedUse.activeHoursPerDay,
                            1,
                          )} h
                        </strong>
                        <span>Expected total active-use hours</span>
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
                          {format(
                            batteryExperience.mixedUse.expectedDrainMahPerDay,
                            0,
                          )}
                        </strong>
                        <span>Expected active drain mAh/day</span>
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
                              {format(
                                workload.expectedDrainMahPerHour,
                                0,
                              )} mAh/h
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
                                measured refs
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
                          {chargingResult.estimate.normalized
                            ?.expectedMinutesPer1000Mah !== undefined
                            ? `${format(
                                chargingResult.estimate.normalized
                                  .expectedMinutesPer1000Mah,
                                1,
                              )} min`
                            : 'Unknown'}
                        </strong>
                        <span>Per 1,000 mAh</span>
                      </div>
                    </div>

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
                        <span>Peak temperature</span>
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
                        <span>End temperature</span>
                      </div>

                      <div>
                        <strong>
                          {thermalResult.sustainedPerformancePercent !== undefined
                            ? `${format(
                                thermalResult.sustainedPerformancePercent,
                                1,
                              )}%`
                            : 'Unknown'}
                        </strong>
                        <span>Sustained performance</span>
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
                        <span>Measured references</span>
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
                    </div>

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
                ) : (
                  <div className="il-empty">
                    {thermalResult?.unresolvedReason ??
                      'Add target SoC power, ambient temperature, throttle ceiling, thermal resistance and thermal mass to simulate sustained performance.'}
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
                          {format(camera.approximateSensorAreaMm2, 1)}
                        </strong>
                        <span>Approx. sensor area mm²</span>
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