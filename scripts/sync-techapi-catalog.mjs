import fs from 'node:fs/promises';
import path from 'node:path';

const inputRoot = process.argv[2];
const outputPath = process.argv[3] ?? 'data/calibration/techapi-recent-1000-0.1.json';
const targetCount = Number(process.argv[4] ?? 1000);

if (!inputRoot) {
  throw new Error('Usage: node scripts/sync-techapi-catalog.mjs <TechAPI data/smartphone dir> [output] [count]');
}

const YEAR_MIN = 2025;
const YEAR_MAX = 2026;

const BRAND_NAMES = new Map([
  ['apple', 'Apple'],
  ['asus', 'Asus'],
  ['blackview', 'Blackview'],
  ['google', 'Google'],
  ['hmd', 'HMD'],
  ['honor', 'Honor'],
  ['huawei', 'Huawei'],
  ['infinix', 'Infinix'],
  ['iqoo', 'iQOO'],
  ['itel', 'itel'],
  ['motorola', 'Motorola'],
  ['nothing', 'Nothing'],
  ['nubia', 'Nubia'],
  ['oneplus', 'OnePlus'],
  ['oppo', 'OPPO'],
  ['poco', 'POCO'],
  ['realme', 'realme'],
  ['redmagic', 'RedMagic'],
  ['samsung', 'Samsung'],
  ['sony', 'Sony'],
  ['tcl', 'TCL'],
  ['tecno', 'Tecno'],
  ['ulefone', 'Ulefone'],
  ['vivo', 'vivo'],
  ['xiaomi', 'Xiaomi'],
  ['zte', 'ZTE'],
]);

function titleCaseSlug(value) {
  return String(value ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function manufacturerName(brand) {
  return BRAND_NAMES.get(brand) ?? titleCaseSlug(brand);
}

function socVendorFromSlug(slug) {
  const value = String(slug ?? '').toLowerCase();
  if (!value) return undefined;
  if (value.includes('snapdragon') || value.startsWith('qualcomm')) return 'Qualcomm';
  if (value.includes('dimensity') || value.includes('helio') || value.startsWith('mediatek')) return 'MediaTek';
  if (value.includes('exynos')) return 'Samsung';
  if (value.startsWith('apple-') || /^a\d/.test(value)) return 'Apple';
  if (value.includes('tensor')) return 'Google';
  if (value.includes('kirin')) return 'Huawei';
  if (value.includes('unisoc') || value.includes('spreadtrum') || value.includes('tiger-')) return 'Unisoc';
  return 'other';
}

function socNameFromSlug(slug) {
  if (!slug) return undefined;
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d/.test(part)) return part.toUpperCase();
      const lower = part.toLowerCase();
      if (lower === 'gen') return 'Gen';
      if (lower === 'pro') return 'Pro';
      if (lower === 'max') return 'Max';
      if (lower === 'ultra') return 'Ultra';
      if (lower === 'plus') return 'Plus';
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function parseResolution(value) {
  if (!value || typeof value !== 'string') return {};
  const match = value.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
  if (!match) return {};
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return {};
  return {
    resolutionWidthPx: Math.max(a, b),
    resolutionHeightPx: Math.min(a, b),
  };
}

function finitePositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    }),
  );
}

function completenessScore(row) {
  let score = 0;
  if (row.slug && row.base_model_slug && row.slug === row.base_model_slug) score += 20;
  if (row.verified === true) score += 10;
  if (row.soc) score += 5;
  if (finitePositive(row.battery_mah)) score += 5;
  if (row.display?.size_inch) score += 2;
  if (row.display?.resolution) score += 2;
  if (row.display?.refresh_hz) score += 2;
  if (finitePositive(row.charging_wired_w)) score += 2;
  if (row.cameras?.length) score += 2;
  if (row.source_urls?.length) score += 4;
  return score;
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      yield full;
    }
  }
}

const candidates = [];

for await (const file of walk(inputRoot)) {
  const relative = path.relative(inputRoot, file).split(path.sep);
  const year = Number(relative[1]);

  // Accept both canonical base-model records and nested market/storage/SKU
  // variants, but only when TechAPI marks them verified and source-backed.
  // Selection below still deduplicates by base_model_slug and strongly
  // prefers canonical base records, so variants cannot overweight a model.
  if (relative.length < 3) continue;
  if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) continue;

  let row;
  try {
    row = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    continue;
  }

  if (!row?.slug || !row?.name || !row?.brand) continue;
  if (!row?.release_date || !/^202[5-6]-\d{2}-\d{2}$/.test(row.release_date)) continue;
  if (row.verified === false) continue;
  if (!Array.isArray(row.source_urls) || row.source_urls.length === 0) continue;

  candidates.push({ row, file, score: completenessScore(row) });
}

