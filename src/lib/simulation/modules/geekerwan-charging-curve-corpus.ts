import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const GEEKERWAN_CHARGING_CURVE_VERSION =
  'geekerwan-charging-curves-2026-10-0.1.0';

type CurveSample = {
  minute: number;
  energyWh: number;
};

type CurveRow = {
  seriesId: string;
  manufacturer: string;
  model: string;
  finalMinutes: number;
  finalInputWh: number;
  samples: CurveSample[];
};

const SOURCE_ID =
  'geekerwan-charging-curves-2026';

const ROWS: readonly CurveRow[] = [
  { seriesId: '15023', manufacturer: 'Xiaomi', model: 'Redmi K90 Pro Max', finalMinutes: 82.42, finalInputWh: 32.3, samples: [{minute:5,energyWh:4.2},{minute:10,energyWh:6.936},{minute:15,energyWh:9.636},{minute:20,energyWh:12.318},{minute:25,energyWh:15.055},{minute:30,energyWh:17.755},{minute:40,energyWh:23.136},{minute:50,energyWh:28.618},{minute:60,energyWh:31.073},{minute:75,energyWh:32.027}] },
  { seriesId: '15028', manufacturer: 'Huawei', model: 'Mate 80 Pro Max', finalMinutes: 75.71, finalInputWh: 26.355, samples: [{minute:5,energyWh:5.055},{minute:10,energyWh:7.491},{minute:15,energyWh:9.918},{minute:20,energyWh:12.818},{minute:25,energyWh:15.091},{minute:30,energyWh:18.145},{minute:40,energyWh:22.209},{minute:50,energyWh:24.727},{minute:60,energyWh:25.591},{minute:75,energyWh:26.345}] },
  { seriesId: '15038', manufacturer: 'Huawei', model: 'Pura 90 Pro Max', finalMinutes: 65.66, finalInputWh: 25.936, samples: [{minute:5,energyWh:4.364},{minute:10,energyWh:7.6},{minute:15,energyWh:10.627},{minute:20,energyWh:13.636},{minute:25,energyWh:16.6},{minute:30,energyWh:19.682},{minute:40,energyWh:23.809},{minute:50,energyWh:25.182},{minute:60,energyWh:25.8}] },
  { seriesId: '15045', manufacturer: 'Honor', model: 'Magic8 Pro', finalMinutes: 79.56, finalInputWh: 29.418, samples: [{minute:5,energyWh:4.7},{minute:10,energyWh:7.755},{minute:15,energyWh:10.291},{minute:20,energyWh:12.927},{minute:25,energyWh:15.645},{minute:30,energyWh:18.436},{minute:40,energyWh:24.209},{minute:50,energyWh:27.727},{minute:60,energyWh:28.691},{minute:75,energyWh:29.327}] },
  { seriesId: '15049', manufacturer: 'Samsung', model: 'Galaxy S26 Ultra', finalMinutes: 68.13, finalInputWh: 23.473, samples: [{minute:5,energyWh:2.373},{minute:10,energyWh:5.982},{minute:15,energyWh:8.845},{minute:20,energyWh:11.518},{minute:25,energyWh:14.036},{minute:30,energyWh:16.555},{minute:40,energyWh:19.964},{minute:50,energyWh:22.236},{minute:60,energyWh:23.073}] },
  { seriesId: '15052', manufacturer: 'Xiaomi', model: '17 Pro Max', finalMinutes: 68.63, finalInputWh: 31.909, samples: [{minute:5,energyWh:4.591},{minute:10,energyWh:8.182},{minute:15,energyWh:11.418},{minute:20,energyWh:14.8},{minute:25,energyWh:18.209},{minute:30,energyWh:21.655},{minute:40,energyWh:28.691},{minute:50,energyWh:30.764},{minute:60,energyWh:31.555}] },
  { seriesId: '15054', manufacturer: 'Xiaomi', model: '17 Ultra', finalMinutes: 86.81, finalInputWh: 29.455, samples: [{minute:5,energyWh:3.991},{minute:10,energyWh:6.082},{minute:15,energyWh:8.318},{minute:20,energyWh:10.673},{minute:25,energyWh:12.809},{minute:30,energyWh:14.936},{minute:40,energyWh:19.2},{minute:50,energyWh:23.864},{minute:60,energyWh:27.473},{minute:75,energyWh:28.955}] },
  { seriesId: '15060', manufacturer: 'OnePlus', model: '15', finalMinutes: 56.27, finalInputWh: 31.418, samples: [{minute:5,energyWh:5.318},{minute:10,energyWh:9.109},{minute:15,energyWh:12.818},{minute:20,energyWh:16.518},{minute:25,energyWh:19.909},{minute:30,energyWh:22.864},{minute:40,energyWh:28.536},{minute:50,energyWh:30.891}] },
  { seriesId: '15070', manufacturer: 'Apple', model: 'iPhone 17 Pro Max', finalMinutes: 118.58, finalInputWh: 23.855, samples: [{minute:5,energyWh:2.564},{minute:10,energyWh:5.436},{minute:15,energyWh:7.864},{minute:20,energyWh:10.018},{minute:25,energyWh:12.055},{minute:30,energyWh:13.882},{minute:40,energyWh:17.245},{minute:50,energyWh:18.9},{minute:60,energyWh:20.427},{minute:75,energyWh:22.309},{minute:90,energyWh:23.164},{minute:100,energyWh:23.491}] },
  { seriesId: '15075', manufacturer: 'iQOO', model: '15', finalMinutes: 85.51, finalInputWh: 29.327, samples: [{minute:5,energyWh:4.118},{minute:10,energyWh:7.218},{minute:15,energyWh:9.836},{minute:20,energyWh:12.555},{minute:25,energyWh:15.145},{minute:30,energyWh:17.7},{minute:40,energyWh:22.836},{minute:50,energyWh:26.473},{minute:60,energyWh:28.018},{minute:75,energyWh:28.991}] },
  { seriesId: '15081', manufacturer: 'OPPO', model: 'Find X9 Ultra', finalMinutes: 65.47, finalInputWh: 32.391, samples: [{minute:5,energyWh:4.227},{minute:10,energyWh:7.118},{minute:15,energyWh:9.882},{minute:20,energyWh:12.691},{minute:25,energyWh:15.536},{minute:30,energyWh:18.464},{minute:40,energyWh:24.455},{minute:50,energyWh:29.818},{minute:60,energyWh:31.827}] },
  { seriesId: '15086', manufacturer: 'vivo', model: 'X300 Pro', finalMinutes: 95.78, finalInputWh: 30.636, samples: [{minute:5,energyWh:2.682},{minute:10,energyWh:5.3},{minute:15,energyWh:7.182},{minute:20,energyWh:9.364},{minute:25,energyWh:11.555},{minute:30,energyWh:13.773},{minute:40,energyWh:18.291},{minute:50,energyWh:23.009},{minute:60,energyWh:27.255},{minute:75,energyWh:29.682},{minute:90,energyWh:30.455}] },
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildGeekerwanChargingCurveCorpus(): DeviceCorpus {
  const source: CorpusSource = {
    id: SOURCE_ID,
    publisher: 'Geekerwan',
    url:
      'https://socpk.com/chart/charge-curves',
    sourceRole:
      'measurement-lab',
    protocol:
      'SOCPK phone charging curves: original charger, wall-input energy vs elapsed charging time; chart explicitly includes circuit losses.',
    protocolVersion:
      'socpk-charge-curves-2026-10',
    accessedDate:
      '2026-10-12',
  };

  const devices:
    DeviceCorpusRecord[] =
    ROWS.map((row) => {
      const id =
        'geekerwan-charge-' +
        slug(
          row.manufacturer +
          '-' +
          row.model,
        );

      return {
        variant: {
          id,
          identity: {
            manufacturer:
              row.manufacturer,
            family:
              row.model,
            modelName:
              row.model,
          },
          notes: [
            'Geekerwan/SOCPK charging-curve reference.',
            'SOCPK series id: ' +
              row.seriesId,
          ],
        },
        sourceIds: [
          SOURCE_ID,
        ],
      };
    });

  const measurements:
    CorpusMeasurement[] =
    ROWS.flatMap((row) => {
      const id =
        'geekerwan-charge-' +
        slug(
          row.manufacturer +
          '-' +
          row.model,
        );

      return [
        {
          id:
            id +
            '-curve-end-minutes',
          deviceVariantId:
            id,
          workload:
            'charging' as const,
          metric:
            'geekerwan_wall_input_curve_end_minutes',
          value:
            row.finalMinutes,
          unit:
            'minutes',
          sourceId:
            SOURCE_ID,
          evidenceKind:
            'measured' as const,
          notes: [
            'End of the rendered SOCPK wall-input energy curve. Kept source-namespaced and separate from generic full-charge-time protocols.',
          ],
        },
        {
          id:
            id +
            '-curve-end-wh',
          deviceVariantId:
            id,
          workload:
            'charging' as const,
          metric:
            'geekerwan_wall_input_energy_curve_end_wh',
          value:
            row.finalInputWh,
          unit:
            'Wh',
          sourceId:
            SOURCE_ID,
          evidenceKind:
            'measured' as const,
          notes: [
            'Wall-input energy at the end of the SOCPK curve, including charging/circuit losses.',
          ],
        },
        ...row.samples.map(
          (sample) => ({
            id:
              id +
              '-input-wh-' +
              sample.minute +
              'm',
            deviceVariantId:
              id,
            workload:
              'charging' as const,
            metric:
              'geekerwan_wall_input_energy_wh_at_' +
              sample.minute +
              'm',
            value:
              sample.energyWh,
            unit:
              'Wh',
            sourceId:
              SOURCE_ID,
            evidenceKind:
              'measured' as const,
            notes: [
              'Recovered from the SOCPK rendered SVG curve using its published minute and Wh axes; no OCR or screenshot digitization.',
            ],
          }),
        ),
      ];
    });

  return {
    version:
      GEEKERWAN_CHARGING_CURVE_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}

export function geekerwanChargingCurveCount() {
  return ROWS.length;
}
