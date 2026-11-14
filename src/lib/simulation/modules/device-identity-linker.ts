import type {
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const DEVICE_IDENTITY_LINKER_VERSION =
  'device-identity-linker-0.1.0';

export interface DeviceIdentityLink {
  canonicalDeviceId: string;
  linkedDeviceIds: string[];
  manufacturer: string;
  canonicalModel: string;
}

function normalizeManufacturer(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  const aliases:
    Record<string, string> = {
      samsung: 'samsung',
      apple: 'apple',
      google: 'google',
      oneplus: 'oneplus',
      oppo: 'oppo',
      vivo: 'vivo',
      iqoo: 'iqoo',
      motorola: 'motorola',
      moto: 'motorola',
      xiaomi: 'xiaomi',
      redmi: 'xiaomi',
      poco: 'poco',
      honor: 'honor',
      huawei: 'huawei',
      nubia: 'nubia',
      redmagic: 'nubia',
      nothing: 'nothing',
      asus: 'asus',
      sony: 'sony',
      realme: 'realme',
    };

  return aliases[normalized] ??
    normalized;
}

function normalizeModel(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\b(global|dual sim|td-lte|5g|4g|lte|uw|unlocked)\b/g,
      ' ',
    )
    .replace(
      /\([^)]*\)/g,
      ' ',
    )
    .replace(
      /\b\d{2,4}gb\b/g,
      ' ',
    )
    .replace(
      /[^a-z0-9+]+/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function modelTokens(
  value: string,
) {
  return normalizeModel(value)
    .split(' ')
    .filter(Boolean);
}

function containsOrderedModel(
  candidate: string,
  cleanModel: string,
) {
  const candidateTokens =
    modelTokens(candidate);
  const cleanTokens =
    modelTokens(cleanModel);

  if (!cleanTokens.length) {
    return false;
  }

  let cursor = 0;

  for (const token of candidateTokens) {
    if (
      token ===
      cleanTokens[cursor]
    ) {
      cursor += 1;

      if (
        cursor ===
        cleanTokens.length
      ) {
        return true;
      }
    }
  }

  return false;
}

function cleanCatalogCandidateMap(
  corpus: DeviceCorpus,
) {
  const byManufacturer =
    new Map<
      string,
      DeviceCorpusRecord[]
    >();

  for (const device of corpus.devices) {
    if (
      !device.variant.id.startsWith(
        'techapi-',
      )
    ) {
      continue;
    }

    const model =
      device.variant.identity
        .modelName;

    const normalized =
      normalizeModel(model);

    if (
      !normalized.length ||
      /\b(sm-|a\d{4}|gb\b|tb\b|dual sim|td lte|global|uw)\b/i.test(
        model,
      )
    ) {
      continue;
    }

    const manufacturer =
      normalizeManufacturer(
        device.variant.identity
          .manufacturer,
      );

    const group =
      byManufacturer.get(
        manufacturer,
      ) ?? [];

    group.push(device);

    byManufacturer.set(
      manufacturer,
      group,
    );
  }

  for (
    const group of
    byManufacturer.values()
  ) {
    group.sort(
      (a, b) =>
        normalizeModel(
          b.variant.identity
            .modelName,
        ).length -
        normalizeModel(
          a.variant.identity
            .modelName,
        ).length,
    );
  }

  return byManufacturer;
}

function canonicalCatalogMatch(
  candidatesByManufacturer:
    Map<string, DeviceCorpusRecord[]>,
  device: DeviceCorpusRecord,
) {
  const manufacturer =
    normalizeManufacturer(
      device.variant.identity
        .manufacturer,
    );

  const candidates =
    candidatesByManufacturer.get(
      manufacturer,
    ) ?? [];

  for (const candidate of candidates) {
    if (
      containsOrderedModel(
        device.variant.identity
          .modelName,
        candidate.variant.identity
          .modelName,
      )
    ) {
      return candidate;
    }
  }

  return undefined;
}

function identityKey(
  device: DeviceCorpusRecord,
) {
  const identity =
    device.variant.identity;

  return [
    normalizeManufacturer(
      identity.manufacturer,
    ),
    normalizeModel(
      identity.modelName,
    ),
  ].join('::');
}

function sourcePriority(
  device: DeviceCorpusRecord,
) {
  const id =
    device.variant.id;

  if (id.startsWith('techapi-')) {
    return 100;
  }

  if (
    id.startsWith(
      'phonearena-',
    ) ||
    id.startsWith(
      'pa-charge-',
    ) ||
    id.startsWith(
      'gsmarena-',
    ) ||
    id.startsWith(
      'notebookcheck-',
    )
  ) {
    return 50;
  }

  return 10;
}

export function linkDeviceIdentities(
  corpus: DeviceCorpus,
): DeviceIdentityLink[] {
  const groups =
    new Map<
      string,
      DeviceCorpusRecord[]
    >();

  const catalogCandidates =
    cleanCatalogCandidateMap(
      corpus,
    );

  for (const device of corpus.devices) {
    if (
      device.variant.identity
        .manufacturer ===
        'Geekerwan SoC Reference' ||
      device.variant.identity
        .manufacturer ===
        'NanoReview SoC Reference'
    ) {
      continue;
    }

    const catalogMatch =
      canonicalCatalogMatch(
        catalogCandidates,
        device,
      );

    const key =
      catalogMatch
        ? identityKey(
            catalogMatch,
          )
        : identityKey(
            device,
          );

    const group =
      groups.get(key) ?? [];

    group.push(device);
    groups.set(
      key,
      group,
    );
  }

  return [...groups.values()]
    .filter(
      (group) =>
        group.length > 1,
    )
    .map((group) => {
      const ordered =
        [...group].sort(
          (a, b) =>
            sourcePriority(b) -
            sourcePriority(a),
        );

      const canonical =
        ordered[0];

      return {
        canonicalDeviceId:
          canonical.variant.id,
        linkedDeviceIds:
          ordered.map(
            (device) =>
              device.variant.id,
          ),
        manufacturer:
          canonical.variant.identity
            .manufacturer,
        canonicalModel:
          canonical.variant.identity
            .modelName,
      };
    });
}

export function resolveCanonicalDeviceId(
  corpus: DeviceCorpus,
  deviceId: string,
) {
  const links =
    linkDeviceIdentities(
      corpus,
    );

  for (const link of links) {
    if (
      link.linkedDeviceIds.includes(
        deviceId,
      )
    ) {
      return link.canonicalDeviceId;
    }
  }

  return deviceId;
}
