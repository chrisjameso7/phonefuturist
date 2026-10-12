import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const CHARGERLAB_IPHONE17PM_VERSION =
  'chargerlab-iphone17pm-0.1.0';

const source: CorpusSource = {
  id: 'chargerlab-iphone17-pro-max-full-charge-2025',
  publisher: 'ChargerLAB',
  url: 'https://www.chargerlab.com/charging-review-of-iphone-17-pro-max/',
  sourceRole: 'measurement-lab',
  protocol:
    'ChargerLAB full wired charging test in a 25°C thermotank using POWER-Z instrumentation. Multiple Apple USB-PD adapter classes tested with the original cable.',
  protocolVersion: 'chargerlab-full-charge-2025',
  accessedDate: '2026-10-12',
};

const deviceId =
  'chargerlab-apple-iphone-17-pro-max';

type Mode = {
  chargerW: number;
  measuredPeakW: number;
  p30: number;
  t50: number;
  t80: number;
  full: number;
};

const modes: Mode[] = [
  {
    chargerW: 20,
    measuredPeakW: 17,
    p30: 39,
    t50: 38,
    t80: 66,
    full: 114,
  },
  {
    chargerW: 40,
    measuredPeakW: 36.73,
    p30: 70,
    t50: 20,
    t80: 41,
    full: 91,
  },
  {
    chargerW: 70,
    measuredPeakW: 37,
    p30: 70,
    t50: 20,
    t80: 41,
    full: 90,
  },
  {
    chargerW: 140,
    measuredPeakW: 37,
    p30: 70,
    t50: 20,
    t80: 42,
    full: 89,
  },
];

function metric(
  mode: Mode,
  name: string,
  value: number,
  unit: string,
): CorpusMeasurement {
  return {
    id:
      `${deviceId}-${mode.chargerW}w-${name}`,
    deviceVariantId: deviceId,
    workload: 'charging',
    metric: name,
    value,
    unit,
    sourceId: source.id,
    evidenceKind: 'measured',
    testChargerWatts:
      mode.chargerW,
    chargingStandard: 'USB PD',
    measuredPeakWatts:
      mode.measuredPeakW,
    ambientTemperatureC: 25,
  };
}

export function buildChargerLabIPhone17ProMaxCorpus(): DeviceCorpus {
  const devices: DeviceCorpusRecord[] = [
    {
      variant: {
        id: deviceId,
        identity: {
          manufacturer: 'Apple',
          family: 'iPhone 17 Pro Max',
          modelName: 'iPhone 17 Pro Max',
        },
        battery: {
          capacityMah: 4823,
        },
        notes: [
          'ChargerLAB reports USB-PD charging with observed phone input near 37W on sufficiently capable adapters.',
        ],
      },
      charging: {
        advertisedWiredWatts: 40,
        advertisedWirelessWatts: 32,
        cellArchitecture: 'single-cell',
      },
      sourceIds: [source.id],
    },
  ];

  const measurements:
    CorpusMeasurement[] =
    modes.flatMap((mode) => [
      metric(
        mode,
        'charge30mPercent',
        mode.p30,
        'percent',
      ),
      metric(
        mode,
        'timeTo50Minutes',
        mode.t50,
        'minutes',
      ),
      metric(
        mode,
        'timeTo80Minutes',
        mode.t80,
        'minutes',
      ),
      metric(
        mode,
        'fullChargeMinutes',
        mode.full,
        'minutes',
      ),
    ]);

  measurements.push(
    {
      id: `${deviceId}-40w-front-temp-10m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'frontTemperature10mC',
      value: 37.1,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
    {
      id: `${deviceId}-40w-back-temp-10m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'backTemperature10mC',
      value: 37.6,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
    {
      id: `${deviceId}-40w-front-temp-20m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'frontTemperature20mC',
      value: 38.3,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
    {
      id: `${deviceId}-40w-back-temp-20m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'backTemperature20mC',
      value: 39.5,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
    {
      id: `${deviceId}-40w-front-temp-30m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'frontTemperature30mC',
      value: 36.1,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
    {
      id: `${deviceId}-40w-back-temp-30m`,
      deviceVariantId: deviceId,
      workload: 'charging',
      metric: 'backTemperature30mC',
      value: 37.5,
      unit: 'C',
      sourceId: source.id,
      evidenceKind: 'measured',
      testChargerWatts: 40,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 36.73,
      ambientTemperatureC: 25,
    },
  );

  return {
    version:
      CHARGERLAB_IPHONE17PM_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}
