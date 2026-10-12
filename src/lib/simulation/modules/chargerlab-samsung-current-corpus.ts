import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const CHARGERLAB_SAMSUNG_CURRENT_VERSION =
  'chargerlab-samsung-current-0.1.0';

const sources: CorpusSource[] = [
  {
    id: 'chargerlab-galaxy-s26-ultra-60w-compatibility',
    publisher: 'ChargerLAB',
    url: 'https://www.chargerlab.com/up-to-60w-charging-compatibility-test-of-samsung-galaxy-s26-ultra/',
    sourceRole: 'measurement-lab',
    protocol:
      'ChargerLAB POWER-Z compatibility measurement of Galaxy S26 Ultra charging with Samsung 60W PPS-capable charger.',
    protocolVersion: 'chargerlab-compatibility-2026',
    accessedDate: '2026-10-12',
  },
  {
    id: 'chargerlab-galaxy-s25-ultra-compatibility',
    publisher: 'ChargerLAB',
    url: 'https://www.chargerlab.com/compatibility-test-of-samsung-galaxy-s25-ultra/',
    sourceRole: 'measurement-lab',
    protocol:
      'ChargerLAB POWER-Z compatibility measurements for Galaxy S25 Ultra across Samsung and third-party chargers.',
    protocolVersion: 'chargerlab-compatibility-2025',
    accessedDate: '2026-10-12',
  },
];

export function buildChargerLabSamsungCurrentCorpus(): DeviceCorpus {
  const devices: DeviceCorpusRecord[] = [
    {
      variant: {
        id: 'chargerlab-samsung-galaxy-s26-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S26 Ultra',
          modelName: 'Galaxy S26 Ultra',
        },
        battery: {
          capacityMah: 5000,
        },
      },
      releaseDate: '2026',
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
      sourceIds: [
        'chargerlab-galaxy-s26-ultra-60w-compatibility',
      ],
    },
    {
      variant: {
        id: 'chargerlab-samsung-galaxy-s25-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S25 Ultra',
          modelName: 'Galaxy S25 Ultra',
        },
        battery: {
          capacityMah: 5000,
        },
      },
      releaseDate: '2025',
      charging: {
        advertisedWiredWatts: 45,
        advertisedWirelessWatts: 15,
        cellArchitecture: 'single-cell',
      },
      sourceIds: [
        'chargerlab-galaxy-s25-ultra-compatibility',
      ],
    },
  ];

  const measurements: CorpusMeasurement[] = [
    {
      id: 'chargerlab-s26u-samsung-60w-observed-input',
      deviceVariantId: 'chargerlab-samsung-galaxy-s26-ultra',
      workload: 'charging',
      metric: 'observedChargingPowerW',
      value: 51.54,
      unit: 'W',
      sourceId: 'chargerlab-galaxy-s26-ultra-60w-compatibility',
      evidenceKind: 'measured',
      testChargerWatts: 60,
      chargingStandard: 'USB PD PPS',
      measuredPeakWatts: 51.54,
      notes: [
        'Observed with Samsung EP-T6010 60W charger. No full-charge duration is inferred from this compatibility measurement.',
      ],
    },
    {
      id: 'chargerlab-s25u-samsung-65w-observed-input',
      deviceVariantId: 'chargerlab-samsung-galaxy-s25-ultra',
      workload: 'charging',
      metric: 'observedChargingPowerW',
      value: 40.24,
      unit: 'W',
      sourceId: 'chargerlab-galaxy-s25-ultra-compatibility',
      evidenceKind: 'measured',
      testChargerWatts: 65,
      chargingStandard: 'USB PD PPS',
      measuredPeakWatts: 40.24,
    },
    {
      id: 'chargerlab-s25u-samsung-25w-observed-input',
      deviceVariantId: 'chargerlab-samsung-galaxy-s25-ultra',
      workload: 'charging',
      metric: 'observedChargingPowerW',
      value: 19.75,
      unit: 'W',
      sourceId: 'chargerlab-galaxy-s25-ultra-compatibility',
      evidenceKind: 'measured',
      testChargerWatts: 25,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 19.75,
    },
    {
      id: 'chargerlab-s25u-aohi-140w-observed-input',
      deviceVariantId: 'chargerlab-samsung-galaxy-s25-ultra',
      workload: 'charging',
      metric: 'observedChargingPowerW',
      value: 40.51,
      unit: 'W',
      sourceId: 'chargerlab-galaxy-s25-ultra-compatibility',
      evidenceKind: 'measured',
      testChargerWatts: 140,
      chargingStandard: 'USB PD PPS',
      measuredPeakWatts: 40.51,
    },
    {
      id: 'chargerlab-s25u-apple-140w-observed-input',
      deviceVariantId: 'chargerlab-samsung-galaxy-s25-ultra',
      workload: 'charging',
      metric: 'observedChargingPowerW',
      value: 22.93,
      unit: 'W',
      sourceId: 'chargerlab-galaxy-s25-ultra-compatibility',
      evidenceKind: 'measured',
      testChargerWatts: 140,
      chargingStandard: 'USB PD',
      measuredPeakWatts: 22.93,
      notes: [
        'Same adapter wattage can yield different phone input because protocol support differs; adapter rating is not phone charging power.',
      ],
    },
  ];

  return {
    version:
      CHARGERLAB_SAMSUNG_CURRENT_VERSION,
    sources,
    devices,
    measurements,
  };
}
