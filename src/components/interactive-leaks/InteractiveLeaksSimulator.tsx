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
  const battery = result?.battery;
  const packaging = result?.packaging;

  const chargingWatts = numeric(form.wiredChargeW);
  const wirelessChargingWatts = numeric(form.wirelessChargeW);

  const batteryExperience =
    simulationInput && result
      ? simulateLiveBatteryExperience({
          simulation: simulationInput,
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

  const knownCameraVolumeMm3 =
    result?.cameras
      ?.map((camera) => camera.moduleVolumeMm3)
      .filter(
        (volume): volume is number =>
          volume !== undefined,
      )
      .reduce((total, volume) => total + volume, 0);

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
            <div className="il-section-heading il-section-heading-action">
              <div className="il-heading-copy">
                <span>05</span>
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
              <span>06</span>
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

                    <p className="il-help">
                      Runtime uses protocol-isolated released-device evidence.
                      Camera-use runtime remains excluded until isolated camera
                      battery measurements are available.
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
                  Camera system
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
                </div>
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