import metaJson from '../../../../data/calibration/geekerwan-charge-meta-2026-10-12-0.1.json';
import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const GEEKERWAN_CHARGING_CURVE_VERSION =
  'geekerwan-charging-curves-2026-10-0.2.0';

type MetadataRow = {
  seriesId: number;
  name: string;
  group?: string;
  soc?: string;
  chargerPowerW: number;
  wallInputEnergyWh: number;
  fullDurationMinutes: number;
  averageWallInputPowerW: number;
  defaultVisible?: boolean;
};

type MetadataFile = {
  version: string;
  source: {
    id: string;
    publisher: string;
    url: string;
    apiUrl: string;
    protocolVersion: string;
    accessedDate: string;
    description: string;
  };
  dataVersion: string;
  rows: MetadataRow[];
};

type CurveSample = {
  minute: number;
  energyWh: number;
};

const CURVE_SAMPLES:
  Readonly<
    Record<number, readonly CurveSample[]>
  > = {
    15023: [{minute:5,energyWh:4.2},{minute:10,energyWh:6.936},{minute:15,energyWh:9.636},{minute:20,energyWh:12.318},{minute:25,energyWh:15.055},{minute:30,energyWh:17.755},{minute:40,energyWh:23.136},{minute:50,energyWh:28.618},{minute:60,energyWh:31.073},{minute:75,energyWh:32.027}],
    15028: [{minute:5,energyWh:5.055},{minute:10,energyWh:7.491},{minute:15,energyWh:9.918},{minute:20,energyWh:12.818},{minute:25,energyWh:15.091},{minute:30,energyWh:18.145},{minute:40,energyWh:22.209},{minute:50,energyWh:24.727},{minute:60,energyWh:25.591},{minute:75,energyWh:26.345}],
    15038: [{minute:5,energyWh:4.364},{minute:10,energyWh:7.6},{minute:15,energyWh:10.627},{minute:20,energyWh:13.636},{minute:25,energyWh:16.6},{minute:30,energyWh:19.682},{minute:40,energyWh:23.809},{minute:50,energyWh:25.182},{minute:60,energyWh:25.8}],
    15045: [{minute:5,energyWh:4.7},{minute:10,energyWh:7.755},{minute:15,energyWh:10.291},{minute:20,energyWh:12.927},{minute:25,energyWh:15.645},{minute:30,energyWh:18.436},{minute:40,energyWh:24.209},{minute:50,energyWh:27.727},{minute:60,energyWh:28.691},{minute:75,energyWh:29.327}],
    15049: [{minute:5,energyWh:2.373},{minute:10,energyWh:5.982},{minute:15,energyWh:8.845},{minute:20,energyWh:11.518},{minute:25,energyWh:14.036},{minute:30,energyWh:16.555},{minute:40,energyWh:19.964},{minute:50,energyWh:22.236},{minute:60,energyWh:23.073}],
    15052: [{minute:5,energyWh:4.591},{minute:10,energyWh:8.182},{minute:15,energyWh:11.418},{minute:20,energyWh:14.8},{minute:25,energyWh:18.209},{minute:30,energyWh:21.655},{minute:40,energyWh:28.691},{minute:50,energyWh:30.764},{minute:60,energyWh:31.555}],
    15054: [{minute:5,energyWh:3.991},{minute:10,energyWh:6.082},{minute:15,energyWh:8.318},{minute:20,energyWh:10.673},{minute:25,energyWh:12.809},{minute:30,energyWh:14.936},{minute:40,energyWh:19.2},{minute:50,energyWh:23.864},{minute:60,energyWh:27.473},{minute:75,energyWh:28.955}],
    15060: [{minute:5,energyWh:5.318},{minute:10,energyWh:9.109},{minute:15,energyWh:12.818},{minute:20,energyWh:16.518},{minute:25,energyWh:19.909},{minute:30,energyWh:22.864},{minute:40,energyWh:28.536},{minute:50,energyWh:30.891}],
    15070: [{minute:5,energyWh:2.564},{minute:10,energyWh:5.436},{minute:15,energyWh:7.864},{minute:20,energyWh:10.018},{minute:25,energyWh:12.055},{minute:30,energyWh:13.882},{minute:40,energyWh:17.245},{minute:50,energyWh:18.9},{minute:60,energyWh:20.427},{minute:75,energyWh:22.309},{minute:90,energyWh:23.164},{minute:100,energyWh:23.491}],
    15075: [{minute:5,energyWh:4.118},{minute:10,energyWh:7.218},{minute:15,energyWh:9.836},{minute:20,energyWh:12.555},{minute:25,energyWh:15.145},{minute:30,energyWh:17.7},{minute:40,energyWh:22.836},{minute:50,energyWh:26.473},{minute:60,energyWh:28.018},{minute:75,energyWh:28.991}],
    15081: [{minute:5,energyWh:4.227},{minute:10,energyWh:7.118},{minute:15,energyWh:9.882},{minute:20,energyWh:12.691},{minute:25,energyWh:15.536},{minute:30,energyWh:18.464},{minute:40,energyWh:24.455},{minute:50,energyWh:29.818},{minute:60,energyWh:31.827}],
    15086: [{minute:5,energyWh:2.682},{minute:10,energyWh:5.3},{minute:15,energyWh:7.182},{minute:20,energyWh:9.364},{minute:25,energyWh:11.555},{minute:30,energyWh:13.773},{minute:40,energyWh:18.291},{minute:50,energyWh:23.009},{minute:60,energyWh:27.255},{minute:75,energyWh:29.682},{minute:90,energyWh:30.455}],
  };

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function manufacturerFor(name: string) {
  const normalized =
    name.toLowerCase();

  if (normalized.startsWith('redmi ')) return 'Xiaomi';
  if (normalized.startsWith('xiaomi ')) return 'Xiaomi';
  if (normalized.startsWith('huawei ')) return 'Huawei';
  if (normalized.startsWith('honor ')) return 'Honor';
  if (normalized.startsWith('samsung ')) return 'Samsung';
  if (normalized.startsWith('oneplus ')) return 'OnePlus';
  if (normalized.startsWith('realme ')) return 'realme';
  if (normalized.startsWith('iqoo ')) return 'iQOO';
  if (normalized.startsWith('oppo ')) return 'OPPO';
  if (normalized.startsWith('vivo ')) return 'vivo';
  if (normalized.startsWith('google ')) return 'Google';
  if (normalized.startsWith('iphone ')) return 'Apple';
  if (normalized.startsWith('redmagic ')) return 'nubia';
  if (normalized.startsWith('nubia ')) return 'nubia';

  return 'Other';
}