const byBaseModel = new Map();

for (const candidate of candidates) {
  const key = candidate.row.base_model_slug || candidate.row.slug;
  const current = byBaseModel.get(key);

  if (
    !current ||
    candidate.score > current.score ||
    (
      candidate.score === current.score &&
      candidate.row.release_date > current.row.release_date
    )
  ) {
    byBaseModel.set(key, candidate);
  }
}

const orderedBaseCandidates = [...byBaseModel.values()]
  .sort((a, b) => {
    const date = String(b.row.release_date).localeCompare(String(a.row.release_date));
    if (date) return date;
    const score = b.score - a.score;
    if (score) return score;
    const brand = String(a.row.brand).localeCompare(String(b.row.brand));
    if (brand) return brand;
    return String(a.row.name).localeCompare(String(b.row.name));
  });

const BRAND_DIVERSITY_CAP = 100;
const selected = [];
const selectedSlugs = new Set();
const selectedBaseModels = new Set();
const selectedPerBrand = new Map();
const selectedPerBaseModel = new Map();

function selectCandidate(candidate) {
  const slug = String(candidate.row.slug);
  const baseKey =
    String(
      candidate.row.base_model_slug ||
      candidate.row.slug,
    );

  selected.push(candidate);
  selectedSlugs.add(slug);
  selectedBaseModels.add(baseKey);
  selectedPerBrand.set(
    String(candidate.row.brand),
    (selectedPerBrand.get(
      String(candidate.row.brand),
    ) ?? 0) + 1,
  );
  selectedPerBaseModel.set(
    baseKey,
    (selectedPerBaseModel.get(
      baseKey,
    ) ?? 0) + 1,
  );
}

// Stage 1: maximize unique marketed/base models with broad brand coverage.
for (const candidate of orderedBaseCandidates) {
  if (selected.length >= targetCount) break;

  const brand = String(candidate.row.brand);
  const used = selectedPerBrand.get(brand) ?? 0;

  if (used >= BRAND_DIVERSITY_CAP) continue;

  selectCandidate(candidate);
}

// Fill any remaining unique base models regardless of brand cap.
for (const candidate of orderedBaseCandidates) {
  if (selected.length >= targetCount) break;

  const slug = String(candidate.row.slug);
  if (selectedSlugs.has(slug)) continue;

  selectCandidate(candidate);
}

// Stage 2: if fewer than targetCount unique base models exist in 2025-2026,
// backfill real verified/source-backed market/storage/region variants.
// Allow at most one extra variant per base model, preventing families with
// many SKUs from dominating the catalog.
if (selected.length < targetCount) {
  const variantCandidates = [...candidates]
    .filter((candidate) => {
      const slug = String(candidate.row.slug);
      const baseKey =
        String(
          candidate.row.base_model_slug ||
          candidate.row.slug,
        );

      return (
        !selectedSlugs.has(slug) &&
        selectedBaseModels.has(baseKey)
      );
    })
    .sort((a, b) => {
      const canonicalA =
        a.row.slug ===
        a.row.base_model_slug
          ? 1
          : 0;
      const canonicalB =
        b.row.slug ===
        b.row.base_model_slug
          ? 1
          : 0;
      if (canonicalA !== canonicalB) {
        return canonicalB - canonicalA;
      }

      const date =
        String(
          b.row.release_date,
        ).localeCompare(
          String(a.row.release_date),
        );
      if (date) return date;

      const score =
        b.score - a.score;
      if (score) return score;

      return String(
        a.row.slug,
      ).localeCompare(
        String(b.row.slug),
      );
    });

  for (const candidate of variantCandidates) {
    if (selected.length >= targetCount) break;

    const slug =
      String(candidate.row.slug);
    const baseKey =
      String(
        candidate.row.base_model_slug ||
        candidate.row.slug,
      );

    if (selectedSlugs.has(slug)) continue;

    // One canonical/base entry + at most one additional variant.
    if (
      (selectedPerBaseModel.get(baseKey) ?? 0) >= 2
    ) {
      continue;
    }

    selectCandidate(candidate);
  }
}

if (selected.length < targetCount) {
  throw new Error(
    `Only ${selected.length} verified/source-backed 2025-2026 catalog entries were available after controlled variant backfill; target is ${targetCount}. Unique base models: ${selectedBaseModels.size}.`,
  );
}

