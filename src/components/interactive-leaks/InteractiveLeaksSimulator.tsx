import { useReducer, useState } from 'react';

import {
  ACTIVE_WORKLOADS,
  INITIAL_EXPERIENCE,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  POWER_EVIDENCE_VERSION,
  USAGE_PRESETS,
  USAGE_VERSION,
  deriveUsage,
  experienceReducer,
  freezeRun,
  simpleEndurance,
  simpleEnduranceHeadline,
  simpleProfile,
  type AlphaRun,
  type UsagePreset,
} from '../../lib/simulation/alpha-workspace';

import {
  evidenceDeviceFrom,
  resolvePowerEvidence,
  simpleEvidenceConfidence,
  workloadEvidence,
} from '../../lib/simulation/power-evidence';

import {
  runtimeText,
  receiptSections,
} from '../../lib/simulation/result-export';

import {
  COMPONENT_WORKLOADS,
  INVALID_NUMBER,
  WORKLOAD_LABEL,
  buildProfile,
  captureNumericValue,
  captureValue,
  numeric,
  numericIssues,
  runWorkspace,
  type ProfileMode,
} from '../../lib/simulation/beta-workspace';

import { SIMULATION_ENGINE_VERSION } from '../../lib/simulation/engine';

import {
  BATTERY_EXPERIENCE_VERSION,
  type BatteryExperienceWorkload,
} from '../../lib/simulation/modules/battery-experience';

import type {
  DeviceFormFactor,
  SimulationInput,
} from '../../lib/simulation/types';

import type {
  BatteryInferenceEnvelope,
  SimpleBatteryScenario,
} from '../../lib/simulation/inference';

import type {
  CameraInput,
  CameraModuleType,
} from '../../lib/simulation/modules/camera';

import ShareResult from './ShareResult';

type NumericFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  suffix?: string;
  step?: string;
  onChange: (value: string) => void;
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

type SimpleInferenceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      envelope: BatteryInferenceEnvelope;
    }
  | {
      status: 'insufficient_evidence';
      envelope: BatteryInferenceEnvelope;
    }
  | {
      status: 'error';
      message: string;
    };

