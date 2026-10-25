import { describe, expect, it } from 'vitest';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'runtime-test',
      protocolVersion: 'v1',
    },
  ],
  devices: [
    {
      variant: {
        id: 'phone',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Phone',
        },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.7 },
    },
  ],
  measurements: [
    {
      id: 'web',
      deviceVariantId: 'phone',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'video',
      deviceVariantId: 'phone',
      workload: 'video_playback',
      metric: 'runtime',
      value: 20,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'gaming',
      deviceVariantId: 'phone',
      workload: 'gaming',
      metric: 'runtime',
      value: 5,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('mixed-use battery experience', () => {
  it('combines workload drain by entered hours per day', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: { primary: { diagonalInches: 6.7 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      dailyUseHours: {
        web_browsing: 2,
        video_playback: 2,
        gaming: 1,
      },
    });

    // web 500 mAh/h * 2 = 1000
    // video 250 mAh/h * 2 = 500
    // gaming 1000 mAh/h * 1 = 1000
    // total = 2500 mAh/day, so 2 active-use equivalent days.
    expect(result.mixedUse?.expectedDrainMahPerDay).toBeCloseTo(2500);
    expect(result.mixedUse?.interpretation).toBe(
      'active-use-only',
    );
    expect(
      result.mixedUse?.expectedActiveUseHoursPerCharge,
    ).toBeCloseTo(10);
    expect(result.mixedUse?.expectedDaysPerCharge).toBeCloseTo(2);
    expect(result.mixedUse?.activeHoursPerDay).toBeCloseTo(5);
    expect(
      result.warnings.some((warning) =>
        warning.includes('Standby'),
      ),
    ).toBe(true);
  });

  it('does not invent an efficiency advantage from a chip name alone', () => {
    const simulation = {
      formFactor: 'phone' as const,
      displays: { primary: { diagonalInches: 6.7, refreshRateHz: 120 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };
    const dailyUseHours = {
      web_browsing: 2,
      video_playback: 2,
      gaming: 1,
    };
    const base = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
    });
    const exynos = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
      socName: 'Exynos 2700',
    });
    const snapdragon = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
      socName: 'Snapdragon 8 Elite Extreme Gen 6',
    });
    expect(base.mixedUse?.expectedActiveUseHoursPerCharge).toBeDefined();
    expect(exynos.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(base.mixedUse!.expectedActiveUseHoursPerCharge, 10);
    expect(snapdragon.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(base.mixedUse!.expectedActiveUseHoursPerCharge, 10);
    expect(exynos.runtimes.map(row => row.expectedHours))
      .toEqual(base.runtimes.map(row => row.expectedHours));
  });

  it('makes battery scenarios respond to chosen power assumptions, not the chip name', () => {
    const simulation = {
      formFactor: 'phone' as const,
      displays: { primary: { diagonalInches: 6.7 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };
    const dailyUseHours = {
      web_browsing: 2, video_playback: 2, gaming: 1,
    };
    const options = { simulation, dailyUseHours, socName: 'Exynos 2700' };
    const neutral = simulateBatteryExperience(corpus, options);
    const efficiency = simulateBatteryExperience(corpus, {
      ...options, socPowerWhatIf: 'efficiency',
    });
    const performance = simulateBatteryExperience(corpus, {
      ...options, socPowerWhatIf: 'performance',
    });
    expect(neutral.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(10, 8);
    expect(efficiency.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeGreaterThan(neutral.mixedUse!.expectedActiveUseHoursPerCharge);
    expect(performance.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeLessThan(neutral.mixedUse!.expectedActiveUseHoursPerCharge);

    const hours = (result: typeof neutral, workload: string) =>
      result.runtimes.find(row => row.workload === workload)?.expectedHours ?? 0;
    expect(hours(efficiency, 'gaming')).toBeGreaterThan(hours(neutral, 'gaming'));
    expect(hours(performance, 'web_browsing')).toBeLessThan(hours(neutral, 'web_browsing'));
    const effect = (workload: string) =>
      hours(efficiency, workload) / hours(neutral, workload) - 1;
    // Gaming has a greater assumed processor-power share than video.
    expect(effect('gaming')).toBeGreaterThan(effect('video_playback'));
    const otherChip = simulateBatteryExperience(corpus, {
      ...options, socName: 'Snapdragon 8 Elite Extreme Gen 6',
      socPowerWhatIf: 'efficiency',
    });
    expect(otherChip.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(efficiency.mixedUse!.expectedActiveUseHoursPerCharge, 8);
  });

  it('treats brightness as an opt-in display sensitivity, not a hidden device default', () => {
    const input = {
      simulation: {
        formFactor: 'phone' as const,
        displays: { primary: { diagonalInches: 6.7, refreshRateHz: 120 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      dailyUseHours: { web_browsing: 2, video_playback: 2, gaming: 1 },
      usageIntensity: 'Typical' as const,
    };
    const baseline = simulateBatteryExperience(corpus, input);
    const indoor = simulateBatteryExperience(corpus, { ...input, brightnessNits: 200 });
    const office = simulateBatteryExperience(corpus, { ...input, brightnessNits: 400 });
    const sunlight = simulateBatteryExperience(corpus, { ...input, brightnessNits: 1200 });
    expect(baseline.mixedUse?.expectedActiveUseHoursPerCharge).toBeDefined();
    expect(indoor.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeGreaterThan(office.mixedUse!.expectedActiveUseHoursPerCharge);
    expect(office.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeGreaterThan(sunlight.mixedUse!.expectedActiveUseHoursPerCharge);
    // No change to the number used as the neutral, reference-based baseline.
    expect(simulateBatteryExperience(corpus, input).mixedUse?.expectedActiveUseHoursPerCharge)
      .toBe(baseline.mixedUse?.expectedActiveUseHoursPerCharge);
  });

  it('does not fabricate mixed-use runtime when no supported workload hours are entered', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: { primary: { diagonalInches: 6.7 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      dailyUseHours: {},
    });

    expect(result.mixedUse).toBeUndefined();
  });
});

describe('battery scenario consistency',()=>{
 const simulation={formFactor:'phone' as const,displays:{primary:{diagonalInches:6.7,refreshRateHz:120}},battery:{cells:[{capacityMah:5000}]}};
 const dailyUseHours={web_browsing:2,video_playback:2,gaming:1};
 it('applies brightness to each workload and its mixed-use contribution exactly once',()=>{
  const dim=simulateBatteryExperience(corpus,{simulation,dailyUseHours,brightnessNits:200});
  const bright=simulateBatteryExperience(corpus,{simulation,dailyUseHours,brightnessNits:1200});
  for(const runtime of dim.runtimes){
   expect(runtime.expectedHours).toBeGreaterThan(bright.runtimes.find(row=>row.workload===runtime.workload)!.expectedHours!);
   const contribution=dim.mixedUse!.workloads.find(row=>row.workload===runtime.workload)!;
   expect(contribution.expectedDrainMahPerHour).toBeCloseTo(runtime.expectedDrainMahPerHour!,8);
  }
  const expectedDrain=dim.runtimes.reduce((sum,row)=>sum+dailyUseHours[row.workload]*row.expectedDrainMahPerHour!,0);
  expect(dim.mixedUse!.expectedDrainMahPerDay).toBeCloseTo(expectedDrain,8);
 });
 it('keeps the neutral reference unchanged when only neutral or invalid brightness is supplied',()=>{
  const baseline=simulateBatteryExperience(corpus,{simulation,dailyUseHours});
  for(const brightnessNits of [400,0,-1,NaN,Infinity]){
   const result=simulateBatteryExperience(corpus,{simulation,dailyUseHours,brightnessNits});
   expect(result.mixedUse?.expectedActiveUseHoursPerCharge).toBeCloseTo(baseline.mixedUse!.expectedActiveUseHoursPerCharge,8);
  }
 });
 it('uses the same single-workload intensity and cooling assumptions in the headline',()=>{
  const result=simulateBatteryExperience(corpus,{simulation,dailyUseHours:{gaming:1},usageIntensity:'Heavy',coolingClass:'active-fan',targetSocPowerW:9,brightnessNits:800});
  expect(result.mixedUse!.expectedActiveUseHoursPerCharge).toBeCloseTo(result.runtimes.find(row=>row.workload==='gaming')!.expectedHours!,8);
 });
 it('withholds mixed use for invalid or impossible daily hours instead of returning partial or nonfinite results',()=>{
  for(const hours of [NaN,Infinity,-1,25]){
   const result=simulateBatteryExperience(corpus,{simulation,dailyUseHours:{web_browsing:2,gaming:hours}});
   expect(result.mixedUse).toBeUndefined();
  }
 });
});

it('uses one brightness adjustment in Wh budgets and preserves the raw reference',()=>{
 const energyCorpus={...corpus,devices:corpus.devices.map(row=>({...row,variant:{...row.variant,battery:{capacityMah:5000,typicalEnergyWh:20}}}))};
 const input={simulation:{formFactor:'phone' as const,displays:{primary:{diagonalInches:6.5}},battery:{cells:[{capacityMah:5000,nominalVoltageV:4}]}},dailyUseHours:{web_browsing:1},brightnessNits:1200};
 const result=simulateBatteryExperience(energyCorpus,input);const web=result.runtimes.find(row=>row.workload==='web_browsing')!;
 expect(web.energyBasis).toBe('wh');expect(web.referenceExpectedHours).toBeCloseTo(10,8);
 expect(result.mixedUse!.expectedDrainWhPerDay).toBeCloseTo(web.expectedDrainWhPerHour!,8);
 expect(result.mixedUse!.expectedActiveUseHoursPerCharge).toBeCloseTo(web.expectedHours!,8);
});
it('rejects invalid pack capacities instead of synthesizing a usable combined capacity',()=>{
 for(const cells of [[{capacityMah:-1000},{capacityMah:6000}],[{capacityMah:0}],[{capacityMah:Infinity}]]){
  const result=simulateBatteryExperience(corpus,{simulation:{formFactor:'phone',displays:{primary:{}},battery:{cells}}});
  expect(result.status).toBe('unresolved');expect(result.mixedUse).toBeUndefined();
 }
});

it('does not silently drop an unsupported workload from the requested usage mix',()=>{
 const missingGaming={...corpus,measurements:corpus.measurements.filter(row=>row.workload!=='gaming')};
 const result=simulateBatteryExperience(missingGaming,{simulation:{formFactor:'phone',displays:{primary:{}},battery:{cells:[{capacityMah:5000}]}},dailyUseHours:{web_browsing:2,gaming:1}});
 expect(result.runtimes.find(row=>row.workload==='web_browsing')!.status).toBe('resolved');
 expect(result.mixedUse).toBeUndefined();expect(result.calendarEndurance).toBeUndefined();
});
