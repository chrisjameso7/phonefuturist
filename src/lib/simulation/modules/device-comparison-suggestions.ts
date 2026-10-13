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

/** Select comparable released phones from other manufacturers using published catalog specifications. */
export function suggestCompetingDevices(
  corpus: DeviceCorpus,
  options: {manufacturer?: string; batteryMah?: number; displayInches?: number; limit?: number},
): SuggestedComparison[] {
  const normalize=(v:string)=>v.trim().toLowerCase();
  const candidates=corpus.devices.filter(device=>
    device.variant.identity.modelName &&
    normalize(device.variant.identity.manufacturer) !== normalize(options.manufacturer ?? '') &&
    device.catalogTrust !== 'source-backed-unverified' &&
    (device.releaseDate === undefined || device.releaseDate <= new Date().toISOString().slice(0,10))
  );
  const scored=candidates.map(device=>{
    const capacity=device.variant.battery?.typicalCapacityMah ?? device.variant.battery?.capacityMah;
    const diagonal=device.display?.diagonalInches;
    const batteryPenalty=options.batteryMah && capacity ? Math.abs(capacity-options.batteryMah)/options.batteryMah : 0.4;
    const sizePenalty=options.displayInches && diagonal ? Math.abs(diagonal-options.displayInches)/options.displayInches : 0.4;
    return {device,score:batteryPenalty+sizePenalty};
  }).filter(entry=>entry.score<0.6).sort((a,b)=>a.score-b.score);
  const seen=new Set<string>();
  return scored.filter(({device})=>{
    const key=normalize(device.variant.identity.manufacturer+' '+device.variant.identity.modelName);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,Math.min(Math.max(options.limit ?? 3,1),5)).map(({device})=>({
    query:device.variant.identity.manufacturer+' '+device.variant.identity.modelName,
    role:'related-model' as const,
    status:'found' as const,
    label:device.variant.identity.manufacturer+' '+device.variant.identity.modelName,
    deviceId:device.variant.id,
    released:{
      batteryMah:device.variant.battery?.typicalCapacityMah ?? device.variant.battery?.capacityMah,
      displayInches:device.display?.diagonalInches,
      refreshRateHz:device.display?.refreshRateHz,
      wiredWatts:device.charging?.advertisedWiredWatts,
      socName:device.variant.soc?.name,
      region:device.variant.identity.region,
      catalogUnverified:false,
    },
  }));
}
