import { describe, expect, it } from 'vitest';
import { suggestDeviceComparisons } from '../src/lib/simulation/modules/device-comparison-suggestions';
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
  it('does not claim generations for arbitrary names',()=>{
    expect(suggestDeviceComparisons(empty,'Future Device')).toEqual([]);
  });
});
