import { describe, expect, it } from 'vitest';
import { getSocEfficiencyCurve } from '../src/lib/simulation/modules/soc-efficiency-registry';
import { estimateSocWorkloadPower } from '../src/lib/simulation/modules/soc-workload-power';
const chip='Snapdragon 8 Elite Gen 5';
const protocol='geekbench6' as const;
const curve=getSocEfficiencyCurve(chip, protocol)!;
const targetBenchmarkScore=(curve.points[0].benchmarkScore+curve.points[1].benchmarkScore)/2;
const base={
  socName:chip,protocol,targetBenchmarkScore,activeDutyFraction:0.2,
  inactiveBoardPowerW:0.5,displayPowerW:1.2,otherPeripheralPowerW:0.3,
  batteryEnergyWh:20,usableFraction:0.95,
};
describe('SoC workload scenario composition',()=>{
  it('keeps measured board power distinct from display and peripherals',()=>{
    const r=estimateSocWorkloadPower(base);
    expect(r.status).toBe('scenario');
    if(r.status!=='scenario') return;
    expect(r.totalPowerW).toBeCloseTo(r.averageBoardPowerW+1.2+0.3);
    expect(r.runtimeHours).toBeCloseTo(19/r.totalPowerW);
  });
  it('changes runtime for changed explicit workloads without chip-brand coefficient',()=>{
    const light=estimateSocWorkloadPower({...base,activeDutyFraction:0.1});
    const heavy=estimateSocWorkloadPower({...base,activeDutyFraction:0.8});
    expect(light.status).toBe('scenario');
    expect(heavy.status).toBe('scenario');
    if(light.status==='scenario'&&heavy.status==='scenario')
      expect(heavy.runtimeHours).toBeLessThan(light.runtimeHours);
  });
  it('does not inherit previous Exynos generation for unreleased models',()=>{
    expect(estimateSocWorkloadPower({...base,socName:'Exynos 2700'}).status).toBe('unresolved');
  });
  it('accepts the exact lowest and highest measured operating points',()=>{
    const lowest=[...curve.points].sort((a,b)=>a.benchmarkScore-b.benchmarkScore)[0];
    const highest=[...curve.points].sort((a,b)=>a.benchmarkScore-b.benchmarkScore).at(-1)!;
    for (const point of [lowest,highest]) {
      const result=estimateSocWorkloadPower({...base,targetBenchmarkScore:point.benchmarkScore});
      expect(result.status).toBe('scenario');
      if (result.status === 'scenario')
        expect(result.benchmarkBoardPowerW).toBeGreaterThan(0);
    }
  });
  it('rejects missing assumptions and score extrapolation',()=>{
    expect(estimateSocWorkloadPower({...base,displayPowerW:-1}).status).toBe('unresolved');
    expect(estimateSocWorkloadPower({...base,activeDutyFraction:2}).status).toBe('unresolved');
    expect(estimateSocWorkloadPower({...base,targetBenchmarkScore:99999999}).status).toBe('unresolved');
  });
});
