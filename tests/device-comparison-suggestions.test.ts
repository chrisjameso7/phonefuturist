import { describe, expect, it } from 'vitest';
import { suggestCompetingDevices, suggestDeviceComparisons } from '../src/lib/simulation/modules/device-comparison-suggestions';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('predecessor suggestions',()=>{
  const empty = {devices:[],measurements:[],sources:[]} as unknown as DeviceCorpus;
  it('derives the correct predecessor without claiming unverified catalog data',()=>{
    const items=suggestDeviceComparisons(empty,'Galaxy S27 Ultra');
    expect(items[0]).toMatchObject({query:'Galaxy S26 Ultra',role:'predecessor',status:'not-in-catalog'});
    expect(items[1].query).toBe('Galaxy S25 Ultra');
  });
  it('handles compound iPhone naming',()=>{
    expect(suggestDeviceComparisons(empty,'iPhone 18 Pro Max')[0].query).toBe('iPhone 17 Pro Max');
  });
  it('returns actual predecessor specs when a matching catalog variant exists',()=>{
    const corpus={...empty,devices:[{
      variant:{id:'s26u',identity:{manufacturer:'Samsung',family:'Galaxy S',modelName:'Galaxy S26 Ultra'},
        battery:{capacityMah:5000},soc:{vendor:'Qualcomm',name:'Snapdragon test'}},
      display:{diagonalInches:6.9,refreshRateHz:120},
      charging:{advertisedWiredWatts:60},
      catalogTrust:'source-backed-unverified',
    }]} as unknown as DeviceCorpus;
    const [predecessor]=suggestDeviceComparisons(corpus,'Galaxy S27 Ultra');
    expect(predecessor.status).toBe('found');
    expect(predecessor.released).toMatchObject({batteryMah:5000,displayInches:6.9,refreshRateHz:120,
      wiredWatts:60,catalogUnverified:true});
  });
  it('handles a multiword Pro XL tier and compact e suffix',()=>{
    expect(suggestDeviceComparisons(empty,'Pixel 11 Pro XL')[0].query).toBe('Pixel 10 Pro XL');
    expect(suggestDeviceComparisons(empty,'iPhone 18e')[0].query).toBe('iPhone 17e');
  });
  it('prefers a trusted predecessor over an unverified duplicate',()=>{
    const devices=[
      {variant:{id:'unverified',identity:{manufacturer:'Samsung',modelName:'Galaxy S26 Ultra'}},catalogTrust:'source-backed-unverified'},
      {variant:{id:'verified',identity:{manufacturer:'Samsung',modelName:'Galaxy S26 Ultra'}},catalogTrust:'verified-or-unspecified'},
    ];
    const corpus={...empty,devices} as unknown as DeviceCorpus;
    expect(suggestDeviceComparisons(corpus,'Galaxy S27 Ultra')[0].deviceId).toBe('verified');
  });
  it('does not claim an unreleased catalog predecessor is released',()=>{
    const corpus={...empty,devices:[{
      variant:{id:'future',identity:{manufacturer:'Samsung',modelName:'Galaxy S26 Ultra'}},
      releaseDate:'2099-01-01',
    }]} as unknown as DeviceCorpus;
    expect(suggestDeviceComparisons(corpus,'Galaxy S27 Ultra')[0].status).toBe('not-in-catalog');
  });
  it('does not claim generations for arbitrary names',()=>{
    expect(suggestDeviceComparisons(empty,'Future Device')).toEqual([]);
  });
});

describe('competitor suggestions',()=>{
  const record=(id:string,manufacturer:string,capacityMah?:number,diagonalInches?:number,releaseDate?:string,catalogTrust?:string)=>({
    variant:{id,identity:{manufacturer,modelName:id},battery:capacityMah?{capacityMah}:undefined},
    display:diagonalInches?{diagonalInches}:undefined,
    releaseDate,catalogTrust,
  });
  const corpus={devices:[
    record('Galaxy S26 Ultra','Samsung',5000,6.9,'2026-02-01'),
    record('iPhone 17 Pro Max','Apple',5088,6.9,'2025-09-01'),
    record('Pixel 10 Pro XL','Google',5200,6.8,'2025-08-01'),
    record('Unknown battery','Example',undefined,6.9,'2025-04-01'),
    record('Unreleased','Example',5100,6.9,'2099-01-01'),
    record('Unverified','Example',5100,6.9,'2025-04-01','source-backed-unverified'),
  ],measurements:[],sources:[]} as unknown as DeviceCorpus;
  it('selects other-brand released devices using known comparable dimensions',()=>{
    const names=suggestCompetingDevices(corpus,{manufacturer:'Samsung',batteryMah:5700,displayInches:6.9,limit:5}).map(v=>v.query);
    expect(names).toContain('Apple iPhone 17 Pro Max');
    expect(names).toContain('Google Pixel 10 Pro XL');
    expect(names).not.toContain('Samsung Galaxy S26 Ultra');
    expect(names).not.toContain('Example Unknown battery');
    expect(names).not.toContain('Example Unreleased');
    expect(names).not.toContain('Example Unverified');
  });
  it('does not rank arbitrary phones without a meaningful target',()=>{
    expect(suggestCompetingDevices(corpus,{manufacturer:'Samsung'})).toEqual([]);
  });
  it('can compare on just battery capacity when display size is not supplied',()=>{
    const matches=suggestCompetingDevices(corpus,{manufacturer:'Samsung',batteryMah:5100});
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(item=>item.released?.batteryMah!==undefined)).toBe(true);
  });
});

describe('competitor labels',()=>{
  const device=(id:string,modelName:string)=>({
    variant:{id,identity:{manufacturer:'Huawei',modelName},battery:{capacityMah:5500}},
    display:{diagonalInches:6.8},
  });
  it('does not repeat the manufacturer and collapses storage-only variants',()=>{
    const corpus={devices:[
      device('a','Huawei Nova 14 Ultra 1TB'),
      device('b','Huawei Nova 14 Ultra 256GB'),
      device('c','Mate 80'),
    ],measurements:[],sources:[]} as unknown as DeviceCorpus;
    const items=suggestCompetingDevices(corpus,{batteryMah:5500,displayInches:6.8,limit:5});
    expect(items.map(item=>item.label).sort()).toEqual(['Huawei Mate 80','Huawei Nova 14 Ultra 1TB']);
    expect(items.every(item=>!/Huawei Huawei/.test(item.label))).toBe(true);
  });
});

describe('short device names',()=>{
  it('keeps the model and drops catalog noise',async()=>{
    const {shortDeviceName}=await import('../src/lib/simulation/modules/device-comparison-suggestions');
    expect(shortDeviceName('Huawei nova 13i Global Dual SIM TD-LTE 128GB CTR-L91 (Huawei Cartier B)')).toBe('Huawei nova 13i Global CTR-L91');
    expect(shortDeviceName('Galaxy S26 Ultra')).toBe('Galaxy S26 Ultra');
  });
});
