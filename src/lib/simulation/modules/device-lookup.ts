import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

export interface DeviceLookupMatch {
  device: DeviceCorpusRecord;
  score: number;
  reasons: string[];
}

function norm(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findDeviceByName(
  corpus: DeviceCorpus,
  query: string,
  limit = 8,
): DeviceLookupMatch[] {
  const q = norm(query);
  if (!q) return [];

  const tokens = q.split(' ').filter(Boolean);

  return corpus.devices
    .map((device) => {
      const identity = device.variant.identity;
      const model = norm(identity.modelName);
      const manufacturer = norm(identity.manufacturer);
      const family = norm(identity.family);
      const full = norm(`${identity.manufacturer} ${identity.modelName}`);
      const modelNumber = norm(identity.modelNumber ?? '');
      const sku = norm(identity.sku ?? '');

      let score = 0;
      const reasons: string[] = [];

      if (q === full || q === model) {
        score += 10;
        reasons.push('exact model match');
      } else {
        const haystack = `${manufacturer} ${family} ${model} ${modelNumber} ${sku}`;
        const matchedTokens = tokens.filter((token) => haystack.includes(token));
        score += matchedTokens.length * 1.5;

        if (model.includes(q) || full.includes(q)) {
          score += 5;
          reasons.push('strong name match');
        }

        if (matchedTokens.length === tokens.length && tokens.length > 0) {
          score += 2;
          reasons.push('all query terms matched');
        }
      }

      if (identity.region) {
        const region = norm(identity.region);
        if (tokens.some((token) => region.includes(token))) {
          score += 1;
          reasons.push('region matched');
        }
      }

      return { device, score, reasons };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}
