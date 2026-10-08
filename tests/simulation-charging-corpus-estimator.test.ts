import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'near',
        identity: { manufacturer: 'Samsung', family: 'S', modelName: 'Near' },
        battery: { capacityMah: 5600, chemistry: 'silicon-carbon' },
        soc: { vendor: 'Qualcomm', name: 'Flagship' },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 120 },
      dimensions: { widthMm: 77, heightMm: 163, thicknessMm: 8.3, weightG: 218 },
      charging: { advertisedWiredWatts: 60 },
      cooling: { class: 'large-vapor-chamber' },
    },
    {
      variant: {
        id: 'far',
        identity: { manufacturer: 'Other', family: 'X', modelName: 'Far' },
        battery: { capacityMah: 6000, chemistry: 'silicon-carbon' },
        soc: { vendor: 'MediaTek', name: 'Other' },
      },
      display: { diagonalInches: 6.7, refreshRateHz: 120 },
      dimensions: { widthMm: 75, heightMm: 161, thicknessMm: 7.4, weightG: 195 },
      charging: { advertisedWiredWatts: 60 },
      cooling: { class: 'vapor-chamber' },
    },
  ],
  measurements: [
    { id:'near30', deviceVariantId:'near', workload:'charging', metric:'wiredThirtyMinutePercent', value:72, unit:'percent', sourceId:'lab', evidenceKind:'measured' },
    { id:'near100', deviceVariantId:'near', workload:'charging', metric:'wiredFullChargeMinutes', value:46, unit:'minutes', sourceId:'lab', evidenceKind:'measured' },
    { id:'far30', deviceVariantId:'far', workload:'charging', metric:'wiredThirtyMinutePercent', value:82, unit:'percent', sourceId:'lab', evidenceKind:'measured' },
    { id:'far100', deviceVariantId:'far', workload:'charging', metric:'wiredFullChargeMinutes', value:39, unit:'minutes', sourceId:'lab', evidenceKind:'measured' },
  ],
};

describe('charging corpus estimator', () => {
  it('produces weighted curve estimates from comparable phones', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5700,
      batteryChemistry: 'silicon-carbon',
      wiredChargingWatts: 60,
      manufacturer: 'Samsung',
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
      refreshRateHz: 120,
      thicknessMm: 8.4,
      weightG: 220,
      coolingClass: 'large-vapor-chamber',
      limit: 2,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.referenceCount).toBe(2);
    expect(result.estimate?.timeTo100Minutes?.expected).toBeGreaterThan(39);
    expect(result.estimate?.timeTo100Minutes?.expected).toBeLessThan(46);
    expect(result.estimate?.charge30mPercent?.expected).toBeGreaterThan(72);
    expect(result.estimate?.charge30mPercent?.expected).toBeLessThan(82);
    expect(result.estimate?.timeTo50Minutes?.expected).toBeDefined();
    expect(result.estimate?.timeTo80Minutes?.expected).toBeDefined();
  });
});
