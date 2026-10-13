import type { DeviceCorpus } from './device-corpus';
import { findDeviceByName } from './device-lookup';

export type SuggestedComparison = {
  query: string;
  role: 'predecessor' | 'older-generation' | 'related-model';
  status: 'found' | 'not-in-catalog';
  deviceId?: string;
  label: string;
  released?: { batteryMah?: number; displayInches?: number; refreshRateHz?: number; wiredWatts?: number; socName?: string; region?: string; catalogUnverified: boolean };
};

/** Generation-aware suggestions; only confirm released devices that actually exist in the corpus. */
export function suggestDeviceComparisons(corpus: DeviceCorpus, concept: string): SuggestedComparison[] {
  const text = concept.trim().replace(/\s+concept$/i, '').trim();
  const match = text.match(/^(.*?)(\d{1,3})(\s*(?:Ultra|Pro Max|Pro|Plus|FE|Edge|Mini|Air|Max)?)$/i);
  if (!match) return [];
  const [, prefix, generation, suffix] = match;
  const n = Number(generation);
  if (!Number.isSafeInteger(n) || n < 2) return [];
  const names = [
    {query:`${prefix}${n - 1}${suffix}`.trim(), role:'predecessor' as const},
    ...(n > 2 ? [{query:`${prefix}${n - 2}${suffix}`.trim(),role:'older-generation' as const}] : []),
    ...(suffix.trim() ? [{query:`${prefix}${n - 1}`.trim(),role:'related-model' as const}] : []),
  ];
  return names.map(({query,role}) => {
    const hits=findDeviceByName(corpus,query,12);
    const exact=hits.find(hit=>{
      const identity=hit.device.variant.identity;
      const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
      return normalized(identity.modelName) === normalized(query) ||
        normalized(identity.manufacturer+' '+identity.modelName) === normalized(query);
    });
    return {query,role,status:exact?'found' as const:'not-in-catalog' as const,
      ...(exact?{deviceId:exact.device.variant.id}:{}),
      label:exact?`${exact.device.variant.identity.manufacturer} ${exact.device.variant.identity.modelName}`:query,
      ...(exact ? {released:{
        batteryMah:exact.device.variant.battery?.typicalCapacityMah ?? exact.device.variant.battery?.capacityMah,
        displayInches:exact.device.display?.diagonalInches,
        refreshRateHz:exact.device.display?.refreshRateHz,
        wiredWatts:exact.device.charging?.advertisedWiredWatts,
        socName:exact.device.variant.soc?.name,
        region:exact.device.variant.identity.region,
        catalogUnverified:exact.device.catalogTrust === 'source-backed-unverified',
      }} : {})};
  });
}
