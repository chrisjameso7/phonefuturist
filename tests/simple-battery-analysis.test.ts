import {it,expect} from 'vitest';
import {analyzeSimpleBattery,analyzeSimpleBatteryWithFallback,simpleBatteryParameters} from '../src/lib/valuation/simple-battery';
const parameters={input:{batteryMah:5500,batteryVoltageV:3.85,displayDiagonalInches:6.8,refreshRateHz:120,customResolutionWidthPx:1440,customResolutionHeightPx:3200,socName:'Snapdragon 8 Gen 3'},usage:'Typical',software:'standard'};
it('validates compact hardware input before analysis',()=>{expect(()=>simpleBatteryParameters({...parameters,input:{...parameters.input,batteryMah:Infinity}})).toThrow();expect(()=>simpleBatteryParameters({...parameters,software:'magic'})).toThrow();expect(()=>simpleBatteryParameters({...parameters,powerScenario:'magic'})).toThrow();});
it('returns positive simulated endurance and keeps unsupported processors on reference coverage',()=>{const result=analyzeSimpleBattery({...parameters,input:{...parameters.input,socName:'Unknown future processor'}});expect(result.status).toBe('scenario');expect(result.runtimeHours).toBeGreaterThan(0);expect(result.processorApplied).toBe(false);});
it('software scenarios adjust consumption without changing battery size',()=>{const standard=analyzeSimpleBattery(parameters), optimized=analyzeSimpleBattery({...parameters,software:'optimized'}), heavy=analyzeSimpleBattery({...parameters,software:'background-heavy'});expect(optimized.runtimeHours).toBeCloseTo(standard.runtimeHours!/.95);expect(heavy.runtimeHours).toBeCloseTo(standard.runtimeHours!/1.05);});
it('respects display and power controls',()=>{const base=analyzeSimpleBattery(parameters);expect(analyzeSimpleBattery({...parameters,input:{...parameters.input,brightnessNits:1200}}).runtimeHours).toBeLessThan(base.runtimeHours!);expect(analyzeSimpleBattery({...parameters,powerScenario:'efficiency'}).runtimeHours).toBeGreaterThan(base.runtimeHours!);});
it('AI fallback is bounded and recovers from provider failure',async()=>{const missing={...parameters,input:{...parameters.input,socName:'Unknown processor'}};const baseline=analyzeSimpleBattery(missing);expect(await analyzeSimpleBatteryWithFallback(missing,async()=>'{broken')).toEqual(baseline);expect(await analyzeSimpleBatteryWithFallback(missing,async()=>JSON.stringify({supported:true,webW:-1,videoW:2,gamingW:4}))).toEqual(baseline);const ai=await analyzeSimpleBatteryWithFallback(missing,async()=>JSON.stringify({supported:true,webW:2,videoW:2,gamingW:4}));expect(ai.method).toBe('ai');expect(ai.designation).toBe('Simulated');expect(ai.runtimeHours).toBeGreaterThan(0);expect(await analyzeSimpleBatteryWithFallback(missing)).toEqual(baseline);});

it('requests CPU fallbacks explicitly and preserves the reference battery when AI cannot support it',async()=>{
 const request={...parameters,missingCpu:['geekbench6_single','geekbench6_multi']};
 const baseline=analyzeSimpleBattery(request);
 const result=await analyzeSimpleBatteryWithFallback(request,async()=>JSON.stringify({supported:false,singleCore:2400,multiCore:7100}));
 expect(result.runtimeHours).toBe(baseline.runtimeHours);expect(result.singleCore).toBe(2400);expect(result.multiCore).toBe(7100);
 const unsolicited=await analyzeSimpleBatteryWithFallback(parameters,async()=>JSON.stringify({supported:false,singleCore:2400}));
 expect(unsolicited.singleCore).toBeUndefined();
 expect(await analyzeSimpleBatteryWithFallback(request,async()=>JSON.stringify({supported:false,singleCore:2400,multiCore:200}))).toEqual(baseline);
});
it('uses deterministic software settings on AI power fallbacks',async()=>{
 const generate=async()=>JSON.stringify({supported:true,webW:2,videoW:2,gamingW:4});
 const standard=await analyzeSimpleBatteryWithFallback(parameters,generate);
 const optimized=await analyzeSimpleBatteryWithFallback({...parameters,software:'optimized'},generate);
 expect(optimized.runtimeHours).toBeCloseTo(standard.runtimeHours!/.95);
});