type BatteryInferenceApiResponse =
  | {
      status: 'ready' | 'insufficient_evidence';
      envelope: BatteryInferenceEnvelope;
    }
  | {
      status?: string;
      error?: string;
      message?: string;
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

const initialWorkloadInputs: Record<
  BatteryExperienceWorkload,
  string
> = {
  mixed_use: '',
  web_browsing: '',
  video_playback: '',
  gaming: '',
  camera_use: '',
  standby: '',
};

function format(
  value: number | undefined,
  digits = 1,
): string {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 'Unknown';
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function wattsLabel(
  power:
    | {
        min?: number;
        max?: number;
      }
    | undefined,
): string {
  if (!power) return 'Unknown';

  if (
    power.min !== undefined &&
    power.max !== undefined
  ) {
    if (
      Math.abs(power.max - power.min) <
      1e-9
    ) {
      return `${format(power.min, 2)} W`;
    }

    return `${format(power.min, 2)}–${format(
      power.max,
      2,
    )} W`;
  }

  if (power.min !== undefined) {
    return `${format(power.min, 2)}+ W`;
  }

  if (power.max !== undefined) {
    return `up to ${format(
      power.max,
      2,
    )} W`;
  }

  return 'Unknown';
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
        {suffix ? (
          <small>{suffix}</small>
        ) : null}
      </span>

      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={
          value === INVALID_NUMBER
            ? ''
            : value
        }
        aria-invalid={
          value === INVALID_NUMBER ||
          (numeric(value) ?? 0) < 0
        }
        placeholder={placeholder}
        onChange={captureNumericValue(
          onChange,
        )}
      />

      <small className="il-input-state">
        {value === INVALID_NUMBER
          ? 'Incomplete number'
          : value.trim()
            ? 'User supplied · unverified'
            : 'Unknown'}
      </small>
    </label>
  );
}

function SectionHeading({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="il-section-heading">
      <span className="il-index">
        {index}
      </span>

      <div className="il-heading-copy">
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

function emptyCamera(
  id: number,
): CameraDraft {
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
    resolutionMp: numeric(
      camera.resolutionMp,
    ),
    equivalentFocalLengthMm: numeric(
      camera.equivalentFocalLengthMm,
    ),
    physicalFocalLengthMm: numeric(
      camera.physicalFocalLengthMm,
    ),
    apertureFNumber: numeric(
      camera.apertureFNumber,
    ),
    moduleWidthMm: numeric(
      camera.moduleWidthMm,
    ),
    moduleHeightMm: numeric(
      camera.moduleHeightMm,
    ),
    moduleDepthMm: numeric(
      camera.moduleDepthMm,
    ),
  };
}

export default function InteractiveLeaksSimulator() {
  const [form, setForm] =
    useState<FormState>(
      initialForm,
    );

  const [cameras, setCameras] =
    useState<CameraDraft[]>([]);

  const [
    workloadPower,
    setWorkloadPower,
  ] = useState<
    Record<
      BatteryExperienceWorkload,
      string
    >
  >(initialWorkloadInputs);

  const [
    workloadWeights,
    setWorkloadWeights,
  ] = useState<
    Record<
      BatteryExperienceWorkload,
      string
    >
  >(initialWorkloadInputs);

  const [
    usablePercent,
    setUsablePercent,
  ] = useState('');

  const [
    profileMode,
    setProfileMode,
  ] =
    useState<ProfileMode>('equal');

  const [
    hasSimulated,
    setHasSimulated,
  ] = useState(false);

  const [dirty, setDirty] =
    useState(false);

  const [
    exampleLoaded,
    setExampleLoaded,
  ] = useState(false);

  const [run, setRun] =
    useState<AlphaRun | null>(
      null,
    );

  const [
    simpleInference,
    setSimpleInference,
  ] =
    useState<SimpleInferenceState>({
      status: 'idle',
    });

  const [
    experience,
    dispatchExperience,
  ] = useReducer(
    experienceReducer,
    INITIAL_EXPERIENCE,
  );

  const simple =
    experience.mode === 'simple';

  const usage =
    experience.preset === 'Custom'
      ? experience.custom
      : USAGE_PRESETS[
          experience.preset
        ];

  const usageBreakdown =
    deriveUsage(usage);

  function buildInput(): SimulationInput {
    const componentVolumes = {
      thermalMm3: numeric(
        form.thermalMm3,
      ),
      boardMm3: numeric(
        form.boardMm3,
      ),
      speakersMm3: numeric(
        form.speakersMm3,
      ),
      otherMm3: numeric(
        form.otherMm3,
      ),
    };

    const hasComponentVolume =
      Object.values(
        componentVolumes,
      ).some(
        (value) =>
          value !== undefined,
      );

    const hasPackaging =
      form.reservedVolumePercent.trim() !==
        '' || hasComponentVolume;

    const hasBattery = [
      form.batteryCapacityMah,
      form.batteryVoltageV,
      form.batteryWidthMm,
      form.batteryHeightMm,
      form.batteryThicknessMm,
      form.batteryWeightG,
    ].some(
      (value) =>
        value.trim() !== '',
    );

    return {
      formFactor:
        form.formFactor,

      ...(form.name.trim()
        ? {
            name: form.name.trim(),
          }
        : {}),

      dimensions: {
        widthMm: numeric(
          form.widthMm,
        ),
        heightMm: numeric(
          form.heightMm,
        ),
        thicknessMm: numeric(
          form.thicknessMm,
        ),
        weightG: numeric(
          form.weightG,
        ),
      },

      displays: {
        primary: {
          diagonalInches: numeric(
            form.diagonalInches,
          ),
          resolutionWidthPx:
            numeric(
              form.resolutionWidthPx,
            ),
          resolutionHeightPx:
            numeric(
              form.resolutionHeightPx,
            ),
          aspectWidth: numeric(
            form.aspectWidth,
          ),
          aspectHeight: numeric(
            form.aspectHeight,
          ),
          bezelTopMm: numeric(
            form.bezelTopMm,
          ),
          bezelRightMm: numeric(
            form.bezelRightMm,
          ),
          bezelBottomMm: numeric(
            form.bezelBottomMm,
          ),
          bezelLeftMm: numeric(
            form.bezelLeftMm,
          ),
        },
      },

      ...(hasBattery
        ? {
            battery: {
              cells: [
                {
                  capacityMah:
                    numeric(
                      form.batteryCapacityMah,
                    ),
                  nominalVoltageV:
                    numeric(
                      form.batteryVoltageV,
                    ),
                  widthMm:
                    numeric(
                      form.batteryWidthMm,
                    ),
                  heightMm:
                    numeric(
                      form.batteryHeightMm,
                    ),
                  thicknessMm:
                    numeric(
                      form.batteryThicknessMm,
                    ),
                  weightG:
                    numeric(
                      form.batteryWeightG,
                    ),
                },
              ],
            },
          }
        : {}),

      ...(cameras.length
        ? {
            cameras:
              cameras.map(
                cameraInput,
              ),
          }
        : {}),

      ...(hasPackaging
        ? {
            packaging: {
              reservedVolumePercent:
                numeric(
                  form.reservedVolumePercent,
                ),

              ...(hasComponentVolume
                ? {
                    componentVolumes,
                  }
                : {}),
            },
          }
        : {}),
    };
  }

  const evidenceDevice =
    evidenceDeviceFrom(
      buildInput(),
    );

  const evidence =
    simple &&
    !experience.useEnteredPower
      ? resolvePowerEvidence(
          evidenceDevice,
        )
      : undefined;

  const profile = simple
    ? simpleProfile(
        experience,
        workloadPower,
        evidenceDevice,
      )
    : buildProfile(
        workloadPower,
        workloadWeights,
        profileMode,
      );

  const endurancePreview =
    simple &&
    !experience.useEnteredPower
      ? simpleEndurance(
          experience,
          evidenceDevice.energyWh,
          evidenceDevice,
        )
      : undefined;

  const [receiptGeneratedAt, setReceiptGeneratedAt] = useState('');

  const enduranceHeadline =
    simpleEnduranceHeadline(
      run?.endurance,
    );

  const evidenceConfidence =
    run?.endurance &&
    run.evidence
      ? simpleEvidenceConfidence(
          run.evidence,
          run.endurance,
        ).level
      : undefined;

  const simulationInput =
    run?.input;

  const result =
    run?.device;

  const battery =
    run?.battery;

  const estimate =
    battery?.result.status ===
    'resolved'
      ? battery.result.estimate
      : undefined;

  const display =
    result?.displays.primary;

  const pack =
    result?.battery;

  const packaging =
    result?.packaging;

  function changeExperience(
    action: Parameters<
      typeof experienceReducer
    >[1],
  ) {
    dispatchExperience(action);

    setSimpleInference({
      status: 'idle',
    });

    setDirty(true);
  }

  function update<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
  ) {
    setSimpleInference({
      status: 'idle',
    });

    setDirty(true);

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCamera(
    id: number,
    patch: Partial<CameraDraft>,
  ) {
    setDirty(true);

    setCameras((current) =>
      current.map((camera) =>
        camera.id === id
          ? {
              ...camera,
              ...patch,
            }
          : camera,
      ),
    );
  }

  function addCamera() {
    setDirty(true);

    setCameras((current) => [
      ...current,
      emptyCamera(
        current.length
          ? Math.max(
              ...current.map(
                (camera) =>
                  camera.id,
              ),
            ) + 1
          : 1,
      ),
    ]);
  }

  function removeCamera(
    id: number,
  ) {
    setDirty(true);

    setCameras((current) =>
      current.filter(
        (camera) =>
          camera.id !== id,
      ),
    );
  }

  async function simulate() {
    const {
      name: _name,
      formFactor: _formFactor,
      ...fields
    } = form;

    const issues =
      numericIssues(fields);

    cameras.forEach(
      (
        {
          id: _id,
          type: _type,
          ...cameraFields
        },
        index,
      ) => {
        issues.push(
          ...numericIssues(
            cameraFields,
            `Camera ${
              index + 1
            } — `,
          ),
        );
      },
    );

    const built =
      buildInput();

    if (
      simple &&
      !experience.useEnteredPower
    ) {
      const capacityMah =
        numeric(
          form.batteryCapacityMah,
        );

      if (
        capacityMah ===
          undefined ||
        capacityMah <= 0
      ) {
        setSimpleInference({
          status: 'error',
          message:
            'Enter a positive rated battery capacity before running Simple Mode.',
        });

        setRun(null);
        setHasSimulated(true);
        setDirty(false);
        return;
      }

      if (issues.length) {
        setSimpleInference({
          status: 'error',
          message:
            issues[0] ??
            'Check the entered values and try again.',
        });

        setRun(null);
        setHasSimulated(true);
        setDirty(false);
        return;
      }

      const activeMinutes =
        usageBreakdown.activeMinutes >
        0
          ? usageBreakdown.activeMinutes
          : 1;

      const workload = {
        webSocialPercent:
          (Number(
            usage.web_browsing,
          ) /
            activeMinutes) *
          100,

        videoPercent:
          (Number(
            usage.video_playback,
          ) /
            activeMinutes) *
          100,

        gamingPercent:
          (Number(
            usage.gaming,
          ) /
            activeMinutes) *
          100,

        cameraPercent:
          (Number(
            usage.camera_use,
          ) /
            activeMinutes) *
          100,

        idlePercent: 0,
      };

      const scenario: SimpleBatteryScenario =
        {
          deviceName:
            form.name.trim() ||
            undefined,

          usageProfile:
            experience.preset.toLowerCase() as SimpleBatteryScenario['usageProfile'],

          workload,
        };

      const device =
        evidenceDeviceFrom(
          built,
        );

      setSimpleInference({
        status: 'loading',
      });

      setRun(null);
      setHasSimulated(true);
      setDirty(false);

      try {
        const response =
          await fetch(
            '/api/simulation/battery-inference',
            {
              method: 'POST',

              headers: {
                'content-type':
                  'application/json',
              },

              body: JSON.stringify(
                {
                  scenario,

                  device: {
                    ...(form.name.trim()
                      ? {
                          name: form.name.trim(),
                        }
                      : {}),

                    ...(device.energyWh !==
                    undefined
                      ? {
                          energyWh:
                            device.energyWh,
                        }
                      : {}),

                    ...(device.displayAreaCm2 !==
                    undefined
                      ? {
                          displayAreaCm2:
                            device.displayAreaCm2,
                        }
                      : {}),
                  },
                },
              ),
            },
          );

        const payload =
          (await response.json()) as BatteryInferenceApiResponse;

        if (!response.ok) {
          const message =
            'error' in payload &&
            payload.error
              ? payload.error
              : 'Simple Mode could not complete this simulation.';

          setSimpleInference({
            status: 'error',
            message,
          });

          return;
        }

        if (
          'envelope' in
            payload &&
          payload.status ===
            'ready'
        ) {
          setSimpleInference({
            status: 'ready',
            envelope:
              payload.envelope,
          });

          return;
        }

        if (
          'envelope' in
            payload &&
          payload.status ===
            'insufficient_evidence'
        ) {
          setSimpleInference({
            status:
              'insufficient_evidence',
            envelope:
              payload.envelope,
          });

          return;
        }

        setSimpleInference({
          status: 'error',
          message:
            'Simple Mode received an unexpected response.',
        });
      } catch {
        setSimpleInference({
          status: 'error',
          message:
            'Simple Mode is temporarily unavailable. Your configuration has been preserved.',
        });
      } finally {
        requestAnimationFrame(
          () => {
            document
              .getElementById(
                'simulation-results',
              )
              ?.scrollIntoView({
                behavior:
                  'smooth',
                block: 'start',
              });
          },
        );
      }

      return;
    }

    setSimpleInference({
      status: 'idle',
    });

    const workspace =
      runWorkspace(
        built,
        usablePercent,
        profile,
        issues,
      );

    setReceiptGeneratedAt(new Date().toISOString());
    setRun(
      freezeRun(
        workspace,
        {
          mode:
            experience.mode,

          usageProfile:
            'Advanced',

          usageVersion:
            USAGE_VERSION,

          powerSource:
            'User supplied in Advanced; unverified',

          usablePercent,

          calibrationVersion:
            'None applied — seed observations are not fitted power coefficients',
        },
      ),
    );

    setHasSimulated(true);
    setDirty(false);

    requestAnimationFrame(
      () => {
        document
          .getElementById(
            'simulation-results',
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      },
    );
  }

  function loadExample() {
    dispatchExperience({
      type: 'mode',
      value: 'advanced',
    });

    setForm(
      flagshipExample,
    );

    setCameras([]);

    setWorkloadPower({
      ...initialWorkloadInputs,
      gaming: '6',
    });

    setWorkloadWeights(
      initialWorkloadInputs,
    );

    setUsablePercent('');

    setProfileMode(
      'equal',
    );

    setRun(null);

    setSimpleInference({
      status: 'idle',
    });

    setDirty(false);
    setHasSimulated(false);
    setExampleLoaded(true);
  }

  function clearSimulation() {
    dispatchExperience({
      type: 'reset',
    });

    setForm(initialForm);
    setCameras([]);

    setWorkloadPower(
      initialWorkloadInputs,
    );

    setWorkloadWeights(
      initialWorkloadInputs,
    );

    setUsablePercent('');

    setProfileMode(
      'equal',
    );

    setRun(null);

    setSimpleInference({
      status: 'idle',
    });

    setDirty(false);
    setHasSimulated(false);
    setExampleLoaded(false);
  }

  return (
    <div
      className={`il-app ${
        simple
          ? 'il-simple-mode'
          : 'il-advanced-mode'
      }`}
    >
      <div className="il-toolbar">
        <div className="il-toolbar-copy">
          <span className="il-status">
            Simulation Laboratory
          </span>

          <span className="il-engine">
            Engine v
            {SIMULATION_ENGINE_VERSION}{' '}
            · Battery{' '}
            {
              BATTERY_EXPERIENCE_VERSION
            }
          </span>
        </div>

        <div className="il-toolbar-actions">
          <button
            type="button"
            className="il-chip"
            onClick={loadExample}
          >
            Load example
          </button>

          <button
            type="button"
            className="il-chip"
            onClick={
              clearSimulation
            }
          >
            Clear
          </button>
        </div>
      </div>

      <div className="il-mode-switcher">
        <div>
          <strong>
            Simulation mode
          </strong>

          <span>
            {simple
              ? 'Fast configuration with evidence-backed assumptions.'
              : 'Direct engineering inputs and deterministic controls.'}
          </span>
        </div>

        <fieldset className="il-mode">
          <legend>
            Simulation mode
          </legend>

          {(
            [
              'simple',
              'advanced',
            ] as const
          ).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="simulation-mode"
                checked={
                  experience.mode ===
                  mode
                }
                onChange={() =>
                  changeExperience({
                    type: 'mode',
                    value: mode,
                  })
                }
              />

              <span>
                {mode ===
                'simple'
                  ? 'Simple'
                  : 'Advanced'}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      {exampleLoaded ? (
        <p className="il-input-note">
          Illustrative example
          only. These values do
          not represent a real
          device, leak or measured
          benchmark.
        </p>
      ) : null}

      <div className="il-workspace">
        <section
          className="il-builder"
          aria-label="Simulation configuration"
        >
          <div className="il-builder-intro">
            <div>
              <span className="il-kicker">
                Configuration
              </span>

              <h2>
                {simple
                  ? 'Build your device.'
                  : 'Define the engineering model.'}
              </h2>
            </div>

            <p>
              {simple
                ? 'Enter what you know. Unknown values stay unknown.'
                : 'Advanced Mode exposes the physical and power assumptions used by the deterministic engine.'}
            </p>
          </div>

          <div className="il-section il-config-card">
            <SectionHeading
              index="01"
              title="Device"
              hint={
                simple
                  ? 'The basics needed to identify the device and its battery.'
                  : 'Physical device envelope, battery and display configuration.'
              }
            />

            <div className="il-grid">
              <label className="il-field il-wide">
                <span>
                  Device name
                </span>

                <input
                  type="text"
                  maxLength={160}
                  value={
                    form.name
                  }
                  placeholder="Untitled device"
                  onChange={(
                    event,
                  ) =>
                    update(
                      'name',
                      event
                        .currentTarget
                        .value,
                    )
                  }
                />
              </label>

              <label className="il-field">
                <span>
                  Form factor
                </span>

                <select
                  value={
                    form.formFactor
                  }
                  onChange={(
                    event,
                  ) =>
                    update(
                      'formFactor',
                      event
                        .currentTarget
                        .value as DeviceFormFactor,
                    )
                  }
                >
                  <option value="phone">
                    Phone
                  </option>

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
                label="Rated battery"
                suffix="mAh"
                value={
                  form.batteryCapacityMah
                }
                placeholder="5000"
                onChange={(
                  value,
                ) =>
                  update(
                    'batteryCapacityMah',
                    value,
                  )
                }
              />

              <NumericField
                label="Display size"
                suffix="in"
                value={
                  form.diagonalInches
                }
                placeholder="6.7"
                onChange={(
                  value,
                ) =>
                  update(
                    'diagonalInches',
                    value,
                  )
                }
              />

              <NumericField
                label="Resolution width"
                suffix="px"
                step="1"
                value={
                  form.resolutionWidthPx
                }
                placeholder="1440"
                onChange={(
                  value,
                ) =>
                  update(
                    'resolutionWidthPx',
                    value,
                  )
                }
              />

              <NumericField
                label="Resolution height"
                suffix="px"
                step="1"
                value={
                  form.resolutionHeightPx
                }
                placeholder="3200"
                onChange={(
                  value,
                ) =>
                  update(
                    'resolutionHeightPx',
                    value,
                  )
                }
              />

              {!simple ? (
                <>
                  <NumericField
                    label="Nominal voltage"
                    suffix="V"
                    value={
                      form.batteryVoltageV
                    }
                    placeholder="3.85"
                    onChange={(
                      value,
                    ) =>
                      update(
                        'batteryVoltageV',
                        value,
                      )
                    }
                  />

                  <NumericField
                    label="Width"
                    suffix="mm"
                    value={
                      form.widthMm
                    }
                    placeholder="75"
                    onChange={(
                      value,
                    ) =>
                      update(
                        'widthMm',
                        value,
                      )
                    }
                  />

                  <NumericField
                    label="Height"
                    suffix="mm"
                    value={
                      form.heightMm
                    }
                    placeholder="160"
                    onChange={(
                      value,
                    ) =>
                      update(
                        'heightMm',
                        value,
                      )
                    }
                  />

                  <NumericField
                    label="Thickness"
                    suffix="mm"
                    value={
                      form.thicknessMm
                    }
                    placeholder="8"
                    onChange={(
                      value,
                    ) =>
                      update(
                        'thicknessMm',
                        value,
                      )
                    }
                  />

                  <NumericField
                    label="Device mass"
                    suffix="g"
                    value={
                      form.weightG
                    }
                    placeholder="195"
                    onChange={(
                      value,
                    ) =>
                      update(
                        'weightG',
                        value,
                      )
                    }
                  />
                </>
              ) : null}
            </div>

            {simple ? (
              <p className="il-help il-card-note">
                Use rated battery
                capacity where known.
                Advertised or typical
                capacity should not be
                substituted for a rated
                value.
              </p>
            ) : (
              <details className="il-advanced">
                <summary>
                  Panel, battery cell
                  and packaging detail
                </summary>

                <div className="il-advanced-body">
                  <p className="il-group-label">
                    Display geometry
                  </p>

                  <div className="il-grid">
                    <NumericField
                      label="Aspect width"
                      value={
                        form.aspectWidth
                      }
                      placeholder="9"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'aspectWidth',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Aspect height"
                      value={
                        form.aspectHeight
                      }
                      placeholder="20"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'aspectHeight',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Top bezel"
                      suffix="mm"
                      value={
                        form.bezelTopMm
                      }
                      placeholder="1.5"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'bezelTopMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Right bezel"
                      suffix="mm"
                      value={
                        form.bezelRightMm
                      }
                      placeholder="1.5"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'bezelRightMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Bottom bezel"
                      suffix="mm"
                      value={
                        form.bezelBottomMm
                      }
                      placeholder="1.5"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'bezelBottomMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Left bezel"
                      suffix="mm"
                      value={
                        form.bezelLeftMm
                      }
                      placeholder="1.5"
                      onChange={(
                        value,
                      ) =>
                        update(
                          'bezelLeftMm',
                          value,
                        )
                      }
                    />
                  </div>

                  <p className="il-group-label">
                    Cell geometry
                  </p>

                  <div className="il-grid">
                    <NumericField
                      label="Cell width"
                      suffix="mm"
                      value={
                        form.batteryWidthMm
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'batteryWidthMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Cell height"
                      suffix="mm"
                      value={
                        form.batteryHeightMm
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'batteryHeightMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Cell thickness"
                      suffix="mm"
                      value={
                        form.batteryThicknessMm
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'batteryThicknessMm',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Cell mass"
                      suffix="g"
                      value={
                        form.batteryWeightG
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'batteryWeightG',
                          value,
                        )
                      }
                    />
                  </div>

                  <p className="il-group-label">
                    Internal volume
                  </p>

                  <div className="il-grid">
                    <NumericField
                      label="Reserved volume"
                      suffix="%"
                      value={
                        form.reservedVolumePercent
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'reservedVolumePercent',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Thermal system"
                      suffix="mm³"
                      value={
                        form.thermalMm3
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'thermalMm3',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Logic board"
                      suffix="mm³"
                      value={
                        form.boardMm3
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'boardMm3',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Speakers"
                      suffix="mm³"
                      value={
                        form.speakersMm3
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'speakersMm3',
                          value,
                        )
                      }
                    />

                    <NumericField
                      label="Other components"
                      suffix="mm³"
                      value={
                        form.otherMm3
                      }
                      onChange={(
                        value,
                      ) =>
                        update(
                          'otherMm3',
                          value,
                        )
                      }
                    />
                  </div>
                </div>
              </details>
            )}
          </div>
          {!simple ? (
            <div className="il-section il-config-card">
              <SectionHeading
                index="02"
                title="Camera system"
                hint="Optional camera geometry. No image-quality score is inferred."
              />

              {cameras.length ? (
                <div className="il-camera-list">
                  {cameras.map(
                    (camera, index) => (
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
                              removeCamera(
                                camera.id,
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>

                        <div className="il-grid">
                          <label className="il-field">
                            <span>Type</span>

                            <select
                              value={
                                camera.type
                              }
                              onChange={(
                                event,
                              ) =>
                                updateCamera(
                                  camera.id,
                                  {
                                    type: event
                                      .currentTarget
                                      .value as CameraModuleType,
                                  },
                                )
                              }
                            >
                              <option value="wide">
                                Main
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
                            onChange={(
                              value,
                            ) =>
                              updateCamera(
                                camera.id,
                                {
                                  sensorFormatDenominator:
                                    value,
                                },
                              )
                            }
                          />

                          <NumericField
                            label="Resolution"
                            suffix="MP"
                            value={
                              camera.resolutionMp
                            }
                            placeholder="50"
                            onChange={(
                              value,
                            ) =>
                              updateCamera(
                                camera.id,
                                {
                                  resolutionMp:
                                    value,
                                },
                              )
                            }
                          />

                          <NumericField
                            label="Equivalent focal length"
                            suffix="mm"
                            value={
                              camera.equivalentFocalLengthMm
                            }
                            placeholder="24"
                            onChange={(
                              value,
                            ) =>
                              updateCamera(
                                camera.id,
                                {
                                  equivalentFocalLengthMm:
                                    value,
                                },
                              )
                            }
                          />

                          <NumericField
                            label="Aperture"
                            suffix="f/"
                            value={
                              camera.apertureFNumber
                            }
                            placeholder="1.6"
                            onChange={(
                              value,
                            ) =>
                              updateCamera(
                                camera.id,
                                {
                                  apertureFNumber:
                                    value,
                                },
                              )
                            }
                          />
                        </div>

                        <details className="il-advanced">
                          <summary>
                            Module dimensions
                          </summary>

                          <div className="il-grid">
                            <NumericField
                              label="Physical focal length"
                              suffix="mm"
                              value={
                                camera.physicalFocalLengthMm
                              }
                              onChange={(
                                value,
                              ) =>
                                updateCamera(
                                  camera.id,
                                  {
                                    physicalFocalLengthMm:
                                      value,
                                  },
                                )
                              }
                            />

                            <NumericField
                              label="Module width"
                              suffix="mm"
                              value={
                                camera.moduleWidthMm
                              }
                              onChange={(
                                value,
                              ) =>
                                updateCamera(
                                  camera.id,
                                  {
                                    moduleWidthMm:
                                      value,
                                  },
                                )
                              }
                            />

                            <NumericField
                              label="Module height"
                              suffix="mm"
                              value={
                                camera.moduleHeightMm
                              }
                              onChange={(
                                value,
                              ) =>
                                updateCamera(
                                  camera.id,
                                  {
                                    moduleHeightMm:
                                      value,
                                  },
                                )
                              }
                            />

                            <NumericField
                              label="Module depth"
                              suffix="mm"
                              value={
                                camera.moduleDepthMm
                              }
                              onChange={(
                                value,
                              ) =>
                                updateCamera(
                                  camera.id,
                                  {
                                    moduleDepthMm:
                                      value,
                                  },
                                )
                              }
                            />
                          </div>
                        </details>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <p className="il-help">
                  No camera modules added.
                </p>
              )}

              <button
                type="button"
                className="il-chip il-add"
                onClick={addCamera}
              >
                + Add camera module
              </button>
            </div>
          ) : null}

          <div className="il-section il-config-card">
            <SectionHeading
              index={
                simple ? '02' : '03'
              }
              title={
                simple
                  ? 'Usage'
                  : 'Power model'
              }
              hint={
                simple
                  ? 'Choose the pattern that best resembles a normal day.'
                  : 'Supply whole-device power measurements for the workloads you want to model.'
              }
            />

            {simple ? (
              <div className="il-simple-usage">
                <div className="il-simple-usage-intro">
                  <h3>
                    How do you use this phone?
                  </h3>

                  <p>
                    Choose the daily usage pattern
                    that best matches you.
                  </p>
                </div>

                <div className="il-profile-picker">
                  {(
                    [
                      'Light',
                      'Typical',
                      'Heavy',
                      'Custom',
                    ] as UsagePreset[]
                  ).map(
                    (preset) => (
                      <label
                        className={
                          experience.preset ===
                          preset
                            ? 'il-profile-option active'
                            : 'il-profile-option'
                        }
                        key={preset}
                      >
                        <input
                          type="radio"
                          name="usage-profile"
                          checked={
                            experience.preset ===
                            preset
                          }
                          onChange={() =>
                            changeExperience(
                              {
                                type: 'preset',
                                value:
                                  preset,
                              },
                            )
                          }
                        />

                        <strong>
                          {preset}
                        </strong>

                        <span>
                          {preset ===
                          'Light'
                            ? 'Calls, messaging and occasional browsing'
                            : preset ===
                                'Typical'
                              ? 'Balanced everyday use'
                              : preset ===
                                  'Heavy'
                                ? 'Longer active sessions and demanding use'
                                : 'Define your own daily activity'}
                        </span>
                      </label>
                    ),
                  )}
                </div>

                {experience.preset ===
                'Custom' ? (
                  <div className="il-grid il-custom-usage">
                    {ACTIVE_WORKLOADS.map(
                      (key) => (
                        <label
                          className="il-field"
                          key={key}
                        >
                          <span>
                            {key ===
                            'web_browsing'
                              ? 'Web / social'
                              : WORKLOAD_LABEL[
                                  key
                                ]}

                            <small>
                              min/day
                            </small>
                          </span>

                          <input
                            type="number"
                            min="0"
                            max="1440"
                            step="any"
                            inputMode="decimal"
                            value={
                              usage[
                                key
                              ] ===
                              INVALID_NUMBER
                                ? ''
                                : usage[
                                    key
                                  ]
                            }
                            onChange={captureNumericValue(
                              (
                                value,
                              ) =>
                                changeExperience(
                                  {
                                    type: 'duration',
                                    key,
                                    value,
                                  },
                                ),
                            )}
                          />
                        </label>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="il-profile-summary">
                    {ACTIVE_WORKLOADS.map(
                      (key) => (
                        <span key={key}>
                          <strong>
                            {
                              usage[
                                key
                              ]
                            }{' '}
                            min
                          </strong>

                          {key ===
                          'web_browsing'
                            ? 'Web / social'
                            : WORKLOAD_LABEL[
                                key
                              ]}
                        </span>
                      ),
                    )}
                  </div>
                )}

                <div className="il-usage-meta">
                  <span>
                    Idle
                    <strong>
                      {usageBreakdown
                        .issues
                        .length
                        ? 'Unknown'
                        : `${format(
                            usageBreakdown.idleMinutes /
                              60,
                            1,
                          )} h`}
                    </strong>
                  </span>

                  <span>
                    Evidence
                    <strong>
                      {evidence
                        ? `${evidence.referenceCount} references`
                        : 'Insufficient'}
                    </strong>
                  </span>

                  <span>
                    Model
                    <strong>
                      {
                        POWER_EVIDENCE_VERSION
                      }
                    </strong>
                  </span>
                </div>

                {evidence ? (
                  <details className="il-advanced">
                    <summary>
                      Evidence &amp; assumptions
                    </summary>

                    <div className="il-advanced-body">
                      <ul className="il-evidence-list">
                        {Object.values(
                          workloadEvidence(
                            evidence,
                          ),
                        ).map(
                          (entry) => (
                            <li
                              key={
                                entry.workload
                              }
                            >
                              <strong>
                                {
                                  WORKLOAD_LABEL[
                                    entry
                                      .workload
                                  ]
                                }
                              </strong>

                              <span>
                                {entry.powerW
                                  ? `${format(
                                      entry
                                        .powerW
                                        .min,
                                      2,
                                    )}–${format(
                                      entry
                                        .powerW
                                        .max,
                                      2,
                                    )} W`
                                  : 'No supported power value'}
                              </span>

                              <small>
                                {
                                  entry.note
                                }
                              </small>
                            </li>
                          ),
                        )}
                      </ul>

                      {endurancePreview ? (
                        <p className="il-help">
                          {format(
                            endurancePreview.activeHours,
                            1,
                          )}{' '}
                          h active/day.{' '}
                          {format(
                            endurancePreview.unevidencedHours,
                            1,
                          )}{' '}
                          h of the full day
                          currently lacks power
                          evidence.
                        </p>
                      ) : null}
                    </div>
                  </details>
                ) : (
                  <div className="il-insufficient-inline">
                    <strong>
                      Not enough evidence
                    </strong>

                    <p>
                      {
                        INSUFFICIENT_EVIDENCE_MESSAGE
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <label className="il-field">
                  <span>
                    Mixed-use model
                  </span>

                  <select
                    value={
                      profileMode
                    }
                    onChange={captureValue(
                      (value) => {
                        setProfileMode(
                          value as ProfileMode,
                        );

                        setDirty(
                          true,
                        );
                      },
                    )}
                  >
                    <option value="equal">
                      Equal shares
                    </option>

                    <option value="percent">
                      Custom percentage shares
                    </option>

                    <option value="manual">
                      Known mixed-use average
                      power
                    </option>
                  </select>
                </label>

                <div className="il-workload-grid">
                  {(profileMode ===
                  'manual'
                    ? ([
                        'mixed_use',
                      ] as const)
                    : COMPONENT_WORKLOADS
                  ).map(
                    (workload) => (
                      <label
                        className={
                          workloadPower[
                            workload
                          ].trim()
                            ? 'il-workload active'
                            : 'il-workload'
                        }
                        key={
                          workload
                        }
                      >
                        <span className="il-workload-name">
                          {
                            WORKLOAD_LABEL[
                              workload
                            ]
                          }
                        </span>

                        <span className="il-workload-unit">
                          Average device power
                        </span>

                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={
                            workloadPower[
                              workload
                            ] ===
                            INVALID_NUMBER
                              ? ''
                              : workloadPower[
                                  workload
                                ]
                          }
                          placeholder="Unknown"
                          onChange={captureNumericValue(
                            (
                              value,
                            ) => {
                              setDirty(
                                true,
                              );

                              setWorkloadPower(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [workload]:
                                    value,
                                }),
                              );
                            },
                          )}
                        />
                      </label>
                    ),
                  )}
                </div>

                {profileMode ===
                'percent' ? (
                  <details
                    className="il-advanced"
                    open
                  >
                    <summary>
                      Workload shares
                    </summary>

                    <div className="il-grid">
                      {COMPONENT_WORKLOADS.map(
                        (
                          workload,
                        ) => (
                          <NumericField
                            key={
                              workload
                            }
                            label={
                              WORKLOAD_LABEL[
                                workload
                              ]
                            }
                            suffix="%"
                            value={
                              workloadWeights[
                                workload
                              ]
                            }
                            onChange={(
                              value,
                            ) => {
                              setDirty(
                                true,
                              );

                              setWorkloadWeights(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [workload]:
                                    value,
                                }),
                              );
                            }}
                          />
                        ),
                      )}
                    </div>

                    <p className="il-profile-total">
                      Total:{' '}
                      {format(
                        profile.totalPercent,
                        2,
                      )}
                      %
                    </p>
                  </details>
                ) : null}

                <div className="il-grid il-derate">
                  <NumericField
                    label="Usable pack energy"
                    suffix="%"
                    value={
                      usablePercent
                    }
                    placeholder="Full rated pack"
                    onChange={(
                      value,
                    ) => {
                      setUsablePercent(
                        value,
                      );

                      setDirty(
                        true,
                      );
                    }}
                  />
                </div>

                {profile.issues
                  .length ? (
                  <ul className="il-profile-issues">
                    {profile.issues.map(
                      (
                        issue,
                        index,
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {issue}
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <div className="il-section il-config-card il-model-card">
            <SectionHeading
              index={
                simple ? '03' : '04'
              }
              title="Model"
              hint="The versions and evidence rules applied to this run."
            />

            <ul className="il-model-list">
              <li>
                <strong>
                  Simulation engine
                </strong>

                <span>
                  v
                  {
                    SIMULATION_ENGINE_VERSION
                  }
                </span>
              </li>

              <li>
                <strong>
                  Battery model
                </strong>

                <span>
                  {
                    BATTERY_EXPERIENCE_VERSION
                  }
                </span>
              </li>

              <li>
                <strong>
                  Evidence rule
                </strong>

                <span>
                  Unsupported conclusions
                  remain unresolved.
                </span>
              </li>
            </ul>
          </div>

          <div className="il-run">
            <button
              type="button"
              className="il-simulate"
              onClick={() =>
                void simulate()
              }
              disabled={
                simpleInference.status ===
                'loading'
              }
            >
              <span>
                {simpleInference.status ===
                'loading'
                  ? 'Running model…'
                  : 'Run simulation'}
              </span>

              <span aria-hidden="true">
                →
              </span>
            </button>

            <p>
              {simple
                ? 'We calculate only what the current evidence can support.'
                : 'Advanced results use the engineering values you supplied.'}
            </p>
          </div>
        </section>

        <aside
          id="simulation-results"
          className="il-results"
          aria-live="polite"
          aria-label="Simulation results"
        >
          <div className="il-results-top">
            <span className="eyebrow">
              Simulation result
            </span>

            <span>
              Engine v
              {
                SIMULATION_ENGINE_VERSION
              }
            </span>
          </div>

          {hasSimulated &&
          dirty ? (
            <div className="il-stale-result">
              Inputs changed. Run again
              to refresh this result.
            </div>
          ) : null}

          {simple &&
          simpleInference.status ===
            'loading' ? (
            <div className="il-result-empty">
              <div
                className="il-orbit"
                aria-hidden="true"
              >
                <span />
              </div>

              <span className="il-result-empty-kicker">
                Model running
              </span>

              <h2>
                Interpreting the evidence.
              </h2>

              <p>
                Simple Mode is building a
                bounded estimate from the
                frozen PhoneFuturist
                evidence set.
              </p>
            </div>
          ) : simple &&
            simpleInference.status ===
              'error' ? (
            <div className="il-result-empty">
              <span className="il-result-empty-kicker">
                Simulation unavailable
              </span>

              <h2>
                We could not complete this
                run.
              </h2>

              <p>
                {
                  simpleInference.message
                }
              </p>
            </div>
          ) : simple &&
            simpleInference.status ===
              'insufficient_evidence' ? (
            <div className="il-result-empty">
              <span className="il-result-empty-kicker">
                Insufficient evidence
              </span>

              <h2>
                Not enough evidence for a
                defensible estimate.
              </h2>

              <ul className="il-profile-issues">
                {simpleInference.envelope.artifact.limitations.map(
                  (
                    limitation,
                    index,
                  ) => (
                    <li
                      key={index}
                    >
                      {limitation}
                    </li>
                  ),
                )}
              </ul>

              <p>
                No battery-life number has
                been invented. Add stronger
                evidence or use Advanced
                Mode with measured
                engineering inputs.
              </p>
            </div>
          ) : simple &&
            simpleInference.status ===
              'ready' ? (
            <>
              <div className="il-result-identity">
                <span>
                  SIMPLE MODE ·
                  MODEL-DERIVED
                </span>

                <h2>
                  {form.name.trim() ||
                    'Untitled device'}
                </h2>
              </div>

              <div className="il-runtime-card">
                <div className="il-runtime-header">
                  <span className="il-runtime-eyebrow">
                    Whole-device power
                    estimate
                  </span>

                  <span
                    className={`il-confidence il-confidence-${simpleInference.envelope.artifact.confidence}`}
                  >
                    {
                      simpleInference
                        .envelope
                        .artifact
                        .confidence
                    }{' '}
                    confidence
                  </span>
                </div>

                <p className="il-runtime-value">
                  {simpleInference
                    .envelope
                    .artifact
                    .averagePowerW
                    ? `${format(
                        simpleInference
                          .envelope
                          .artifact
                          .averagePowerW
                          .min,
                        2,
                      )}–${format(
                        simpleInference
                          .envelope
                          .artifact
                          .averagePowerW
                          .max,
                        2,
                      )} W`
                    : 'Unresolved'}
                </p>

                <p className="il-runtime-framing">
                  {experience.preset}{' '}
                  usage
                </p>

                <p className="il-help">
                  Model-derived estimate
                  from frozen
                  PhoneFuturist evidence,
                  not a measured
                  benchmark.
                </p>

                {evidenceDevice.energyWh ===
                undefined ? (
                  <div className="il-insufficient-result">
                    <strong>
                      Battery endurance
                      remains unresolved
                    </strong>

                    <p>
                      Rated capacity in mAh
                      does not uniquely
                      determine energy in
                      Wh. Simple Mode will
                      not assume a hidden
                      cell voltage, so it
                      reports power without
                      inventing a runtime.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="il-result-summary-grid">
                <div>
                  <span>
                    Battery
                  </span>

                  <strong>
                    {form.batteryCapacityMah ||
                      'Unknown'}
                    {form.batteryCapacityMah
                      ? ' mAh'
                      : ''}
                  </strong>
                </div>

                <div>
                  <span>
                    Energy
                  </span>

                  <strong>
                    {evidenceDevice.energyWh !==
                    undefined
                      ? `${format(
                          evidenceDevice.energyWh,
                          2,
                        )} Wh`
                      : 'Unknown'}
                  </strong>
                </div>

                <div>
                  <span>
                    Display
                  </span>

                  <strong>
                    {form.diagonalInches ||
                      'Unknown'}
                    {form.diagonalInches
                      ? '″'
                      : ''}
                  </strong>
                </div>

                <div>
                  <span>
                    Evidence
                  </span>

                  <strong>
                    {
                      simpleInference
                        .envelope
                        .artifact
                        .evidence
                        .length
                    }
                  </strong>
                </div>
              </div>

              <details className="il-evidence">
                <summary>
                  Why this result?
                </summary>

                <section>
                  <h3>
                    ASSUMPTIONS /
                    PROVENANCE
                  </h3>

                  <ul>
                    {simpleInference.envelope.artifact.assumptions.map(
                      (
                        assumption,
                      ) => (
                        <li
                          key={
                            assumption.id
                          }
                        >
                          <strong>
                            {
                              assumption.label
                            }
                            :
                          </strong>{' '}
                          {
                            assumption.reasoning
                          }
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section>
                  <h3>
                    EVIDENCE
                  </h3>

                  <ul>
                    {simpleInference.envelope.artifact.evidence.map(
                      (item) => (
                        <li
                          key={
                            item.evidenceId
                          }
                        >
                          <strong>
                            {item.title}
                            :
                          </strong>{' '}
                          {
                            item.supports
                          }
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section>
                  <h3>
                    MODEL RECEIPT
                  </h3>

                  <ul>
                    <li>
                      Artifact:{' '}
                      {
                        simpleInference
                          .envelope
                          .receipt
                          .artifactId
                      }
                    </li>

                    <li>
                      Inference model:{' '}
                      {
                        simpleInference
                          .envelope
                          .receipt
                          .inferenceModel
                      }
                    </li>

                    <li>
                      Evidence snapshot:{' '}
                      {
                        simpleInference
                          .envelope
                          .receipt
                          .evidenceSnapshotId
                      }
                    </li>
                  </ul>
                </section>
              </details>
            </>
          ) : !hasSimulated ? (
            <div className="il-result-empty">
              <div
                className="il-orbit"
                aria-hidden="true"
              >
                <span />
              </div>

              <span className="il-result-empty-kicker">
                Awaiting configuration
              </span>

              <h2>
                Your result will appear
                here.
              </h2>

              <p>
                Configure the device and
                usage profile, then run
                the simulation.
                Unsupported conclusions
                will remain unresolved
                instead of being
                invented.
              </p>
            </div>
          ) : !result ? (
            <div className="il-result-empty">
              <span className="il-result-empty-kicker">
                Unresolved
              </span>

              <h2>
                Cannot estimate yet.
              </h2>

              <ul className="il-profile-issues">
                {run?.issues.map(
                  (
                    issue,
                    index,
                  ) => (
                    <li
                      key={index}
                    >
                      {issue}
                    </li>
                  ),
                )}
              </ul>

              <p>
                Your configuration is
                preserved. Correct the
                unresolved inputs and run
                again.
              </p>
            </div>
          ) : (
            <>
              <div className="il-result-identity">
                <span>
                  {simulationInput?.formFactor
                    .replaceAll(
                      '_',
                      ' ',
                    )
                    .toUpperCase()}
                </span>

                <h2>
                  {simulationInput?.name ||
                    'Untitled device'}
                </h2>
              </div>
              <div className="il-runtime-card">
                <div className="il-runtime-header">
                  <span className="il-runtime-eyebrow">
                    {simple
                      ? 'Estimated endurance'
                      : 'Deterministic endurance'}
                  </span>

                  {simple &&
                  evidenceConfidence ? (
                    <span
                      className={`il-confidence il-confidence-${evidenceConfidence}`}
                    >
                      {
                        evidenceConfidence
                      }{' '}
                      confidence
                    </span>
                  ) : null}
                </div>

                <p className="il-runtime-value">
                  {simple
                    ? enduranceHeadline?.headline ?? 'Unresolved'
                    : estimate
                      ? run ? runtimeText(run) : 'Unresolved'
                      : 'Unresolved'}
                </p>

                <p className="il-runtime-framing">
                  {simple
                    ? enduranceHeadline?.detail ?? 'No supported endurance calculation'
                    : estimate
                      ? estimate.workloads.map((workload) => `${WORKLOAD_LABEL[workload.workload]} · ${wattsLabel(workload.averagePowerW)}`).join(' / ')
                      : 'No supported runtime calculation'}
                </p>

                {simple &&
                run?.endurance ? (
                  <div className="il-runtime-range">
                    <span>
                      Continuous web reference
                    </span>

                    <strong>
                      {format(
                        run.endurance
                          .screenOnBudgetHours.min,
                        1,
                      )}
                      –
                      {format(
                        run.endurance
                          .screenOnBudgetHours.max,
                        1,
                      )}{' '}
                      hours
                    </strong>
                  </div>
                ) : null}

                {simple &&
                run?.endurance ? (
                  <p className="il-help">
                    {format(
                      run.endurance
                        .activeHours,
                      1,
                    )}{' '}
                    h active/day ·{' '}
                    {format(
                      run.endurance
                        .idleHours,
                      1,
                    )}{' '}
                    h idle/day
                  </p>
                ) : null}

                {simple &&
                estimate?.assumptions.some((assumption) => assumption.code === 'NO_USABLE_PERCENT_SUPPLIED') ? (
                  <p className="il-result-warning">
                    Optimistic bound: no
                    measured usable-energy
                    fraction is available,
                    so the current model
                    uses the full rated
                    pack.
                  </p>
                ) : null}

                {!simple &&
                battery?.result.status ===
                  'unresolved' ? (
                  <div className="il-insufficient-result">
                    <strong>
                      Not enough evidence
                    </strong>

                    <p>
                      {
                        battery.result.unresolved?.message ?? 'Required battery inputs remain unresolved.'
                      }
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="il-result-summary-grid">
                <div>
                  <span>
                    Battery
                  </span>

                  <strong>
                    {pack?.totalCapacityMah !==
                    undefined
                      ? `${format(
                          pack.totalCapacityMah,
                          0,
                        )} mAh`
                      : 'Unknown'}
                  </strong>
                </div>

                <div>
                  <span>
                    Energy
                  </span>

                  <strong>
                    {pack?.totalEnergyWh !==
                    undefined
                      ? `${format(
                          pack.totalEnergyWh,
                          2,
                        )} Wh`
                      : 'Unknown'}
                  </strong>
                </div>

                <div>
                  <span>
                    Display
                  </span>

                  <strong>
                    {simulationInput?.displays.primary.diagonalInches !==
                    undefined
                      ? `${format(
                          simulationInput.displays.primary.diagonalInches,
                          2,
                        )}″`
                      : 'Unknown'}
                  </strong>
                </div>

                <div>
                  <span>
                    Density
                  </span>

                  <strong>
                    {display?.ppi !==
                    undefined
                      ? `${format(
                          display.ppi,
                          0,
                        )} ppi`
                      : 'Unknown'}
                  </strong>
                </div>
              </div>

              <div className="il-result-block">
                <div className="il-result-block-head">
                  <h3>
                    Physical model
                  </h3>

                  <span>
                    Deterministic
                  </span>
                </div>

                <dl className="il-metrics">
                  <div>
                    <dt>
                      Display area
                    </dt>

                    <dd>
                      {display?.areaMm2 !==
                      undefined
                        ? `${format(
                            display.areaMm2 / 100,
                            1,
                          )} cm²`
                        : 'Unknown'}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Screen-to-body
                    </dt>

                    <dd>
                      {display?.screenToBodyRatio !==
                      undefined
                        ? `${format(
                            display.screenToBodyRatio,
                            1,
                          )}%`
                        : 'Unknown'}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Device volume
                    </dt>

                    <dd>
                      {packaging?.externalVolumeMm3 !==
                      undefined
                        ? `${format(
                            packaging.externalVolumeMm3 /
                              1000,
                            1,
                          )} cm³`
                        : 'Unknown'}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Battery volume
                    </dt>

                    <dd>
                      {pack?.totalVolumeMm3 !==
                      undefined
                        ? `${format(
                            pack.totalVolumeMm3 /
                              1000,
                            1,
                          )} cm³`
                        : 'Unknown'}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Battery density
                    </dt>

                    <dd>
                      {pack?.volumetricEnergyDensityWhL !==
                      undefined
                        ? `${format(
                            pack.volumetricEnergyDensityWhL,
                            0,
                          )} Wh/L`
                        : 'Unknown'}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Remaining volume
                    </dt>

                    <dd>
                      {packaging?.remainingVolumeMm3 !==
                      undefined
                        ? `${format(
                            packaging.remainingVolumeMm3 /
                              1000,
                            1,
                          )} cm³`
                        : 'Unknown'}
                    </dd>
                  </div>
                </dl>
              </div>

              {result.cameras?.length ? (
                <div className="il-result-block">
                  <div className="il-result-block-head">
                    <h3>
                      Camera geometry
                    </h3>

                    <span>
                      {
                        result.cameras
                          .length
                      }{' '}
                      modules
                    </span>
                  </div>

                  <div className="il-camera-results">
                    {result.cameras.map(
                      (
                        camera,
                        index,
                      ) => (
                        <article
                          key={`${camera.type}-${index}`}
                        >
                          <strong>
                            {camera.type
                              .replaceAll(
                                '_',
                                ' ',
                              )
                              .toUpperCase()}
                          </strong>

                          <span>
                            Approx. sensor diagonal{' '}
                            {camera.approximateSensorDiagonalMm !==
                            undefined
                              ? `${format(
                                  camera.approximateSensorDiagonalMm,
                                  1,
                                )} mm`
                              : 'Unknown'}
                          </span>

                          <span>
                            Crop{' '}
                            {camera.cropFactor !==
                            undefined
                              ? `${format(
                                  camera.cropFactor,
                                  2,
                                )}×`
                              : 'Unknown'}
                          </span>

                          <span>
                            Pixel pitch{' '}
                            Unknown (not modeled)
                          </span>

                          <span>
                            Module volume{' '}
                            {camera.moduleVolumeMm3 !==
                            undefined
                              ? `${format(
                                  camera.moduleVolumeMm3,
                                  0,
                                )} mm³`
                              : 'Unknown'}
                          </span>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {run?.issues.length ? (
                <div className="il-result-block il-result-issues">
                  <div className="il-result-block-head">
                    <h3>
                      Unresolved inputs
                    </h3>

                    <span>
                      {
                        run.issues
                          .length
                      }
                    </span>
                  </div>

                  <ul>
                    {run.issues.map(
                      (
                        issue,
                        index,
                      ) => (
                        <li
                          key={index}
                        >
                          {issue}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              {simple &&
              run?.evidence ? (
                <details className="il-evidence">
                  <summary>
                    Why this result?
                  </summary>

                  <section>
                    <h3>
                      EVIDENCE
                    </h3>

                    <ul>
                      <li>
                        Basis:{' '}
                        {
                          run.evidence
                            .basis
                        }
                      </li>

                      <li>
                        Reference
                        devices:{' '}
                        {
                          run.evidence
                            .referenceCount
                        }
                      </li>

                      <li>
                        Web power:{' '}
                        {wattsLabel(
                          run.evidence
                            .webPowerW,
                        )}
                      </li>

                      <li>
                        Evidence
                        version:{' '}
                        {
                          POWER_EVIDENCE_VERSION
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3>
                      WORKLOAD SUPPORT
                    </h3>

                    <ul>
                      {Object.values(
                        workloadEvidence(
                          run.evidence,
                        ),
                      ).map(
                        (entry) => (
                          <li
                            key={
                              entry.workload
                            }
                          >
                            <strong>
                              {
                                WORKLOAD_LABEL[
                                  entry
                                    .workload
                                ]
                              }
                              :
                            </strong>{' '}
                            {
                              entry.note
                            }
                          </li>
                        ),
                      )}
                    </ul>
                  </section>
                </details>
              ) : null}

              {run ? (
                <details className="il-receipt">
                  <summary>
                    View simulation receipt
                  </summary>

                  <div className="il-receipt-body">
                    {receiptSections(
                      run,
                      receiptGeneratedAt,
                    ).map(
                      (section) => (
                        <section
                          key={
                            section.title
                          }
                        >
                          <h3>
                            {
                              section.title
                            }
                          </h3>

                          <ul>
                            {section.lines.map(
                              (
                                item,
                                index,
                              ) => (
                                <li
                                  key={`${section.title}-${index}`}
                                >
                                  {
                                    item
                                  }
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                      ),
                    )}
                  </div>
                </details>
              ) : null}

              {run ? (
                <ShareResult run={run} />
              ) : null}
            </>
          )}
        </aside>
      </div>

      <section className="il-scope">
        <strong>
          What this model does
        </strong>

        <p>
          It calculates geometry,
          display density, battery
          energy, packaging,
          camera geometry and
          battery endurance where
          the supplied inputs or
          evidence are sufficient.
          It does not infer image
          quality, benchmark scores
          or undocumented hardware
          behavior.
        </p>
      </section>
    </div>
  );
}