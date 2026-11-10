import type { DeviceCorpus } from './device-corpus';

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
      label:exact?`${exact.variant.identity.manufacturer} ${exact.variant.identity.modelName}`:query,
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
/** "Huawei" + "Huawei Nova 14" → "Huawei Nova 14" (never repeat the brand). */
export function deviceDisplayName(manufacturer:string,modelName:string):string{
  const brand=manufacturer.trim();const model=modelName.trim();
  if(!brand)return model;
  return model.toLowerCase().startsWith(brand.toLowerCase()+' ')||model.toLowerCase()===brand.toLowerCase()?model:`${brand} ${model}`;
}
/** Catalog noise: codenames, SIM/network, storage, region codes and model numbers. */
function stripCatalogNoise(label:string):string{
  return label
    .replace(/\s*\([^)]*\)\s*$/,'')
    .replace(/\b(Dual|Single) SIM\b/gi,'')
    .replace(/\b(TD-LTE|LTE|NFC|Global|Standard Edition)\b/g,'')
    .replace(/\b\d+\s?(GB|TB)\b/gi,'')
    .split(/\s+/)
    // Region codes (ID, SG, JP, MEA…) and model numbers (SH-M31SG, A3525, XT2433-1), never "S26" or "5G".
    .filter(token=>!/^(?:[A-Z]{2}|MEA|EEA|LATAM|APAC)$/.test(token) && !/^[A-Z0-9]+-[A-Z0-9-]*\d[A-Z0-9-]*$/.test(token) && !/^[A-Z]{1,3}\d{4,}[A-Z0-9]*$/.test(token) && !/^[A-Z]{1,3}\d{3,}[A-Z]{1,3}$/.test(token))
    .join(' ').replace(/\s+/g,' ').trim();
}
/** "Qualcomm Snapdragon 8S Gen 3 Sm8635" → "Snapdragon 8s Gen 3" (part numbers dropped). */
export function shortChipName(name:string):string{
  const short=name
    .replace(/^(Qualcomm|Mediatek|MediaTek|Apple|Samsung|Google|HiSilicon|Hisilicon)\s+/,'')
    .split(/\s+/)
    .filter(token=>!/^(sm|mt|apl|t)\d[\w]*$/i.test(token) && !/^apl\w*\d\w*$/i.test(token) && !/^5G$/.test(token))
    .join(' ')
    .replace(/\b8S\b/,'8s');
  return short.trim()||name;
}
/** Readable card title for a catalog device; falls back to the full label. */
export function shortDeviceName(label:string):string{
  return stripCatalogNoise(label)||label;
}
/**
 * Coarse chip class from the public product name: 3 flagship, 2 upper-mid, 1 entry.
 * A naming classification only — never a performance measurement. Unknown → undefined.
 */
export function socClass(name?:string):1|2|3|undefined{
  const n=(name??'').toLowerCase().replace(/^(qualcomm|mediatek|samsung|google|apple|huawei|hisilicon)\s+/,'').trim();
  if(!n)return undefined;
  if(/snapdragon\s+8(\s|$)|snapdragon\s+8\+|snapdragon\s+8s?\s+(gen|elite)|snapdragon\s+8\d\d|dimensity\s+9\d{3}|exynos\s+(2\d{3}|990)|^a1\d(\s|$)|^a\d{2}\s+pro|tensor|kirin\s+9\d{3}|xring/.test(n))return 3;
  if(/snapdragon\s+7|snapdragon\s+8s|dimensity\s+[78]\d{3}|dimensity\s+1\d{3}|exynos\s+1[3-9]\d{2}|kirin\s+8\d{2,3}/.test(n))return 2;
  if(/snapdragon\s+[46]|snapdragon\s+[2-6]\d{2}|dimensity\s+[4-6]\d{3}|dimensity\s+[78]\d{2}(\D|$)|helio|exynos\s+(8\d{2}|1[0-2]\d{2})|unisoc|tiger|kirin\s+[67]\d{2}/.test(n))return 1;
  return undefined;
}

/** Storage-only variants (256GB vs 1TB) are the same phone for comparison purposes. */
function comparisonKey(manufacturer:string,modelName:string):string{
  const name=deviceDisplayName(manufacturer,modelName);
  return (stripCatalogNoise(name)||name).toLowerCase();
}

export function suggestCompetingDevices(
  corpus: DeviceCorpus,
  options: {manufacturer?: string; batteryMah?: number; displayInches?: number; socName?: string; limit?: number},
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
  const targetClass=socClass(options.socName);
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
    // Same chip class first: a flagship concept should not be compared with entry phones.
    const candidateClass=socClass(device.variant.soc?.name);
    const classPenalty=targetClass===undefined ? 0 : candidateClass===undefined ? 0.2 : Math.abs(candidateClass-targetClass)*0.35;
    // Prefer current phones; older releases drift down gradually.
    const ageYears=device.releaseDate ? (Date.parse(today)-Date.parse(device.releaseDate))/31_557_600_000 : undefined;
    const agePenalty=ageYears===undefined ? 0.05 : Math.min(0.25,Math.max(0,ageYears-1)*0.06);
    return [{device,score:batteryPenalty+sizePenalty+classPenalty+agePenalty}];
  }).filter(entry=>entry.score<0.6).sort((a,b)=>
    a.score-b.score ||
    (a.device.variant.identity.manufacturer+' '+a.device.variant.identity.modelName)
      .localeCompare(b.device.variant.identity.manufacturer+' '+b.device.variant.identity.modelName)
  );
  const seen=new Set<string>();
  return scored.filter(({device})=>{
    const key=comparisonKey(device.variant.identity.manufacturer,device.variant.identity.modelName);
    // Carrier/region editions share a maker, chip, battery and screen: show one of them.
    const capacity=device.variant.battery?.typicalCapacityMah ?? device.variant.battery?.capacityMah;
    const specs=device.variant.soc?.name && capacity && device.display?.diagonalInches
      ? ['specs',normalize(device.variant.identity.manufacturer),normalize(device.variant.soc.name),capacity,device.display.diagonalInches].join('|')
      : undefined;
    if(seen.has(key)||(specs&&seen.has(specs)))return false;
    seen.add(key);
    if(specs)seen.add(specs);
    return true;
  }).slice(0,Math.min(Math.max(options.limit ?? 3,1),5)).map(({device})=>({
    query:deviceDisplayName(device.variant.identity.manufacturer,device.variant.identity.modelName),
    role:'related-model' as const,
    status:'found' as const,
    label:deviceDisplayName(device.variant.identity.manufacturer,device.variant.identity.modelName),
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