const devices = selected.map(({ row }) => {
  const resolution = parseResolution(row.display?.resolution);
  const cameras = Array.isArray(row.cameras)
    ? row.cameras
        .filter((camera) => camera && camera.type)
        .map((camera) =>
          compactObject({
            role: String(camera.type),
            sensorName: camera.sensor,
            resolutionMp: finitePositive(camera.mp) ? camera.mp : undefined,
            apertureFNumber: finitePositive(camera.aperture) ? camera.aperture : undefined,
          }),
        )
    : [];

  const display = compactObject({
    diagonalInches: finitePositive(row.display?.size_inch)
      ? row.display.size_inch
      : undefined,
    ...resolution,
    refreshRateHz: finitePositive(row.display?.refresh_hz)
      ? row.display.refresh_hz
      : undefined,
    panelTechnology: row.display?.type,
    brightnessNits: finitePositive(row.display?.brightness_nits)
      ? row.display.brightness_nits
      : undefined,
  });

  const dimensions = compactObject({
    widthMm: finitePositive(row.dimensions?.width_mm)
      ? row.dimensions.width_mm
      : undefined,
    heightMm: finitePositive(row.dimensions?.height_mm)
      ? row.dimensions.height_mm
      : undefined,
    thicknessMm: finitePositive(row.dimensions?.depth_mm)
      ? row.dimensions.depth_mm
      : undefined,
    weightG: finitePositive(row.weight_g) ? row.weight_g : undefined,
  });

  const charging = compactObject({
    advertisedWiredWatts: finitePositive(row.charging_wired_w)
      ? row.charging_wired_w
      : undefined,
    advertisedWirelessWatts: finitePositive(row.charging_wireless_w)
      ? row.charging_wireless_w
      : undefined,
  });

  return compactObject({
    id: `techapi-${row.brand}-${row.slug}`,
    manufacturer: manufacturerName(row.brand),
    model: row.name,
    baseModelSlug: row.base_model_slug || row.slug,
    releaseDate: row.release_date,
    batteryMah: finitePositive(row.battery_mah) ? row.battery_mah : undefined,
    socVendor: row.soc ? socVendorFromSlug(row.soc) : undefined,
    socName: row.soc ? socNameFromSlug(row.soc) : undefined,
    display,
    dimensions,
    cameras,
    charging,
    verified: row.verified === true,
    sourceUrls: row.source_urls.slice(0, 6),
  });
});

const brandCounts = Object.fromEntries(
  [...new Set(devices.map((device) => device.manufacturer))]
    .sort()
    .map((brand) => [
      brand,
      devices.filter((device) => device.manufacturer === brand).length,
    ]),
);

const output = {
  version: 'techapi-recent-1000-0.1.0',
  generatedAt: new Date().toISOString(),
  license: 'CC-BY-SA-4.0',
  attribution: 'Data from TechAPI (https://github.com/GetTechAPI/TechAPI)',
  selection: {
    targetCount,
    selectedCount: devices.length,
    uniqueBaseModelCount:
      new Set(
        devices.map(
          (device) =>
            device.baseModelSlug,
        ),
      ).size,
    variantBackfillCount:
      devices.length -
      new Set(
        devices.map(
          (device) =>
            device.baseModelSlug,
        ),
      ).size,
    maxEntriesPerBaseModel: 2,
    years: [2025, 2026],
    uniqueBy: 'TechAPI verified/source-backed 2025-2026 records deduplicated by base_model_slug; canonical base records preferred',
    requireSourceUrls: true,
    excludeVerifiedFalse: true,
    order: 'unique base models first with brand diversity, then one verified variant per selected base model as needed',
    brandDiversityFirstPassCap: BRAND_DIVERSITY_CAP,
  },
  brandCounts,
  source: {
    id: 'techapi-open-data-cc-by-sa',
    publisher: 'TechAPI',
    url: 'https://github.com/GetTechAPI/TechAPI',
    protocol: 'Curated open specification dataset; PhoneFuturist snapshot uses catalog/spec fields only, never treats them as lab measurements.',
    accessedDate: new Date().toISOString().slice(0, 10),
  },
  devices,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(
  JSON.stringify(
    {
      outputPath,
      selected: devices.length,
      uniqueCandidates: byBaseModel.size,
      candidateFiles: candidates.length,
      brands: Object.keys(brandCounts).length,
      newest: devices[0]?.releaseDate,
      oldest: devices.at(-1)?.releaseDate,
    },
    null,
    2,
  ),
);
