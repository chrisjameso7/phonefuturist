import techApiJson from '../../../../data/calibration/techapi-recent-1000-0.1.json';
import type {
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import type {
  SocVendor,
} from './device-variant';

type TechApiCamera = {
  role: string;
  sensorName?: string;
  resolutionMp?: number;
  apertureFNumber?: number;
};

type TechApiDevice = {
  id: string;
  manufacturer: string;
  model: string;
  baseModelSlug: string;
  releaseDate?: string;
  batteryMah?: number;
  socVendor?: string;
  socName?: string;
  display?: {
    diagonalInches?: number;
    resolutionWidthPx?: number;
    resolutionHeightPx?: number;
    refreshRateHz?: number;
    panelTechnology?: string;
    brightnessNits?: number;
  };
  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    thicknessMm?: number;
    weightG?: number;
  };
  cameras?: TechApiCamera[];
  charging?: {
    advertisedWiredWatts?: number;
    advertisedWirelessWatts?: number;
  };
  verified?: boolean;
  catalogTrust?:
    | 'verified-or-unspecified'
    | 'source-backed-unverified';
  sourceUrls: string[];
};

type TechApiFile = {
  version: string;
  attribution: string;
  license: string;
  selection: {
    selectedCount: number;
    uniqueBaseModelCount?: number;
    variantBackfillCount?: number;
    maxEntriesPerBaseModel?: number;
    verifiedOrUnspecifiedCount?: number;
    sourceBackedUnverifiedCount?: number;
    years?: number[];
  };
  source: {
    id: string;
    publisher: string;
    url: string;
    protocol: string;
    accessedDate?: string;
  };
  devices: TechApiDevice[];
};

const VALID_SOC_VENDORS =
  new Set<SocVendor>([
    'Apple',
    'Qualcomm',
    'Samsung',
    'MediaTek',
    'Google',
    'Huawei',
    'Unisoc',
    'other',
  ]);

function socVendor(
  value?: string,
): SocVendor | undefined {
  if (!value) return undefined;

  return VALID_SOC_VENDORS.has(
    value as SocVendor,
  )
    ? value as SocVendor
    : 'other';
}

export function buildTechApiDeviceCatalog(): DeviceCorpus {
  const file =
    techApiJson as unknown as TechApiFile;

  const source: CorpusSource = {
    id: file.source.id,
    publisher:
      file.source.publisher,
    url: file.source.url,
    sourceRole: 'catalog',
    protocol:
      file.source.protocol,
    ...(file.source.accessedDate
      ? {
          accessedDate:
            file.source.accessedDate,
        }
      : {}),
  };

  const devices:
    DeviceCorpusRecord[] =
    file.devices.map(
      (row) => ({
        variant: {
          id: row.id,
          identity: {
            manufacturer:
              row.manufacturer,
            family: row.model,
            modelName: row.model,
          },
          ...(row.batteryMah
            ? {
                battery: {
                  capacityMah:
                    row.batteryMah,
                },
              }
            : {}),
          ...(row.socName
            ? {
                soc: {
                  vendor:
                    socVendor(
                      row.socVendor,
                    ) ?? 'other',
                  name: row.socName,
                },
              }
            : {}),
          notes: [
            'TechAPI base model: ' +
              row.baseModelSlug,
            'TechAPI verified: ' +
              (row.verified === true
                ? 'yes'
                : row.catalogTrust ===
                    'source-backed-unverified'
                  ? 'no'
                  : 'unspecified'),
            'Catalog trust: ' +
              (row.catalogTrust ??
                (row.verified === true
                  ? 'verified-or-unspecified'
                  : 'unspecified')),
            'Catalog evidence only; no PhoneFuturist measurement is created from this record.',
            'Attribution: ' +
              file.attribution +
              ' (' +
              file.license +
              ')',
            ...row.sourceUrls.map(
              (url) =>
                'Upstream source: ' +
                url,
            ),
          ],
        },
        ...(row.releaseDate
          ? {
              releaseDate:
                row.releaseDate,
            }
          : {}),
        ...(row.display
          ? {
              display: {
                ...(row.display
                  .diagonalInches
                  ? {
                      diagonalInches:
                        row.display
                          .diagonalInches,
                    }
                  : {}),
                ...(row.display
                  .resolutionWidthPx
                  ? {
                      resolutionWidthPx:
                        row.display
                          .resolutionWidthPx,
                    }
                  : {}),
                ...(row.display
                  .resolutionHeightPx
                  ? {
                      resolutionHeightPx:
                        row.display
                          .resolutionHeightPx,
                    }
                  : {}),
                ...(row.display
                  .refreshRateHz
                  ? {
                      refreshRateHz:
                        row.display
                          .refreshRateHz,
                    }
                  : {}),
                ...(row.display
                  .panelTechnology
                  ? {
                      panelTechnology:
                        row.display
                          .panelTechnology,
                    }
                  : {}),
              },
            }
          : {}),
        ...(row.dimensions
          ? {
              dimensions: {
                ...row.dimensions,
              },
            }
          : {}),
        ...(row.cameras?.length
          ? {
              cameras:
                row.cameras.map(
                  (camera) => ({
                    role:
                      camera.role,
                    ...(camera.sensorName
                      ? {
                          sensorName:
                            camera.sensorName,
                        }
                      : {}),
                    ...(camera.resolutionMp
                      ? {
                          resolutionMp:
                            camera.resolutionMp,
                        }
                      : {}),
                    ...(camera.apertureFNumber
                      ? {
                          apertureFNumber:
                            camera.apertureFNumber,
                        }
                      : {}),
                  }),
                ),
            }
          : {}),
        ...(row.charging
          ? {
              charging: {
                ...row.charging,
              },
            }
          : {}),
        sourceIds: [
          source.id,
        ],
      }),
    );

  return {
    version: file.version,
    sources: [source],
    devices,
    measurements: [],
  };
}

export function techApiCatalogCount() {
  const file =
    techApiJson as unknown as TechApiFile;

  return {
    selected:
      file.selection.selectedCount,
    devices:
      file.devices.length,
    uniqueBaseModels:
      file.selection.uniqueBaseModelCount ??
      new Set(
        file.devices.map(
          (device) =>
            device.baseModelSlug,
        ),
      ).size,
    variantBackfill:
      file.selection.variantBackfillCount ??
      (
        file.devices.length -
        new Set(
          file.devices.map(
            (device) =>
              device.baseModelSlug,
          ),
        ).size
      ),
    maxEntriesPerBaseModel:
      file.selection.maxEntriesPerBaseModel,
    verifiedOrUnspecified:
      file.selection.verifiedOrUnspecifiedCount ??
      file.devices.filter(
        (device) =>
          device.catalogTrust !==
          'source-backed-unverified',
      ).length,
    sourceBackedUnverified:
      file.selection.sourceBackedUnverifiedCount ??
      file.devices.filter(
        (device) =>
          device.catalogTrust ===
          'source-backed-unverified',
      ).length,
    years:
      file.selection.years ?? [],
  };
}