function modelFor(
  name: string,
  manufacturer: string,
) {
  const prefixes =
    manufacturer === 'Apple'
      ? ['']
      : manufacturer === 'Xiaomi' &&
          name.toLowerCase().startsWith('redmi ')
        ? ['REDMI ']
        : [manufacturer + ' '];

  for (const prefix of prefixes) {
    if (
      prefix &&
      name.toLowerCase().startsWith(
        prefix.toLowerCase(),
      )
    ) {
      return name.slice(
        prefix.length,
      );
    }
  }

  return name;
}

export function buildGeekerwanChargingCurveCorpus(): DeviceCorpus {
  const file =
    metaJson as unknown as MetadataFile;

  const source: CorpusSource = {
    id: file.source.id,
    publisher:
      file.source.publisher,
    url:
      file.source.url,
    sourceRole:
      'measurement-lab',
    protocol:
      file.source.description,
    protocolVersion:
      file.source.protocolVersion,
    accessedDate:
      file.source.accessedDate,
  };

  const devices:
    DeviceCorpusRecord[] =
    file.rows.map((row) => {
      const manufacturer =
        manufacturerFor(
          row.name,
        );
      const model =
        modelFor(
          row.name,
          manufacturer,
        );
      const id =
        'geekerwan-charge-' +
        slug(
          manufacturer +
          '-' +
          model,
        );

      return {
        variant: {
          id,
          identity: {
            manufacturer,
            family:
              model,
            modelName:
              model,
          },
          soc:
            row.soc
              ? {
                  vendor:
                    row.soc.startsWith(
                      'Snapdragon',
                    )
                      ? 'Qualcomm'
                      : row.soc.startsWith(
                            'Dimensity',
                          )
                        ? 'MediaTek'
                        : row.soc.startsWith(
                              'A1',
                            ) ||
                            row.soc.startsWith(
                              'A2',
                            )
                          ? 'Apple'
                          : row.soc.startsWith(
                                'Kirin',
                              )
                            ? 'Huawei'
                            : row.soc.startsWith(
                                  'Tensor',
                                )
                              ? 'Google'
                              : 'other',
                  name:
                    row.soc,
                }
              : undefined,
          notes: [
            'Geekerwan/SOCPK charging metadata reference.',
            'SOCPK series id: ' +
              row.seriesId,
            'Wall-input energy includes charging/circuit losses.',
          ],
        },
        charging: {
          referenceWiredWatts:
            row.chargerPowerW,
        },
        sourceIds: [
          source.id,
        ],
      };
    });

  const measurements:
    CorpusMeasurement[] =
    file.rows.flatMap((row) => {
      const manufacturer =
        manufacturerFor(
          row.name,
        );
      const model =
        modelFor(
          row.name,
          manufacturer,
        );
      const id =
        'geekerwan-charge-' +
        slug(
          manufacturer +
          '-' +
          model,
        );

      const base:
        CorpusMeasurement[] = [
        {
          id:
            id +
            '-curve-end-minutes',
          deviceVariantId:
            id,
          workload:
            'charging',
          metric:
            'geekerwan_wall_input_curve_end_minutes',
          value:
            row.fullDurationMinutes,
          unit:
            'minutes',
          sourceId:
            source.id,
          evidenceKind:
            'measured',
          testChargerWatts:
            row.chargerPowerW,
          notes: [
            'Geekerwan/SOCPK full charging-curve duration using the original charger.',
          ],
        },
        {
          id:
            id +
            '-curve-end-wh',
          deviceVariantId:
            id,
          workload:
            'charging',
          metric:
            'geekerwan_wall_input_energy_curve_end_wh',
          value:
            row.wallInputEnergyWh,
          unit:
            'Wh',
          sourceId:
            source.id,
          evidenceKind:
            'measured',
          testChargerWatts:
            row.chargerPowerW,
          notes: [
            'Wall-input energy at the end of the SOCPK curve, including charging/circuit losses.',
          ],
        },
        {
          id:
            id +
            '-average-wall-power',
          deviceVariantId:
            id,
          workload:
            'charging',
          metric:
            'geekerwan_average_wall_input_power_w',
          value:
            row.averageWallInputPowerW,
          unit:
            'W',
          sourceId:
            source.id,
          evidenceKind:
            'measured',
          testChargerWatts:
            row.chargerPowerW,
          notes: [
            'Average wall-input power reported by the SOCPK charge-curves API.',
          ],
        },
      ];

      const samples =
        CURVE_SAMPLES[
          row.seriesId
        ];

      if (samples) {
        base.push(
          ...samples.map(
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
                source.id,
              evidenceKind:
                'measured' as const,
              testChargerWatts:
                row.chargerPowerW,
              notes: [
                'Recovered from the SOCPK rendered SVG curve using its published minute and Wh axes; no OCR or screenshot digitization.',
              ],
            }),
          ),
        );
      }

      return base;
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
  const file =
    metaJson as unknown as MetadataFile;

  return file.rows.length;
}

export function geekerwanDetailedCurveCount() {
  return Object.keys(
    CURVE_SAMPLES,
  ).length;
}
