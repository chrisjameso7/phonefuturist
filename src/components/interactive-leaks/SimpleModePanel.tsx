import { SOC_MODELS } from '../../lib/simulation/soc-model-catalog';
import type { SocPowerWhatIf } from '../../lib/simulation/modules/soc-power-what-if';
import BrandSelect from './BrandSelect';
import { CAMERA_SENSOR_FORMATS, CAMERA_APERTURES } from '../../lib/simulation/camera-option-catalog';
import { useState } from 'react';
import type {
  SimpleCoolingPreset,
  SimpleModeInput,
  SimpleResolutionPreset,
} from '../../lib/simulation/simple-mode';
import type { SocVendor } from '../../lib/simulation/modules/device-variant';

type Props = {
  pending?: boolean;
  onRun: (input: SimpleModeInput, usage: 'Light' | 'Typical' | 'Heavy', powerScenario: SocPowerWhatIf) => void;
};

const vendors: SocVendor[] = [
  'Apple',
  'Qualcomm',
  'Samsung',
  'MediaTek',
  'Google',
  'Huawei',
  'Unisoc',
  'other',
];

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : undefined;
}

export default function SimpleModePanel({
  onRun,
  pending = false,
}: Props) {
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] =
    useState('');
  const [batteryMah, setBatteryMah] =
    useState('5500');
  const [wiredWatts, setWiredWatts] =
    useState('60');
  const [displaySize, setDisplaySize] =
    useState('6.8');
  const [resolution, setResolution] =
    useState<SimpleResolutionPreset>('qhd');
  const [aspectRatio, setAspectRatio] = useState('9:20');
  const [customAspectWidth, setCustomAspectWidth] = useState('');
  const [customAspectHeight, setCustomAspectHeight] = useState('');
  const [renderingScale, setRenderingScale] = useState<100 | 75 | 50>(100);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [refreshRate, setRefreshRate] =
    useState('120');
  const [brightness, setBrightness] = useState('');
  const [socVendor, setSocVendor] =
    useState<SocVendor>('Qualcomm');
  const [socName, setSocName] = useState('');
  const [socPowerScenario, setSocPowerScenario] = useState<SocPowerWhatIf>('neutral');
  const [cooling, setCooling] =
    useState<SimpleCoolingPreset>('large-vc');
  const [cameraMp, setCameraMp] =
    useState('50');
  const [sensorDenominator, setSensorDenominator] =
    useState('1.3');
  const [aperture, setAperture] =
    useState('1.8');
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<'Light' | 'Typical' | 'Heavy'>('Typical');

  function submit() {
    const battery = number(batteryMah);
    const diagonal = number(displaySize);
    const hz = number(refreshRate);

    if (!battery || !diagonal || !hz) {
      setError(
        'Battery, display size and refresh rate are required.',
      );
      return;
    }

    if (resolution === 'custom' && (!number(customWidth) || !number(customHeight))) {
      setError('Enter both pixel dimensions for the custom display resolution.');
      return;
    }

    if (aspectRatio === 'custom' && (!number(customAspectWidth) || !number(customAspectHeight))) {
      setError('Enter both dimensions of the custom aspect ratio.');
      return;
    }

    setError('');

    onRun({
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(manufacturer.trim()
        ? { manufacturer: manufacturer.trim() }
        : {}),
      batteryMah: battery,
      ...(number(wiredWatts)
        ? {
            wiredChargingWatts:
              number(wiredWatts),
          }
        : {}),
      displayDiagonalInches: diagonal,
      displayResolution: resolution,
      aspectRatioWidth: aspectRatio === 'custom' ? number(customAspectWidth) : Number(aspectRatio.split(':')[0]),
      aspectRatioHeight: aspectRatio === 'custom' ? number(customAspectHeight) : Number(aspectRatio.split(':')[1]),
      renderingScalePercent: renderingScale,
      ...(resolution === 'custom' ? { customResolutionWidthPx: number(customWidth), customResolutionHeightPx: number(customHeight) } : {}),
      refreshRateHz: hz,
      ...(number(brightness) ? { brightnessNits: number(brightness) } : {}),
      socVendor,
      ...(socName.trim()
        ? { socName: socName.trim() }
        : {}),
      cooling,
      mainCamera: {
        ...(number(sensorDenominator)
          ? {
              sensorFormatDenominator:
                number(sensorDenominator),
            }
          : {}),
        ...(number(cameraMp)
          ? { resolutionMp: number(cameraMp) }
          : {}),
        ...(number(aperture)
          ? {
              apertureFNumber:
                number(aperture),
            }
          : {}),
        equivalentFocalLengthMm: 24,
      },
    }, usage, socPowerScenario);
  }

  return (
    <div className="il-simple-panel">
      <div className="il-simple-intro">
        <div>
          <strong>Simple Mode</strong>
          <span>Beta · free</span>
        </div>

      </div>

      <fieldset className="il-simple-usage" aria-label="Daily usage profile">
        <legend>Usage</legend>
        <div className="il-mode-switch">
          {(['Light', 'Typical', 'Heavy'] as const).map((preset) => (
            <button key={preset} type="button" className={usage === preset ? 'active' : ''}
              aria-pressed={usage === preset} onClick={() => setUsage(preset)}>
              {preset}
            </button>
          ))}
        </div>

      </fieldset>
      <div className="il-simple-grid">
        <label className="il-field il-wide">
          <span>Device name</span>
          <input
            value={name}
            placeholder="Galaxy S27 Ultra concept"
            onChange={(event) =>
              setName(event.currentTarget.value)
            }
          />
        </label>

        <label className="il-field">
          <span>Brand</span>
          <BrandSelect value={manufacturer} onChange={setManufacturer} />
        </label>

        <label className="il-field">
          <span>Battery</span>
          <input
            type="number"
            inputMode="decimal"
            value={batteryMah}
            onChange={(event) =>
              setBatteryMah(
                event.currentTarget.value,
              )
            }
          />
        </label>

        <label className="il-field">
          <span>Wired charging</span>
          <input
            type="number"
            inputMode="decimal"
            value={wiredWatts}
            onChange={(event) =>
              setWiredWatts(
                event.currentTarget.value,
              )
            }
          />
        </label>

        <label className="il-field">
          <span>Display size</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={displaySize}
            onChange={(event) =>
              setDisplaySize(
                event.currentTarget.value,
              )
            }
          />
        </label>

        <label className="il-field">
          <span>Resolution</span>
          <select
            value={resolution}
            onChange={(event) =>
              setResolution(
                event.currentTarget
                  .value as SimpleResolutionPreset,
              )
            }
          >
            <option value="hd">HD · 720 × 1600</option>
            <option value="hd-plus">HD+ · 720 × 1650</option>
            <option value="fhd">FHD · 1080 × 2400</option>
            <option value="fhd-plus">FHD+ · 1080 × 2520</option>
            <option value="1200p">1200p · 1200 × 2640</option>
            <option value="1220p">1.5K · 1220 × 2712</option>
            <option value="1260p">1260p · 1260 × 2800</option>
            <option value="1280p">1280p · 1280 × 2856</option>
            <option value="1344p">1344p · 1344 × 2992</option>
            <option value="qhd">QHD · 1440 × 3200</option>
            <option value="qhd-plus">QHD+ · 1440 × 3120</option>
            <option value="4k">4K-class · 1644 × 3840</option>
            <option value="custom">Custom pixel resolution</option>
          </select>
        </label>

        {resolution === 'custom' && (
          <div className="il-grid">
            <label className="il-field"><span>Width (pixels)</span><input type="number" min="1" step="1" value={customWidth} onChange={event => setCustomWidth(event.currentTarget.value)} placeholder="1220" /></label>
            <label className="il-field"><span>Height (pixels)</span><input type="number" min="1" step="1" value={customHeight} onChange={event => setCustomHeight(event.currentTarget.value)} placeholder="2712" /></label>
          </div>
        )}

        <label className="il-field">
          <span>Aspect ratio · portrait</span>
          <select value={aspectRatio} onChange={event => setAspectRatio(event.currentTarget.value)}>
            <optgroup label="Portrait phone">
              <option value="9:21">21:9</option>
              <option value="9:20.5">20.5:9</option>
              <option value="9:20">20:9</option>
              <option value="9:19.5">19.5:9</option>
              <option value="9:19">19:9</option>
              <option value="9:18.5">18.5:9</option>
              <option value="9:18">18:9</option>
              <option value="9:17">17:9</option>
            </optgroup>
            <optgroup label="Wide portrait and foldables">
              <option value="9.5:16">16:9.5 · Huawei Pura X View</option>
              <option value="10:16">16:10 · Huawei Pura X</option>
              <option value="3:4">4:3</option>
              <option value="1:1">1:1</option>
            </optgroup>
            <option value="custom">Custom</option>
          </select>
        </label>
        {aspectRatio === 'custom' && (
          <div className="il-grid">
            <label className="il-field"><span>Ratio width</span><input type="number" min="0.1" step="0.1" value={customAspectWidth} onChange={event => setCustomAspectWidth(event.currentTarget.value)} /></label>
            <label className="il-field"><span>Ratio height</span><input type="number" min="0.1" step="0.1" value={customAspectHeight} onChange={event => setCustomAspectHeight(event.currentTarget.value)} /></label>
          </div>
        )}
        <label className="il-field">
          <span>GPU rendering resolution</span>
          <select value={renderingScale} onChange={event => setRenderingScale(Number(event.currentTarget.value) as 100 | 75 | 50)}>
            <option value={100}>Native (100% per dimension)</option>
            <option value={75}>Scaled (75% per dimension)</option>
            <option value={50}>Scaled (50% per dimension)</option>
          </select>
          <small>The physical panel stays at its native resolution. Scaling changes rendered pixel count, not measured battery life; real savings depend on GPU workload and display electronics.</small>
        </label>

        <label className="il-field">
          <span>Refresh rate</span>
          <select
            value={refreshRate}
            onChange={(event) =>
              setRefreshRate(
                event.currentTarget.value,
              )
            }
          >
            <option value="60">60 Hz</option>
            <option value="90">90 Hz</option>
            <option value="120">120 Hz</option>
            <option value="144">144 Hz</option>
            <option value="165">165 Hz</option>
          </select>
        </label>

        <label className="il-field">
          <span>Screen brightness</span>
          <select value={brightness} onChange={event => setBrightness(event.currentTarget.value)}>
            <option value="">Reference conditions · unchanged</option>
            <option value="200">200 nits · indoor</option>
            <option value="400">400 nits · bright room</option>
            <option value="800">800 nits · outdoors</option>
            <option value="1200">1,200 nits · bright sunlight</option>
          </select>
          <small>Brightness scenarios use a 400-nit reference. Actual lab conditions vary; these are estimates.</small>
        </label>

        <label className="il-field">
          <span>SoC vendor</span>
          <select
            value={socVendor}
            onChange={(event) => {
              setSocVendor(event.currentTarget.value as SocVendor);
              setSocName('');
            }}
          >
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>

        <label className="il-field il-wide">
          <span>SoC model</span>
          <select value={(SOC_MODELS[socVendor]?.released ?? []).concat(SOC_MODELS[socVendor]?.preview ?? []).includes(socName) ? socName : ''} onChange={event => setSocName(event.currentTarget.value)}>
            <option value="">Select processor</option>
            {(SOC_MODELS[socVendor]?.released ?? []).map(chip => <option key={chip} value={chip}>{chip}</option>)}
            {(SOC_MODELS[socVendor]?.preview ?? []).map(chip => <option key={chip} value={chip}>{chip} (rumored / experimental)</option>)}
          </select>
        </label>

        <label className="il-field il-wide">
          <span>Processor power scenario</span>
          <select
            value={socPowerScenario}
            onChange={event => setSocPowerScenario(event.currentTarget.value as SocPowerWhatIf)}
          >
            <option value="neutral">Neutral · no chip efficiency assumption</option>
            <option value="efficiency">Efficiency-focused · assume 12% less loaded SoC power</option>
            <option value="performance">Performance-focused · assume 12% more loaded SoC power</option>
          </select>
          <small>An assumption, not a measured efficiency advantage for the selected processor.</small>
        </label>

        <label className="il-field">
          <span>Cooling</span>
          <select
            value={cooling}
            onChange={(event) =>
              setCooling(
                event.currentTarget
                  .value as SimpleCoolingPreset,
              )
            }
          >
            <option value="basic">Basic</option>
            <option value="good">Good</option>
            <option value="large-vc">Large VC</option>
            <option value="active">Active cooling</option>
          </select>
        </label>

        <label className="il-field">
          <span>Main camera</span>
          <input
            type="number"
            inputMode="decimal"
            value={cameraMp}
            onChange={(event) =>
              setCameraMp(
                event.currentTarget.value,
              )
            }
          />
        </label>

        <label className="il-field">
          <span>Sensor format</span>
          <select value={sensorDenominator} onChange={(event) => setSensorDenominator(event.currentTarget.value)}>
            <option value="">Select sensor format</option>
            {CAMERA_SENSOR_FORMATS.map(value => <option key={value} value={String(value)}>1/{value}″ type</option>)}
          </select>
        </label>

        <label className="il-field">
          <span>Main aperture</span>
          <select value={aperture} onChange={(event) => setAperture(event.currentTarget.value)}>
            <option value="">Select aperture</option>
            {CAMERA_APERTURES.map(value => <option key={value} value={String(value)}>f/{value}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <p className="il-simple-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="il-simple-run"
        onClick={submit}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Simulating…' : 'Run simulation'}
      </button>


    </div>
  );
}
