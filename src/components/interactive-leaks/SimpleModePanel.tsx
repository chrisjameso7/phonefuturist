import { useState } from 'react';
import type {
  SimpleCoolingPreset,
  SimpleModeInput,
  SimpleResolutionPreset,
} from '../../lib/simulation/simple-mode';
import type { SocVendor } from '../../lib/simulation/modules/device-variant';

type Props = {
  onRun: (input: SimpleModeInput, usage: 'Light' | 'Typical' | 'Heavy') => void;
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
  const [refreshRate, setRefreshRate] =
    useState('120');
  const [socVendor, setSocVendor] =
    useState<SocVendor>('Qualcomm');
  const [socName, setSocName] = useState('');
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
      refreshRateHz: hz,
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
    }, usage);
  }

  return (
    <div className="il-simple-panel">
      <div className="il-simple-intro">
        <div>
          <strong>Simple Mode</strong>
          <span>Beta · free</span>
        </div>
        <p>
          Pick the headline specs. PhoneFuturist
          translates them into the same simulation engine
          used by Advanced Lab.
        </p>
      </div>

      <fieldset className="il-simple-usage" aria-label="Daily usage profile">
        <legend>How do you use your phone?</legend>
        <div className="il-mode-switch">
          {(['Light', 'Typical', 'Heavy'] as const).map((preset) => (
            <button key={preset} type="button" className={usage === preset ? 'active' : ''}
              aria-pressed={usage === preset} onClick={() => setUsage(preset)}>
              {preset}
            </button>
          ))}
        </div>
        <p className="il-help">
          {usage === 'Light' ? 'Mostly messaging, occasional browsing and video.' :
            usage === 'Typical' ? 'A balanced day of browsing, video, social apps and some gaming.' :
              'Longer screen time, frequent video and more demanding gaming.'}
          {' '}These are illustrative usage scenarios, not measured population averages.
        </p>
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
          <input
            value={manufacturer}
            placeholder="Samsung"
            onChange={(event) =>
              setManufacturer(
                event.currentTarget.value,
              )
            }
          />
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
            <option value="fhd">FHD class</option>
            <option value="qhd">QHD class</option>
          </select>
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
          <span>SoC vendor</span>
          <select
            value={socVendor}
            onChange={(event) =>
              setSocVendor(
                event.currentTarget.value as SocVendor,
              )
            }
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
          <input
            value={socName}
            placeholder="Snapdragon 8 Elite Gen 5"
            onChange={(event) =>
              setSocName(event.currentTarget.value)
            }
          />
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
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={sensorDenominator}
            onChange={(event) =>
              setSensorDenominator(
                event.currentTarget.value,
              )
            }
          />
        </label>

        <label className="il-field">
          <span>Main aperture</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={aperture}
            onChange={(event) =>
              setAperture(
                event.currentTarget.value,
              )
            }
          />
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
      >
        Simulate device
      </button>

      <p className="il-simple-note">
        Simple Mode uses documented presets for resolution
        and cooling classes. It does not invent thermal
        resistance, thermal mass or other hidden engineering
        values.
      </p>
    </div>
  );
}
