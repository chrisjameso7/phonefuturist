import { useState, useReducer } from 'react';
import {INITIAL_EXPERIENCE,experienceReducer,deriveUsage,simpleProfile,simpleEndurance,simpleEnduranceHeadline,INSUFFICIENT_EVIDENCE_MESSAGE,USAGE_PRESETS,ACTIVE_WORKLOADS,USAGE_VERSION,POWER_EVIDENCE_VERSION,freezeRun,type AlphaRun,type UsagePreset} from '../../lib/simulation/alpha-workspace';
import {evidenceDeviceFrom,resolvePowerEvidence,simpleEvidenceConfidence,workloadEvidence} from '../../lib/simulation/power-evidence';
import {receiptSections,headlineText,headlineLabel} from '../../lib/simulation/result-export';
import ShareResult from './ShareResult';
import {numeric, captureValue, captureNumericValue, INVALID_NUMBER, numericIssues, buildProfile, runWorkspace, WORKLOAD_LABEL, COMPONENT_WORKLOADS, type ProfileMode} from '../../lib/simulation/beta-workspace';

import {
  SIMULATION_ENGINE_VERSION,
} from '../../lib/simulation/engine';

import {
  BATTERY_EXPERIENCE_VERSION,
} from '../../lib/simulation/modules/battery-experience';

import type {
  DeviceFormFactor,
  SimulationInput,
} from '../../lib/simulation/types';

import type {
  CameraInput,
  CameraModuleType,
} from '../../lib/simulation/modules/camera';

import type {
  BatteryExperienceWorkload,
} from '../../lib/simulation/modules/battery-experience';

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

/* ---------------- Device layer ---------------- */

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

const initialWorkloadInputs: Record<BatteryExperienceWorkload, string> = {
  mixed_use: '',
  web_browsing: '',
  video_playback: '',
  gaming: '',
  camera_use: '',
  standby: '',
};

/* ---------------- Formatting helpers ---------------- */

function format(value: number | undefined, digits = 1): string {
  if (value === undefined || !Number.isFinite(value)) return 'Unknown';

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function hoursLabel(
  runtime: { min?: number; max?: number } | undefined,
): string {
  if (!runtime) return 'Unknown';

  const { min, max } = runtime;

  if (min !== undefined && max !== undefined) {
    if (Math.abs(max - min) < 1e-9) {
      return `${format(min, 1)} h`;
    }

    return `${format(min, 1)}–${format(max, 1)} h`;
  }

  if (min !== undefined) return `${format(min, 1)}+ h`;
  if (max !== undefined) return `up to ${format(max, 1)} h`;

  return 'Unknown';
}

function wattsLabel(
  power: { min?: number; max?: number } | undefined,
): string {
  if (!power) return 'Unknown';

  const { min, max } = power;

  if (min !== undefined && max !== undefined) {
    if (Math.abs(max - min) < 1e-9) {
      return `${format(min, 2)} W`;
    }

    return `${format(min, 2)}–${format(max, 2)} W`;
  }

  if (min !== undefined) return `${format(min, 2)}+ W`;
  if (max !== undefined) return `up to ${format(max, 2)} W`;

  return 'Unknown';
}

/* A day-scale reference bar: position of a runtime within 0–30 h. */
function runtimeBarPercent(
  runtime: { min?: number; max?: number } | undefined,
): number | undefined {
  if (!runtime || runtime.min === undefined) return undefined;

  const REFERENCE_HOURS = 30;

  return Math.min(100, (runtime.min / REFERENCE_HOURS) * 100);
}

const CONFIDENCE_LABEL: Record<string, string> = {
  deterministic: 'Deterministic inputs',
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
};

const EVIDENCE_CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High evidence confidence',
  moderate: 'Moderate evidence confidence',
  low: 'Low evidence confidence',
};

/* ---------------- Primitives ---------------- */

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
        value={value===INVALID_NUMBER?'':value}
        aria-invalid={value===INVALID_NUMBER || (numeric(value)??0)<0}
        placeholder={placeholder}
        onChange={captureNumericValue(onChange)}
      />
      <small className="il-input-state">{value===INVALID_NUMBER?'Incomplete number':value.trim()?'User supplied · unverified':'Unknown'}</small>
    </label>
  );
}

