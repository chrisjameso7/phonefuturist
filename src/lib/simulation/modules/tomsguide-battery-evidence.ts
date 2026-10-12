import snapshotJson from '../../../../data/calibration/tomsguide-battery-scenarios-2026-10-12-0.1.json';

export const TOMSGUIDE_BATTERY_EVIDENCE_VERSION =
  'tomsguide-battery-evidence-0.1.0';

export interface TomsGuideBatteryResult {
  manufacturer: string;
  model: string;
  batteryMah: number;
  runtimeMinutes: number;
  notes?: string[];
}

export interface TomsGuideDisplayScenario {
  id: string;
  refreshMode: 'adaptive' | '60hz';
  privacyMode: 'off' | 'on' | 'maximum';
  runtimeMinutes: number;
}

type RawSnapshot = {
  version: string;
  accessedDate: string;
  source: {
    publisher: string;
    sourceRole: string;
    protocol: string;
    methodologyUrl: string;
  };
  baselineArticle: {
    url: string;
    publishedDate: string;
    devices: TomsGuideBatteryResult[];
  };
  galaxyS26UltraDisplayScenarios: {
    url: string;
    device: {
      manufacturer: string;
      model: string;
      batteryMah: number;
    };
    scenarios: TomsGuideDisplayScenario[];
    note: string;
  };
};

const snapshot =
  snapshotJson as unknown as RawSnapshot;

function normalizeModel(
  manufacturer: string,
  model: string,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  let value =
    model
      .trim()
      .toLowerCase();

  if (
    maker &&
    value.startsWith(
      `${maker} `,
    )
  ) {
    value =
      value.slice(
        maker.length + 1,
      );
  }

  if (
    maker === 'samsung' &&
    value.startsWith('galaxy ')
  ) {
    value =
      value.slice(7);
  }

  if (
    maker === 'google' &&
    value.startsWith('google ')
  ) {
    value =
      value.slice(7);
  }

  return value
    .replace(/\b5g\b/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findTomsGuideBatteryResult(
  manufacturer: string,
  model: string,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  const target =
    normalizeModel(
      manufacturer,
      model,
    );

  return snapshot.baselineArticle.devices.find(
    (row) =>
      row.manufacturer
        .trim()
        .toLowerCase() === maker &&
      normalizeModel(
        row.manufacturer,
        row.model,
      ) === target,
  );
}

export function listTomsGuideBatteryResults() {
  return snapshot.baselineArticle.devices.map(
    (row) => ({
      ...row,
      notes: row.notes
        ? [...row.notes]
        : undefined,
    }),
  );
}

export function getTomsGuideS26UltraDisplayScenarios() {
  const scenarios =
    snapshot.galaxyS26UltraDisplayScenarios
      .scenarios;

  const baseline =
    scenarios.find(
      (row) =>
        row.id ===
        'adaptive_privacy_off',
    );

  return {
    device: {
      ...snapshot.galaxyS26UltraDisplayScenarios
        .device,
    },
    sourceUrl:
      snapshot.galaxyS26UltraDisplayScenarios
        .url,
    note:
      snapshot.galaxyS26UltraDisplayScenarios
        .note,
    scenarios:
      scenarios.map(
        (row) => ({
          ...row,
          ...(baseline
            ? {
                deltaMinutesVsAdaptivePrivacyOff:
                  row.runtimeMinutes -
                  baseline.runtimeMinutes,
                deltaPercentVsAdaptivePrivacyOff:
                  (
                    row.runtimeMinutes /
                    baseline.runtimeMinutes -
                    1
                  ) * 100,
              }
            : {}),
        }),
      ),
  };
}

export function getTomsGuideEvidenceMetadata() {
  return {
    version:
      snapshot.version,
    accessedDate:
      snapshot.accessedDate,
    protocol:
      snapshot.source.protocol,
    methodologyUrl:
      snapshot.source.methodologyUrl,
    baselineArticleUrl:
      snapshot.baselineArticle.url,
    baselinePublishedDate:
      snapshot.baselineArticle.publishedDate,
  };
}
