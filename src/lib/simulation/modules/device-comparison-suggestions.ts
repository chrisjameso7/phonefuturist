import type { DeviceCorpus } from './device-corpus';

function deviceLabel(manufacturer: string, model: string) {
  return model.toLowerCase().startsWith(manufacturer.trim().toLowerCase() + ' ')
    ? model : `${manufacturer} ${model}`;
}

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
  // Product families frequently put their generation before a multiword tier.
  // Keep the tier exactly as written, including "Pro XL" and "Pro Max".
  const match = text.match(/^(.*?)(\d{1,3})(\s*(?:Pro\s+Max|Pro\s+XL|Ultra|Pro|Plus|FE|Edge|Mini|Air|Max|XL|Fold|Flip|e)?)$/i);
  if (!match) return [];
  const [, prefix, generation, suffix] = match;
  const n = Number(generation);
  if (!Number.isSafeInteger(n) || n < 2 || !prefix.trim()) return [];
  const names = [
    {query:`${prefix}${n - 1}${suffix}`.trim(), role:'predecessor' as const},
    ...(n > 2 ? [{query:`${prefix}${n - 2}${suffix}`.trim(),role:'older-generation' as const}] : []),
    ...(suffix.trim() ? [{query:`${prefix}${n - 1}`.trim(),role:'related-model' as const}] : []),
  ];
  const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const today=new Date().toISOString().slice(0,10);
  const trustRank=(trust?:string)=>trust==='verified-or-unspecified'?2:trust==='source-backed-unverified'?0:1;
  return names.map(({query,role}) => {
    // Search the entire corpus so an exact record is not lost to fuzzy-result limits.
    // Prefer a released, higher-trust variant when regions or SKUs repeat a name.
    const exact=corpus.devices.filter(device=>{
      const identity=device.variant.identity;
      const model=normalized(identity.modelName);
      return model===normalized(query) ||
        normalized(identity.manufacturer+' '+identity.modelName)===normalized(query);
    }).filter(device=>!device.releaseDate ||
      /^\d{4}-\d{2}-\d{2}$/.test(device.releaseDate) && device.releaseDate<=today)
      .sort((a,b)=>trustRank(b.catalogTrust)-trustRank(a.catalogTrust) ||
        a.variant.id.localeCompare(b.variant.id))[0];
    return {query,role,status:exact?'found' as const:'not-in-catalog' as const,
      ...(exact?{deviceId:exact.variant.id}:{}),
      label:exact?deviceLabel(exact.variant.identity.manufacturer, exact.variant.identity.modelName):query,
      ...(exact ? {released:{
        batteryMah:exact.variant.battery?.typicalCapacityMah ?? exact.variant.battery?.capacityMah,
        displayInches:exact.display?.diagonalInches,
        refreshRateHz:exact.display?.refreshRateHz,
        wiredWatts:exact.charging?.advertisedWiredWatts,
        socName:exact.variant.soc?.name,
        region:exact.variant.identity.region,
        catalogUnverified:exact.catalogTrust === 'source-backed-unverified',
      }} : {})};
  });
}

/** Select comparable released phones from other manufacturers using published catalog specifications. */
export function suggestCompetingDevices(
  corpus: DeviceCorpus,
  options: {manufacturer?: string; batteryMah?: number; displayInches?: number; limit?: number},
): SuggestedComparison[] {
  const normalize=(v:string)=>v.trim().toLowerCase();
  const targetManufacturer=normalize(options.manufacturer ?? '');
  const targetBattery=options.batteryMah && Number.isFinite(options.batteryMah) && options.batteryMah>0
    ? options.batteryMah : undefined;
  const targetDisplay=options.displayInches && Number.isFinite(options.displayInches) && options.displayInches>0
    ? options.displayInches : undefined;
  // Without a comparable target dimension this would be a random phone recommendation.
  if (!targetBattery && !targetDisplay) return [];
  const today=new Date().toISOString().slice(0,10);
  const candidates=corpus.devices.filter(device=>
    Boolean(device.variant.identity.modelName) &&
    (!targetManufacturer || normalize(device.variant.identity.manufacturer) !== targetManufacturer) &&
    device.catalogTrust !== 'source-backed-unverified' &&
    (device.releaseDate === undefined || /^\d{4}-\d{2}-\d{2}$/.test(device.releaseDate) && device.releaseDate<=today)
  );
  const scored=candidates.flatMap(device=>{
    const capacity=device.variant.battery?.typicalCapacityMah ?? device.variant.battery?.capacityMah;
    const diagonal=device.display?.diagonalInches;
    // Never pretend a missing or invalid catalog field is a measured similarity.
    if (targetBattery && (!capacity || !Number.isFinite(capacity) || capacity<=0)) return [];
    if (targetDisplay && (!diagonal || !Number.isFinite(diagonal) || diagonal<=0)) return [];
    const batteryPenalty=targetBattery && capacity ? Math.abs(capacity-targetBattery)/targetBattery : 0;
    const sizePenalty=targetDisplay && diagonal ? Math.abs(diagonal-targetDisplay)/targetDisplay : 0;
    return [{device,score:batteryPenalty+sizePenalty}];
  }).filter(entry=>entry.score<0.6).sort((a,b)=>
    a.score-b.score ||
    (a.device.variant.identity.manufacturer+' '+a.device.variant.identity.modelName)
      .localeCompare(b.device.variant.identity.manufacturer+' '+b.device.variant.identity.modelName)
  );
  const seen=new Set<string>();
  const limit=Number.isFinite(options.limit) ? Math.min(Math.max(Math.trunc(options.limit!),1),5) : 3;
  return scored.filter(({device})=>{
    // Presentation only: storage options should not fill all comparison slots.
    // Keep regional and radio names distinct; never use this key for evidence joins.
    const key=normalize(device.variant.identity.manufacturer+' '+device.variant.identity.modelName)
      .replace(/\b\d+(?:\.\d+)?\s*(?:gb|tb)\b/g,'').replace(/\s+/g,' ').trim();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,limit).map(({device})=>({
    query:deviceLabel(device.variant.identity.manufacturer,device.variant.identity.modelName),
    role:'related-model' as const,
    status:'found' as const,
    label:deviceLabel(device.variant.identity.manufacturer,device.variant.identity.modelName),
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