function SectionHeading({
  index,
  title,
  hint,
  action,
}: {
  index: string;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="il-section-heading">
      <span className="il-index">{index}</span>

      <div className="il-heading-copy">
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
      </div>

      {action}
    </div>
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

function cameraInput(camera: CameraDraft): CameraInput {
  return {
    type: camera.type,
    sensorFormatDenominator: numeric(camera.sensorFormatDenominator),
    resolutionMp: numeric(camera.resolutionMp),
    equivalentFocalLengthMm: numeric(camera.equivalentFocalLengthMm),
    physicalFocalLengthMm: numeric(camera.physicalFocalLengthMm),
    apertureFNumber: numeric(camera.apertureFNumber),
    moduleWidthMm: numeric(camera.moduleWidthMm),
    moduleHeightMm: numeric(camera.moduleHeightMm),
    moduleDepthMm: numeric(camera.moduleDepthMm),
  };
}

/* ---------------- Component ---------------- */

export default function InteractiveLeaksSimulator() {
  const [form, setForm] = useState<FormState>(initialForm);

  const [cameras, setCameras] = useState<CameraDraft[]>([]);

  /* Environment layer: one average-power field per workload (W). */
  const [workloadPower, setWorkloadPower] =
    useState<Record<BatteryExperienceWorkload, string>>(initialWorkloadInputs);

  /* Environment layer: usable-pack derating (%). */
  const [usablePercent, setUsablePercent] = useState<string>('');

  /* Weights are an advanced control: relative share inside the mixture. */
  const [workloadWeights, setWorkloadWeights] =
    useState<Record<BatteryExperienceWorkload, string>>(initialWorkloadInputs);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [hasSimulated, setHasSimulated] = useState(false);
  const [configurationSource, setConfigurationSource] = useState<'likely' | 'worst' | 'custom'>('likely');
  const [processorScenario, setProcessorScenario] = useState<'exynos2700' | 'snapdragon8eg6'>('exynos2700');
  const [efficiencyAssumption, setEfficiencyAssumption] = useState(0);
  const [ambientTemperature, setAmbientTemperature] = useState(22);
  const [cpuLoad, setCpuLoad] = useState(25);
  const [gpuLoad, setGpuLoad] = useState(10);
  const [stage, setStage] = useState<'build' | 'test' | 'compare' | 'results'>('build');
  const [simulationName, setSimulationName] = useState('Galaxy S27 Ultra — Most likely');
  const [savedNotice, setSavedNotice] = useState('');

  const [run, setRun] = useState<AlphaRun|null>(null);
  const [profileMode,setProfileMode] = useState<ProfileMode>('equal');
  const [dirty,setDirty] = useState(false);
  const [exampleLoaded,setExampleLoaded] = useState(false);
  const [experience,dispatchExperience]=useReducer(experienceReducer,INITIAL_EXPERIENCE);
  const simple=experience.mode==='simple';
  const usage=experience.preset==='Custom'?experience.custom:USAGE_PRESETS[experience.preset];
  const usageBreakdown=deriveUsage(usage);
  /* Simple Mode derives whole-device power from calibration evidence; the usage profile supplies the mixture. */
  const evidenceDevice=evidenceDeviceFrom(buildInput());
  const evidence=simple&&!experience.useEnteredPower?resolvePowerEvidence(evidenceDevice):undefined;
  const profile=simple?simpleProfile(experience,workloadPower,evidenceDevice):buildProfile(workloadPower,workloadWeights,profileMode);
  const endurancePreview=simple&&!experience.useEnteredPower?simpleEndurance(experience,evidenceDevice.energyWh,evidenceDevice):undefined;
  const enduranceHeadline=simpleEnduranceHeadline(run?.endurance);
  /* Simple Mode grades on evidence quality; Advanced keeps the battery model's own grading. */
  const evidenceConfidence=run?.endurance&&run.evidence?simpleEvidenceConfidence(run.evidence,run.endurance).level:undefined;
  function changeExperience(action:Parameters<typeof experienceReducer>[1]){dispatchExperience(action);setDirty(true);}
  const simulationInput=run?.input;
  const result=run?.device;
  const battery=run?.battery;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCamera(id: number, patch: Partial<CameraDraft>) {
    setDirty(true);
    setCameras((current) =>
      current.map((camera) =>
        camera.id === id ? { ...camera, ...patch } : camera,
      ),
    );
  }

  function addCamera() {
    setDirty(true);
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
    setDirty(true);
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
      resolutionWidthPx: numeric(form.resolutionWidthPx),
      resolutionHeightPx: numeric(form.resolutionHeightPx),
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

    const hasComponentVolume = Object.values(componentVolumes).some(
      (value) => value !== undefined,
    );

    const hasPackaging =
      form.reservedVolumePercent.trim() !== '' || hasComponentVolume;

    return {
      formFactor: form.formFactor,
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      dimensions,
      displays: { primary: primaryDisplay },
      ...(hasBattery
        ? {
            battery: {
              cells: [
                {
                  capacityMah: numeric(form.batteryCapacityMah),
                  nominalVoltageV: numeric(form.batteryVoltageV),
                  widthMm: numeric(form.batteryWidthMm),
                  heightMm: numeric(form.batteryHeightMm),
                  thicknessMm: numeric(form.batteryThicknessMm),
                  weightG: numeric(form.batteryWeightG),
                },
              ],
            },
          }
        : {}),
      ...(cameras.length > 0
        ? { cameras: cameras.map(cameraInput) }
        : {}),
      ...(hasPackaging
        ? {
            packaging: {
              reservedVolumePercent: numeric(form.reservedVolumePercent),
              ...(hasComponentVolume ? { componentVolumes } : {}),
            },
          }
        : {}),
    };
  }

  function simulate() {
    const {name,formFactor,...fields}=form;
    const issues=numericIssues(fields);
    cameras.forEach(({id,type,...fields},index)=>issues.push(...numericIssues(fields,`Camera ${index+1} — `)));
    const built=buildInput();
    const workspace=runWorkspace(built,simple?'':usablePercent,profile,issues);
    /* Endurance is resolved from the same frozen run, so the receipt and the card can never disagree with the screen. */
    const resolvedEndurance=simple&&!experience.useEnteredPower?simpleEndurance(experience,workspace.device?.battery?.totalEnergyWh,evidenceDeviceFrom(built)):undefined;
    setRun(freezeRun(workspace,{
      mode:experience.mode,usageProfile:simple?experience.preset:'Advanced',usageVersion:USAGE_VERSION,
      ...(simple?{usage:{...usage}}:{}),powerSource:simple&&!experience.useEnteredPower?(evidence?`Derived from ${evidence.referenceCount} measured reference runtimes (${evidence.basis==='matched-reference'&&evidence.reference?evidence.reference.model:'calibration spread'}) — calibrated, not measured on this device`:'Unknown — no reference data'):'User supplied in Advanced; unverified',
      usablePercent:simple?'':usablePercent,calibrationVersion:simple&&!experience.useEnteredPower&&evidence?POWER_EVIDENCE_VERSION:'None applied — seed observations are not fitted power coefficients',
    },resolvedEndurance?{endurance:resolvedEndurance,evidence:resolvePowerEvidence(evidenceDeviceFrom(built))}:undefined));
    setHasSimulated(true);
    setDirty(false);
  }

  function loadExample() {
    dispatchExperience({type:'mode',value:'advanced'});
    setExampleLoaded(true);
    setForm(flagshipExample);
    setCameras(flagshipCameras);
    setWorkloadPower({ ...initialWorkloadInputs, gaming: '6' });
    setWorkloadWeights(initialWorkloadInputs);
    setUsablePercent('');
    setRun(null);
    setProfileMode('equal');
    setDirty(false);
    setHasSimulated(false);
  }

  function applyBatteryScenario(capacityMah: string) {
    setConfigurationSource('custom');
    setDirty(true);
    setForm((current) => ({
      ...current,
      batteryCapacityMah: capacityMah,
      batteryVoltageV: current.batteryVoltageV || '3.85',
    }));
  }

  function applyLikelyConfiguration() {
    setConfigurationSource('likely');
    setProcessorScenario('exynos2700');
    setDirty(true);
    setForm((current) => ({
      ...current,
      name: current.name || 'Galaxy S27 Ultra',
      formFactor: 'phone',
      batteryCapacityMah: '5700',
      batteryVoltageV: current.batteryVoltageV || '3.85',
    }));
  }

  function applyWorstCaseConfiguration() {
    setConfigurationSource('worst');
    setProcessorScenario('snapdragon8eg6');
    setDirty(true);
    setForm((current) => ({
      ...current,
      name: current.name || 'Galaxy S27 Ultra',
      formFactor: 'phone',
      batteryCapacityMah: '5700',
      batteryVoltageV: current.batteryVoltageV || '3.85',
    }));
  }

  function saveSimulationLocally() {
    const payload = {
      name: simulationName.trim() || 'Untitled simulation',
      processorScenario,
      configurationSource,
      batteryCapacityMah: form.batteryCapacityMah,
      experience,
      efficiencyAssumption,
      ambientTemperature,
      cpuLoad,
      gpuLoad,
      savedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('pf-saved-simulations') || '[]');
      const next = Array.isArray(existing) ? [payload, ...existing].slice(0, 20) : [payload];
      localStorage.setItem('pf-saved-simulations', JSON.stringify(next));
      setSavedNotice('Saved on this device');
      window.setTimeout(() => setSavedNotice(''), 2200);
    } catch {
      setSavedNotice('Could not save locally');
    }
  }

  function clearSimulation() {
    dispatchExperience({type:'reset'});
    setExampleLoaded(false);
    setForm(initialForm);
    setCameras([]);
    setWorkloadPower(initialWorkloadInputs);
    setWorkloadWeights(initialWorkloadInputs);
    setUsablePercent('');
    setRun(null);
    setProfileMode('equal');
    setDirty(false);
    setHasSimulated(false);
  }

  const display = result?.displays.primary;
  const pack = result?.battery;
  const packaging = result?.packaging;

  const knownCameraVolumeMm3 = result?.cameras
    ?.map((camera) => camera.moduleVolumeMm3)
    .filter((volume): volume is number => volume !== undefined)
    .reduce((total, volume) => total + volume, 0);

  const estimate = battery?.result.status === 'resolved'
    ? battery.result.estimate
    : undefined;

  return (
    <div className="il-app">
      <nav className="il-mode-tabs" aria-label="Interactive Leaks modes">
        {(['build','test','compare','results'] as const).map((item) => (
          <button
            type="button"
            key={item}
            className={stage===item?'is-active':''}
            onClick={()=>setStage(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="il-toolbar">
        <div>
          <span className="il-status">Instrument · Public Beta</span>

          <span className="il-engine">
            Engine v{SIMULATION_ENGINE_VERSION} · Battery model{' '}
            {BATTERY_EXPERIENCE_VERSION}
          </span>
        </div>

        <div className="il-toolbar-actions">
          <button type="button" className="il-chip" onClick={loadExample}>
            Load illustrative example
          </button>

          <button type="button" className="il-chip" onClick={clearSimulation}>
            Clear
          </button>
        </div>
      </div>

      <fieldset className="il-mode"><legend>Simulation mode</legend>{(['simple','advanced'] as const).map(mode=><label key={mode}><input type="radio" name="simulation-mode" checked={experience.mode===mode} onChange={()=>changeExperience({type:'mode',value:mode})}/>{mode==='simple'?'Simple':'Advanced'}</label>)}</fieldset>
      {exampleLoaded&&<p className="il-input-note">Illustrative example — not a real device, leak or measured benchmark. All example values are assumptions; edits remain unverified user inputs.</p>}

      {stage==='build' && <section className="il-product-config" aria-label="Device configuration">
        <div className="il-config-main">
          <div className="il-config-source">
            <div className="il-config-label">
              <span>Configuration source</span>
              <small>Choose a likely rumor set, a conservative case, or tune it yourself.</small>
            </div>
            <div className="il-config-source-actions">
              <button type="button" className={configurationSource==='likely'?'is-active':''} onClick={applyLikelyConfiguration}>Most likely</button>
              <button type="button" className={configurationSource==='worst'?'is-active':''} onClick={applyWorstCaseConfiguration}>Worst case</button>
              <button type="button" className={configurationSource==='custom'?'is-active':''} onClick={()=>setConfigurationSource('custom')}>Custom</button>
            </div>
          </div>

          <div className="il-rumor-group">
            <div className="il-rumor-heading">
              <strong>Processor</strong>
              <span>Scenario metadata</span>
            </div>
            <div className="il-option-grid">
              <button type="button" className={processorScenario==='exynos2700'?'il-option is-selected':'il-option'} onClick={()=>{setProcessorScenario('exynos2700');setConfigurationSource('custom');}}>
                <span><strong>Exynos 2700</strong><small>68% rumor confidence</small></span>
                <b>68%</b>
              </button>
              <button type="button" className={processorScenario==='snapdragon8eg6'?'il-option is-selected':'il-option'} onClick={()=>{setProcessorScenario('snapdragon8eg6');setConfigurationSource('custom');}}>
                <span><strong>Snapdragon 8 Elite Gen 6</strong><small>40% rumor confidence</small></span>
                <b>40%</b>
              </button>
            </div>
            <p className="il-config-note">Processor selection is saved with the scenario UI, but benchmark and thermal modeling are not enabled in this beta yet.</p>
          </div>

          <div className="il-rumor-group">
            <div className="il-rumor-heading">
              <strong>Battery</strong>
              <span>Feeds the deterministic battery model</span>
            </div>
            <div className="il-option-grid">
              <button type="button" className={form.batteryCapacityMah==='5700'?'il-option is-selected':'il-option'} onClick={()=>applyBatteryScenario('5700')}>
                <span><strong>5,700 mAh</strong><small>Most likely current assumption</small></span>
                <b>65%</b>
              </button>
              <button type="button" className={form.batteryCapacityMah==='5800'?'il-option is-selected':'il-option'} onClick={()=>applyBatteryScenario('5800')}>
                <span><strong>5,800 mAh</strong><small>Higher-capacity scenario</small></span>
                <b>35%</b>
              </button>
            </div>

            <label className="il-slider-control il-battery-tune">
              <span><strong>Fine tune capacity</strong><b>{form.batteryCapacityMah || '5700'} mAh</b></span>
              <input
                type="range"
                min="5200"
                max="6000"
                step="50"
                value={Number(form.batteryCapacityMah || 5700)}
                onChange={(event)=>applyBatteryScenario(event.currentTarget.value)}
              />
              <small>This slider directly changes the battery input used by the current deterministic battery model.</small>
            </label>
          </div>
        </div>

        <div className="il-config-side">
          <aside className="il-assumptions-panel">
            <div className="il-live-preview-head">
              <span>Environment assumptions</span>
              <small>Scenario controls</small>
            </div>

            <label className="il-slider-control">
              <span><strong>Efficiency assumption</strong><b>{efficiencyAssumption > 0 ? '+' : ''}{efficiencyAssumption}%</b></span>
              <input type="range" min="-20" max="20" step="1" value={efficiencyAssumption} onChange={(event)=>setEfficiencyAssumption(Number(event.currentTarget.value))} />
            </label>

            <label className="il-slider-control">
              <span><strong>Ambient temperature</strong><b>{ambientTemperature}°C</b></span>
              <input type="range" min="0" max="45" step="1" value={ambientTemperature} onChange={(event)=>setAmbientTemperature(Number(event.currentTarget.value))} />
            </label>

            <label className="il-slider-control">
              <span><strong>CPU load</strong><b>{cpuLoad}%</b></span>
              <input type="range" min="0" max="100" step="5" value={cpuLoad} onChange={(event)=>setCpuLoad(Number(event.currentTarget.value))} />
            </label>

            <label className="il-slider-control">
              <span><strong>GPU load</strong><b>{gpuLoad}%</b></span>
              <input type="range" min="0" max="100" step="5" value={gpuLoad} onChange={(event)=>setGpuLoad(Number(event.currentTarget.value))} />
            </label>

            <p className="il-config-note">These environment controls are captured as scenario assumptions. Temperature, CPU load, GPU load and efficiency are not yet applied to benchmark or thermal calculations, so they do not silently alter the current deterministic battery result.</p>
          </aside>

          <aside className="il-live-preview">
            <div className="il-live-preview-head">
              <span>Live preview</span>
              <small>{dirty ? 'Pending rerun' : hasSimulated ? 'Current result' : 'Input preview'}</small>
            </div>
            <div className="il-live-row"><span>Processor</span><strong>{processorScenario==='exynos2700'?'Exynos 2700':'Snapdragon 8 Elite Gen 6'}</strong></div>
            <div className="il-live-row"><span>Battery</span><strong>{form.batteryCapacityMah ? `${form.batteryCapacityMah} mAh` : 'Unknown'}</strong></div>
            <div className="il-live-row"><span>Usage</span><strong>{simple ? experience.preset : 'Advanced'}</strong></div>
            <div className="il-live-row"><span>Battery result</span><strong>{hasSimulated && run ? headlineText(run) : 'Run simulation'}</strong></div>
          </aside>
        </div>
      </section>}

      {stage==='compare' && (
        <section className="il-compare-view">
          <div className="il-compare-head">
            <div>
              <span className="eyebrow">Compare scenarios</span>
              <h2>Exynos 2700 vs Snapdragon 8 Elite Gen 6</h2>
              <p>Compare the assumptions attached to each scenario without pretending unsupported benchmark differences are known.</p>
            </div>
          </div>
          <div className="il-compare-grid">
            <article>
              <span className="il-pill">Scenario A</span>
              <h3>Exynos 2700</h3>
              <dl>
                <div><dt>Rumor confidence</dt><dd>68%</dd></div>
                <div><dt>Battery</dt><dd>{form.batteryCapacityMah || 'Unknown'} mAh</dd></div>
                <div><dt>Usage</dt><dd>{simple ? experience.preset : 'Advanced'}</dd></div>
              </dl>
            </article>
            <article>
              <span className="il-pill">Scenario B</span>
              <h3>Snapdragon 8 Elite Gen 6</h3>
              <dl>
                <div><dt>Rumor confidence</dt><dd>40%</dd></div>
                <div><dt>Battery</dt><dd>{form.batteryCapacityMah || 'Unknown'} mAh</dd></div>
                <div><dt>Usage</dt><dd>{simple ? experience.preset : 'Advanced'}</dd></div>
              </dl>
            </article>
          </div>
          <p className="il-config-note">Compare currently exposes scenario assumptions only. CPU, GPU and thermal deltas remain unresolved until those models are supported.</p>
        </section>
      )}

      {(stage==='build' || stage==='test' || stage==='results') && <div className={stage==='results'?'il-workspace il-results-only':'il-workspace'}>
        {/* ---------------- Builder column ---------------- */}
        {stage!=='results' && <section className="il-builder" aria-label="Simulation inputs">
          {/* 01 · DEVICE */}
          {stage==='build' && <details className="il-engineering-panel">
            <summary>
              <span>
                <strong>Advanced engineering inputs</strong>
                <small>Dimensions, display geometry, cell geometry, cameras and internal packaging</small>
              </span>
              <b>Open</b>
            </summary>
            <div className="il-section">
            <SectionHeading
              index="01"
              title="Device"
              hint="Enter only values you have. Blank means unknown; typed values are user-supplied, not independently verified."
            />

            <p className="il-help">Use rated battery capacity where known. Advertised/typical capacity is not a substitute; leave rated capacity unknown if unavailable.</p>
            <div className="il-grid">
              <label className="il-field il-wide">
                <span>Device name</span>

                <input
                  type="text"
                  maxLength={160}
                  value={form.name}
                  placeholder="Untitled concept"
                  onChange={(event) => update('name', event.currentTarget.value)}
                />
              </label>

              <label className="il-field">
                <span>Form factor</span>

                <select
                  value={form.formFactor}
                  onChange={(event) =>
                    update(
                      'formFactor',
                      event.currentTarget.value as DeviceFormFactor,
                    )
                  }
                >
                  <option value="phone">Phone</option>
                  <option value="book_foldable">Book foldable</option>
                  <option value="flip_foldable">Flip foldable</option>
                  <option value="tablet">Tablet</option>
                  <option value="laptop">Laptop</option>
                  <option value="wearable">Wearable</option>
                </select>
              </label>

              <NumericField
                label="Width"
                suffix="mm"
                value={form.widthMm}
                placeholder="75"
                onChange={(value) => update('widthMm', value)}
              />

              <NumericField
                label="Height"
                suffix="mm"
                value={form.heightMm}
                placeholder="160"
                onChange={(value) => update('heightMm', value)}
              />

              <NumericField
                label="Thickness"
                suffix="mm"
                value={form.thicknessMm}
                placeholder="8"
                onChange={(value) => update('thicknessMm', value)}
              />

              <NumericField
                label="Device mass"
                suffix="g"
                value={form.weightG}
                placeholder="195"
                onChange={(value) => update('weightG', value)}
              />

              <NumericField
                label="Rated battery capacity"
                suffix="mAh"
                value={form.batteryCapacityMah}
                placeholder="5000"
                onChange={(value) => update('batteryCapacityMah', value)}
              />

              <NumericField
                label="Nominal voltage"
                suffix="V"
                value={form.batteryVoltageV}
                placeholder="3.85"
                onChange={(value) => update('batteryVoltageV', value)}
              />

              <NumericField
                label="Display diagonal"
                suffix="in"
                value={form.diagonalInches}
                placeholder="6.7"
                onChange={(value) => update('diagonalInches', value)}
              />

              <NumericField
                label="Resolution width"
                suffix="px"
                value={form.resolutionWidthPx}
                placeholder="1440"
                step="1"
                onChange={(value) => update('resolutionWidthPx', value)}
              />
            </div>

            <div className="il-grid">                  <NumericField
                    label="Resolution height"
                    suffix="px"
                    value={form.resolutionHeightPx}
                    placeholder="3200"
                    step="1"
                    onChange={(value) => update('resolutionHeightPx', value)}
                  /></div>
            <details className="il-advanced" open={advancedOpen}>
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setAdvancedOpen((open) => !open);
                }}
              >
                Advanced · panel, cell & envelope detail
              </summary>

              <div className="il-advanced-body">
                <p className="il-group-label">Display geometry</p>

                <div className="il-grid">


                  <NumericField
                    label="Aspect width"
                    value={form.aspectWidth}
                    placeholder="9"
                    onChange={(value) => update('aspectWidth', value)}
                  />

                  <NumericField
                    label="Aspect height"
                    value={form.aspectHeight}
                    placeholder="20"
                    onChange={(value) => update('aspectHeight', value)}
                  />

                  <div aria-hidden="true" />
                </div>

                <p className="il-group-label">Bezels</p>

                <div className="il-grid">
                  <NumericField
                    label="Top bezel"
                    suffix="mm"
                    value={form.bezelTopMm}
                    placeholder="1.5"
                    onChange={(value) => update('bezelTopMm', value)}
                  />

                  <NumericField
                    label="Right bezel"
                    suffix="mm"
                    value={form.bezelRightMm}
                    placeholder="1.5"
                    onChange={(value) => update('bezelRightMm', value)}
                  />

                  <NumericField
                    label="Bottom bezel"
                    suffix="mm"
                    value={form.bezelBottomMm}
                    placeholder="1.5"
                    onChange={(value) => update('bezelBottomMm', value)}
                  />

                  <NumericField
                    label="Left bezel"
                    suffix="mm"
                    value={form.bezelLeftMm}
                    placeholder="1.5"
                    onChange={(value) => update('bezelLeftMm', value)}
                  />
                </div>

                <p className="il-group-label">Cell geometry & weight</p>

                <div className="il-grid">
                  <NumericField
                    label="Cell width"
                    suffix="mm"
                    value={form.batteryWidthMm}
                    placeholder="60"
                    onChange={(value) => update('batteryWidthMm', value)}
                  />

                  <NumericField
                    label="Cell height"
                    suffix="mm"
                    value={form.batteryHeightMm}
                    placeholder="80"
                    onChange={(value) => update('batteryHeightMm', value)}
                  />

                  <NumericField
                    label="Cell thickness"
                    suffix="mm"
                    value={form.batteryThicknessMm}
                    placeholder="5"
                    onChange={(value) => update('batteryThicknessMm', value)}
                  />

                  <NumericField
                    label="Cell weight"
                    suffix="g"
                    value={form.batteryWeightG}
                    placeholder="70"
                    onChange={(value) => update('batteryWeightG', value)}
                  />
                </div>

                <p className="il-group-label">Internal volume budget</p>

                <div className="il-grid">
                  <NumericField
                    label="Reserved volume"
                    suffix="%"
                    value={form.reservedVolumePercent}
                    placeholder="20"
                    onChange={(value) => update('reservedVolumePercent', value)}
                  />

                  <NumericField
                    label="Thermal"
                    suffix="mm³"
                    value={form.thermalMm3}
                    onChange={(value) => update('thermalMm3', value)}
                  />

                  <NumericField
                    label="Logic board"
                    suffix="mm³"
                    value={form.boardMm3}
                    onChange={(value) => update('boardMm3', value)}
                  />

                  <NumericField
                    label="Speakers"
                    suffix="mm³"
                    value={form.speakersMm3}
                    onChange={(value) => update('speakersMm3', value)}
                  />

                  <NumericField
                    label="Other known components"
                    suffix="mm³"
                    value={form.otherMm3}
                    onChange={(value) => update('otherMm3', value)}
                  />
                </div>

                <p className="il-help">
                  Camera modules (type, sensor, optics, module geometry) can be
                  added below. Module volume is derived from what you supply —
                  nothing is estimated.
                </p>
              </div>
            </details>

            {cameras.length > 0 && (
              <div className="il-camera-list">
                {cameras.map((camera, index) => (
                  <article className="il-camera" key={camera.id}>
                    <div className="il-camera-title">
                      <strong>{({wide:'Main',ultrawide:'Ultrawide',telephoto:'Telephoto',periscope:'Periscope telephoto',front:'Front',other:'Other'})[camera.type]} · Camera {index + 1}</strong>

                      <button
                        type="button"
                        className="il-remove"
                        onClick={() => removeCamera(camera.id)}
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
                          <option value="wide">Main</option>
                          <option value="ultrawide">Ultrawide</option>
                          <option value="telephoto">Telephoto</option>
                          <option value="periscope">Periscope telephoto</option>
                          <option value="front">Front</option>
                          <option value="other">Other</option>
                        </select>
                      </label>

                      <NumericField
                        label="Sensor format"
                        suffix="1/x″"
                        value={camera.sensorFormatDenominator}
                        placeholder="1.3"
                        onChange={(value) =>
                          updateCamera(camera.id, { sensorFormatDenominator: value })
                        }
                      />

                      <NumericField
                        label="Resolution"
                        suffix="MP"
                        value={camera.resolutionMp}
                        placeholder="50"
                        onChange={(value) =>
                          updateCamera(camera.id, { resolutionMp: value })
                        }
                      />

                      <NumericField
                        label="Equivalent focal length"
                        suffix="mm"
                        value={camera.equivalentFocalLengthMm}
                        placeholder="24"
                        onChange={(value) =>
                          updateCamera(camera.id, {
                            equivalentFocalLengthMm: value,
                          })
                        }
                      />

                      <NumericField
                        label="Aperture"
                        suffix="f/"
                        value={camera.apertureFNumber}
                        placeholder="1.6"
                        onChange={(value) =>
                          updateCamera(camera.id, { apertureFNumber: value })
                        }
                      />
                    </div>
                    <details className="il-advanced"><summary>Advanced · camera optics and module dimensions</summary><div className="il-grid">
                      {([['physicalFocalLengthMm','Physical focal length'],['moduleWidthMm','Module width'],['moduleHeightMm','Module height'],['moduleDepthMm','Module depth']] as const).map(([key,label])=><NumericField key={key} label={label} suffix="mm" value={camera[key]} onChange={value=>updateCamera(camera.id,{[key]:value})}/>)}
                    </div></details>
                    <p className="il-help">For 1/1.3″ sensor format, enter 1.3. Optical format is an approximation, not a physical sensor diagonal.</p>
                  </article>
                ))}
              </div>
            )}

            <button type="button" className="il-chip il-add" onClick={addCamera}>
              + Add camera module
            </button>
            </div>
          </details>}

          {/* 02 · ENVIRONMENT */}
          {stage==='test' && <div className="il-section">
            <SectionHeading
              index="02"
              title="Environment"
              hint={simple?'Your daily usage pattern, including idle time.':'How the device is used during the simulated session: per-workload power and pack derating.'}
            />

            {simple?<div className="il-simple-usage">
              <h3>How do you use this phone?</h3>
              <p>Tell us how you typically use your phone. Interactive Leaks combines your usage with the device model to estimate battery life.</p>
              <fieldset className="il-mode"><legend>Daily usage profile</legend>{(['Light','Typical','Heavy','Custom'] as UsagePreset[]).map(preset=><label key={preset}><input type="radio" name="usage-profile" checked={experience.preset===preset} onChange={()=>changeExperience({type:'preset',value:preset})}/>{preset}</label>)}</fieldset>
              <p className="il-help">Usage presets describe a daily pattern, not scientific measurements or continuous screen-on time. Remaining time is idle; active durations may total less than 24 hours.</p>
              {experience.preset==='Custom'?<div className="il-grid">{ACTIVE_WORKLOADS.map(key=><label className="il-field" key={key}><span>{key==='web_browsing'?'Web browsing / social':WORKLOAD_LABEL[key]} <small>minutes per day</small></span><input type="number" min="0" max="1440" step="any" inputMode="decimal" value={usage[key]===INVALID_NUMBER?'':usage[key]} aria-invalid={numeric(usage[key])===undefined||(numeric(usage[key])??0)<0||(numeric(usage[key])??0)>1440} onChange={captureNumericValue(value=>changeExperience({type:'duration',key,value}))}/></label>)}</div>:<p className="il-help">{ACTIVE_WORKLOADS.map(key=>WORKLOAD_LABEL[key]+': '+usage[key]+' min').join(' · ')}</p>}
              <p className="il-help">Idle time: {usageBreakdown.issues.length?'Unknown':format(usageBreakdown.idleMinutes/60,1)} h/day. This contributes to the daily usage mix, not screen-on time.</p>
              <label className="il-power-choice"><input type="checkbox" checked={experience.useEnteredPower} onChange={event=>changeExperience({type:'power',value:event.currentTarget.checked})}/>Use power values I entered in Advanced (unverified)</label>
              <p className="il-help">You never need to know wattage. Power comes from measured runtimes of released reference phones in the PhoneFuturist calibration set and is reported as calibrated — never as a measurement of your device.</p>
              {evidence?<><details className="il-advanced"><summary>View assumptions</summary>
                <p className="il-help">{evidence.notes.map(note=><span key={note}>{note} </span>)}</p>
                <p className="il-help">{evidence.assumptions.map(note=><span key={note}>{note} </span>)}</p>
                <h3>Evidence per workload</h3>
                <ul className="il-evidence-list">{Object.values(workloadEvidence(evidence)).map(entry=><li key={entry.workload}><strong>{WORKLOAD_LABEL[entry.workload]}</strong>: {entry.powerW?`${format(entry.powerW.min,2)}–${format(entry.powerW.max,2)} W`:'no power value'} · {entry.provenance?.kind??entry.status}<small> {entry.note}</small></li>)}</ul>
                <p className="il-help">Evidence model {evidence.version} · {evidence.referenceCount} reference devices.</p>
              </details>
              {endurancePreview&&<p className="il-help">Profile: {format(endurancePreview.activeHours,1)} h active/day; {format(endurancePreview.unevidencedHours,1)} h of the full day lacks power evidence. Reference-only continuous Wi-Fi web {format(evidence.screenOnBudgetHours.min,1)}–{format(evidence.screenOnBudgetHours.max,1)} h.</p>}</>
              :<><p className="il-help">{INSUFFICIENT_EVIDENCE_MESSAGE}</p><p className="il-help">You can <button type="button" className="il-link" onClick={()=>changeExperience({type:'mode',value:'advanced'})}>open Advanced Mode</button> to supply your own measured power values instead.</p></>}
            </div>:<>
            <label className="il-field"><span>Mixed-use profile</span><select value={profileMode} onChange={captureValue(value=>{setProfileMode(value as ProfileMode);setDirty(true);})}>
              <option value="equal">Equal shares of supplied workloads</option><option value="percent">Custom percentage shares</option><option value="manual">I already know mixed-use average power</option>
            </select></label>
            <p className="il-help">Average device power (W) means the whole device's average draw during that workload. It is not charger wattage or a chip's rated power.</p>
            <div className="il-workload-grid">
              {(profileMode==='manual'?['mixed_use' as const]:COMPONENT_WORKLOADS).map(workload=><label className={workloadPower[workload].trim()?'il-workload active':'il-workload'} key={workload}>
                <span className="il-workload-name">{WORKLOAD_LABEL[workload]}</span><span className="il-workload-unit">Average device power (W)</span>
                <input type="number" inputMode="decimal" step="any" value={workloadPower[workload]===INVALID_NUMBER?'':workloadPower[workload]} aria-invalid={workloadPower[workload]===INVALID_NUMBER || (numeric(workloadPower[workload])??1)<=0} placeholder="Unknown" aria-label={WORKLOAD_LABEL[workload]+' average device power (W)'} onChange={captureNumericValue(value=>{setDirty(true);setWorkloadPower(current=>({...current,[workload]:value}));})}/>
              </label>)}
            </div>
            <p className="il-help">{profileMode==='equal'?'Equal shares: only workloads with supplied power participate. Each receives the same share of mixed-use time.':profileMode==='manual'?'The supplied mixed-use power is the entire profile. Individual workloads are not added to it.':'How much each workload contributes to the mixed-use profile. Shares describe percentages of time, not hours or power.'}</p>
            {profileMode==='percent'&&<details className="il-advanced" open><summary>Advanced · share of mixed use (%)</summary>
              <p className="il-help">Total must be 100%. Enter 0% to exclude a workload. A positive share always needs a power value.</p>
              <div className="il-grid">{COMPONENT_WORKLOADS.map(workload=><NumericField key={workload} label={WORKLOAD_LABEL[workload]+' share of mixed use'} suffix="%" value={workloadWeights[workload]} placeholder="Not assigned" onChange={value=>{setDirty(true);setWorkloadWeights(current=>({...current,[workload]:value}));}}/>)}</div>
              <p className="il-profile-total" role="status">Current total: {format(profile.totalPercent,2)}% {profile.issues.length===0?'— valid profile':'— incomplete or invalid'}</p>
            </details>}

            <div className="il-grid il-derate"><NumericField label="Usable pack energy" suffix="%" value={usablePercent} placeholder="Full rated pack" onChange={value=>{setUsablePercent(value);setDirty(true);}}/>
              <p className="il-help">Percentage of rated/nominal battery energy available after protection reserves and voltage cutoff. Empty preserves full rated pack energy (100%) under this model; that can make runtime optimistic. This is not the battery's current charge level.</p>
            </div>
            </>}
            {profile.issues.length>0&&<ul className="il-profile-issues">{profile.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul>}
          </div>}

          {/* 03 · MODEL */}
          {stage==='test' && <div className="il-section il-section-last">
            <SectionHeading
              index="03"
              title="Model"
              hint="What PhoneFuturist currently knows — the versioned engine and battery model that will evaluate this configuration."
            />

            <ul className="il-model-list">
              <li>
                <strong>Deterministic core</strong>
                <span>
                  Engine v{SIMULATION_ENGINE_VERSION} · display PPI, screen-to-body,
                  pack energy, energy density, internal volume budget
                </span>
              </li>

              <li>
                <strong>Battery runtime model</strong>
                <span>
                  {BATTERY_EXPERIENCE_VERSION} · workload power mixture,
                  interval arithmetic, provenance-aware confidence
                </span>
              </li>

              <li>
                <strong>Evidence discipline</strong>
                <span>
                  Unknown inputs stay unknown; the result explains every
                  assumption it made
                </span>
              </li>
            </ul>
          </div>}

          {stage==='test' && <div className="il-save-card">
            <label>
              <span>Simulation name</span>
              <input type="text" value={simulationName} onChange={(event)=>setSimulationName(event.currentTarget.value)} maxLength={120} />
            </label>
            <button type="button" className="il-chip" onClick={saveSimulationLocally}>Save simulation</button>
            {savedNotice && <small>{savedNotice}</small>}
          </div>}

          {stage==='test' && <div className="il-run">
            <button
              type="button"
              className="il-simulate"
              onClick={simulate}
            >
              Run simulation →
            </button>
            {hasSimulated&&<a className="il-chip" href="#simulation-results">View results ↓</a>}
            <p>
              Device + Environment + Model. Nothing invented between the
              three.
            </p>
          </div>}
        </section>}

        {/* ---------------- Result column ---------------- */}
        {(stage==='results' || stage==='test') && <aside id="simulation-results" className="il-results" aria-live="polite" aria-label="Simulation results">
          <div className="il-results-top">
            <span className="eyebrow">Simulation result</span>

            <span>v{SIMULATION_ENGINE_VERSION}</span>
          </div>

          {hasSimulated&&dirty&&<p className="il-input-note">Inputs changed. Run again to update these results.</p>}
          {!hasSimulated ? (
            <div className="il-result-empty">
              <div className="il-orbit" aria-hidden="true">
                <span />
              </div>

              <h2>Nothing simulated yet.</h2>

              <p>
                Configure a device, add environment power if you have it, then
                run the model. Load the example to see a complete
                configuration.
              </p>
            </div>
          ) : !result ? <div className="il-result-empty"><h2>Cannot estimate yet.</h2><ul>{run?.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul><p>Your inputs are still available. Correct the highlighted values and run again.</p>{simple?<p>If the evidence itself is missing, Advanced mode lets you supply your own measured whole-device power instead.</p>:null}</div> : (
            <>
              <div className="il-result-identity">
                <span>
                  {simulationInput?.formFactor.replaceAll('_', ' ').toUpperCase()}
                </span>

                <h2>{simulationInput?.name || 'Untitled concept'}</h2>
              </div>

              {/* Hero runtime card (only when the environment layer ran) */}
              {(
                <div className="il-runtime-card">
                  <span className="il-runtime-eyebrow">
                    {run ? headlineLabel(run) : "Simulation result"}
                  </span>

                  {battery?.result.status === 'resolved' ? (
                    <>
                      <p className={`il-runtime-value${run?.context.mode==='simple'?' il-runtime-unknown':''}`}>
                        {run ? headlineText(run) : hoursLabel(estimate?.runtimeHours)}
                      </p>

                      <p className="il-help">{run?.context.usageProfile} usage · simulated estimate, not measured battery life.</p>

                      {run?.endurance&&<p className="il-help">{enduranceHeadline?.detail}</p>}
                      {run?.endurance?.verdict==='insufficient-evidence'&&<button type="button" className="il-link" onClick={()=>changeExperience({type:'mode',value:'advanced'})}>Open Advanced Mode</button>}
                      {run&&<ShareResult key={JSON.stringify(run)} run={run}/>}
                      <details className="il-evidence"><summary>View assumptions</summary>
                      {run&&receiptSections(run,'Not exported').filter(section=>['ENVIRONMENT','MODEL','ASSUMPTIONS / PROVENANCE','WARNINGS / MISSING INFORMATION'].includes(section.title)).map(section=><section key={section.title}><h3>{section.title}</h3><ul>{section.lines.map((line,index)=><li key={index}>{line}</li>)}</ul></section>)}
                      <p className="il-help">{format(estimate?.usableEnergyWh?.min,2)} Wh usable energy ÷ {wattsLabel(battery.result.comparisonReady?.averagePowerW)} mixed-use average power.</p>
                      <p className="il-help">{run?.profile.mode==='manual'?'Uses your supplied mixed-use power.':run?.profile.terms.map(term=>WORKLOAD_LABEL[term.workload]+' '+format(term.power,2)+' W × '+format(term.share*100,2)+'%').join(' + ')}</p>
                      <p className="il-help">A calculation from your supplied values, not a measured battery-life test. Ranges appear only when the model receives bounded energy or power inputs; this workspace currently accepts point values.</p>
                      {estimate?.assumptions.map((a,index)=><p className="il-help" key={index}>{a.message}</p>)}
                      </details>
                      {run?.context.mode==='advanced'&&<><div className="il-runtime-bar" aria-hidden="true">
                        <span
                          style={{
                            width: `${runtimeBarPercent(estimate?.runtimeHours) ?? 0}%`,
                          }}
                        />
                      </div>

                      <span className="il-runtime-scale">
                        0 h · 24 h day · 30 h scale
                      </span>

                      </>}
                      {(evidenceConfidence||battery.result.confidence) && (
                        <span
                          className={`il-confidence il-confidence-${evidenceConfidence??battery.result.confidence}`}
                        >
                          {evidenceConfidence?EVIDENCE_CONFIDENCE_LABEL[evidenceConfidence]:CONFIDENCE_LABEL[battery.result.confidence!]}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="il-runtime-value il-runtime-unknown">
                        Cannot estimate yet
                      </p>

                      <ul className="il-profile-issues">{run?.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul>
                    </>
                  )}
                </div>
              )}

              <details className="il-evidence"><summary>Supporting device and engineering metrics</summary>
              {/* Device-layer deterministic metrics */}
              <div className="il-result-group">
                <span className="il-result-label">Display</span>

                <div className="il-metrics">
                  <div>
                    <strong>
                      {format(
                        simulationInput?.displays.primary.diagonalInches,
                        2,
                      )}
                      {simulationInput?.displays.primary.diagonalInches !==
                      undefined
                        ? '″'
                        : ''}
                    </strong>
                    <span>Diagonal</span>
                  </div>

                  <div>
                    <strong>{format(display?.ppi, 0)}</strong>
                    <span>PPI</span>
                  </div>

                  <div>
                    <strong>
                      {format(display?.screenToBodyRatio, 1)}
                      {display?.screenToBodyRatio !== undefined ? '%' : ''}
                    </strong>
                    <span>Screen to body</span>
                  </div>
                </div>
              </div>

              <div className="il-result-group">
                <span className="il-result-label">Battery pack</span>

                <div className="il-metrics">
                  <div>
                    <strong>{format(pack?.totalCapacityMah, 0)}</strong>
                    <span>mAh</span>
                  </div>

                  <div>
                    <strong>{format(pack?.totalEnergyWh, 2)}</strong>
                    <span>Wh</span>
                  </div>

                  <div>
                    <strong>{format(pack?.totalVolumeCm3, 2)}</strong>
                    <span>cm³</span>
                  </div>
                </div>
              </div>

              {estimate && estimate.workloads.length > 0 && (
                <div className="il-result-group">
                  <span className="il-result-label">Workload mixture</span>

                  <div className="il-workload-results">
                    {estimate.workloads.map((entry) => (
                      <div className="il-workload-result" key={entry.workload}>
                        <div>
                          <strong>{WORKLOAD_LABEL[entry.workload]}</strong>

                          <span>
                            {wattsLabel(entry.averagePowerW)} ·{' '}
                            {Math.round(entry.weightShare * 100)}% of profile
                          </span>
                        </div>

                        <b>{wattsLabel(entry.weightedPowerW)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="il-result-group">
                <span className="il-result-label">Camera system</span>

                <div className="il-metrics">
                  <div>
                    <strong>{result.cameras?.length ?? 'Unknown'}</strong>
                    <span>Modules</span>
                  </div>

                  <div>
                    <strong>
                      {knownCameraVolumeMm3 !== undefined
                        ? format(knownCameraVolumeMm3 / 1000, 2)
                        : 'Unknown'}
                    </strong>
                    <span>Known volume cm³</span>
                  </div>
                </div>
              </div>

              <div className="il-result-group">
                <span className="il-result-label">Internal volume</span>

                <div className="il-volume-number">
                  <strong>
                    {format(packaging?.knownComponentVolumeCm3, 2)}
                  </strong>

                  <span>/</span>

                  <strong>
                    {format(packaging?.availableInternalVolumeCm3, 2)}
                  </strong>

                  <small>cm³ known / available</small>
                </div>

                <div className="il-metrics">
                  <div>
                    <strong>{format(packaging?.remainingVolumeCm3, 2)}</strong>
                    <span>cm³ remaining</span>
                  </div>

                  <div>
                    <strong>
                      {format(packaging?.usedInternalVolumePercent, 1)}
                      {packaging?.usedInternalVolumePercent !== undefined
                        ? '%'
                        : ''}
                    </strong>
                    <span>Known allocation</span>
                  </div>
                </div>
              </div>

              {packaging?.fitsAvailableVolume !== undefined && (
                <div
                  className={`il-verdict ${
                    packaging.fitsAvailableVolume ? 'passes' : 'fails'
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

              </details>
              {/* Provenance, assumptions, confidence detail */}
              {(estimate?.assumptions.length ?? 0) > 0 && (
                <details className="il-evidence">
                  <summary>Assumptions ({estimate?.assumptions.length})</summary>

                  <ul>
                    {estimate?.assumptions.map((assumption, index) => (
                      <li key={`${assumption.code}-${index}`}>
                        <strong>{assumption.code}</strong>

                        <span>{assumption.message}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {battery?.result.confidenceNotes &&
                battery.result.confidenceNotes.length > 0 && (
                  <details className="il-evidence">
                    <summary>
                      Confidence notes ({battery.result.confidenceNotes.length})
                    </summary>

                    <ul>
                      {battery.result.confidenceNotes.map((note, index) => (
                        <li key={index}>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

              {(battery?.warnings.length ?? 0) > 0 && (
                <details className="il-evidence" open>
                  <summary>Warnings ({battery?.warnings.length})</summary>

                  <ul>
                    {battery?.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>
                        <strong>{warning.code}</strong>

                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {result.warnings.length > 0 && (
                <details className="il-warnings"><summary>Constraints and unresolved device inputs ({result.warnings.length})</summary>
                  <span className="il-result-label">Engine notes</span>

                  {result.warnings.map((warning, index) => (
                    <div className="il-warning" key={`${warning.code}-${index}`}>
                      <strong>{warning.code}</strong>

                      <p>{warning.message}</p>
                    </div>
                  ))}
                </details>
              )}

              <div className="il-method">
                <strong>Deterministic where it can be.</strong>

                <p>
                  This result uses only the values supplied above, evaluated by
                  PhoneFuturist Engine v{SIMULATION_ENGINE_VERSION} and battery
                  model {BATTERY_EXPERIENCE_VERSION}. The same inputs always
                  produce the same result.
                </p>
              </div>
            </>
          )}
        </aside>}
      </div>}

      {/* Honest scope: what the Beta does not simulate yet */}
      <div className="il-scope">
        <strong>Public Beta scope</strong>

        <p>
          The deterministic device core and the battery runtime model are
          available. This beta does not simulate benchmark scores, thermal
          behavior or image quality. Camera results describe geometry only.
        </p>
      </div>
    </div>
  );
}
