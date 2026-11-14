import type { GenerateJson } from './engine';
import { expandSimpleMode, type SimpleModeInput } from '../simulation/simple-mode';
import { SIMPLE_USAGE_SCENARIOS, type SimpleUsagePreset } from '../simulation/simple-usage-scenarios';
import { projectedDisplayPowerFactor, projectedBrightnessPowerFactor } from '../simulation/modules/display-power-scenario';
import { usagePresetDrainFactor } from '../simulation/modules/usage-preset-drain';
import { socWhatIfDrainFactor, type SocPowerWhatIf } from '../simulation/modules/soc-power-what-if';
import { simulateBatteryExperience, projectedGamingThermalPowerFactor } from '../simulation/modules/battery-experience-engine';
import { buildCalibrationRegistry } from '../simulation/modules/calibration-registry';
import { getSocEfficiencyCurve } from '../simulation/modules/soc-efficiency-registry';
import { estimateMatchedSocBatteryScenario } from '../simulation/modules/soc-runtime-delta';
import { resolveSystemEfficiency } from '../simulation/modules/system-efficiency';
import { number, object } from './validation';

export type SoftwareTuning = 'standard' | 'optimized' | 'background-heavy';
export interface SimpleBatteryRequest { input: SimpleModeInput; usage: SimpleUsagePreset; software: SoftwareTuning; powerScenario: SocPowerWhatIf; missingCpu: Array<'geekbench6_single' | 'geekbench6_multi'> }
export interface SimpleBatteryResult { status: 'scenario' | 'unresolved'; designation: 'Simulated'; runtimeHours?: number; summary: string; processorApplied: boolean; method?: 'reference' | 'ai'; singleCore?: number; multiCore?: number }
export function simpleBatteryParameters(raw: unknown): SimpleBatteryRequest {
  const p = object(raw), input = object(p.input);
  if (!['Light', 'Typical', 'Heavy'].includes(String(p.usage)) || !['standard', 'optimized', 'background-heavy'].includes(String(p.software))) throw new Error('Choose a usage and software setting.');
  const text = (value: unknown) => { if (value === undefined) return undefined; if (typeof value !== 'string' || value.length > 100) throw new Error('Invalid name.'); return value; };
  // Battery analysis does not accept arbitrary nested simulation objects from the client.
  if (p.powerScenario !== undefined && !['neutral','efficiency','performance'].includes(String(p.powerScenario))) throw new Error('Invalid power scenario.');
  if (!['basic','good','large-vc','active'].includes(String(input.cooling ?? 'good'))) throw new Error('Invalid cooling.');
  if (input.renderingScalePercent !== undefined && ![50,75,100].includes(Number(input.renderingScalePercent))) throw new Error('Invalid rendering scale.');
  if (p.missingCpu !== undefined && (!Array.isArray(p.missingCpu) || p.missingCpu.length > 2 || p.missingCpu.some(value => !['geekbench6_single','geekbench6_multi'].includes(String(value))))) throw new Error('Invalid benchmark request.');
  const parsed: SimpleModeInput = {
    batteryMah: number(input.batteryMah, 500, 30000), displayDiagonalInches: number(input.displayDiagonalInches, 2, 12),
    refreshRateHz: number(input.refreshRateHz, 1, 360), displayResolution: 'custom',
    customResolutionWidthPx: number(input.customResolutionWidthPx, 240, 8000), customResolutionHeightPx: number(input.customResolutionHeightPx, 240, 8000),
    batteryVoltageV: number(input.batteryVoltageV ?? 3.85, 3, 5),
    ...(input.aspectRatioWidth === undefined ? {} : {aspectRatioWidth:number(input.aspectRatioWidth,.1,100)}),
    ...(input.aspectRatioHeight === undefined ? {} : {aspectRatioHeight:number(input.aspectRatioHeight,.1,100)}),
    ...(input.renderingScalePercent === undefined ? {} : {renderingScalePercent:number(input.renderingScalePercent,50,100) as 50 | 75 | 100}),
    cooling: (input.cooling ?? 'good') as SimpleModeInput['cooling'], socName: text(input.socName), manufacturer: text(input.manufacturer),
    ...(input.brightnessNits === undefined ? {} : { brightnessNits: number(input.brightnessNits, 1, 5000) }),
  };
  return { input: parsed, usage: p.usage as SimpleUsagePreset, software: p.software as SoftwareTuning, powerScenario:(p.powerScenario ?? 'neutral') as SocPowerWhatIf, missingCpu:(p.missingCpu ?? []) as SimpleBatteryRequest['missingCpu'] };
}

/** Simple-only orchestration. Existing Advanced calculations and calibration remain untouched. */
export function analyzeSimpleBattery(raw: unknown): SimpleBatteryResult {
  const {input, usage, software, powerScenario} = simpleBatteryParameters(raw);
  const expansion = expandSimpleMode(input);
  const simulation = expansion.simulationInput, corpus = buildCalibrationRegistry();
  // Nominal cell voltage is an explicit scenario input, not a measurement.
  for (const cell of simulation.battery?.cells ?? []) cell.nominalVoltageV = input.batteryVoltageV;
  const baseline = simulateBatteryExperience(corpus, {simulation, manufacturer: input.manufacturer, brightnessNits: input.brightnessNits});
  const profile = SIMPLE_USAGE_SCENARIOS[usage];
  const hours = {web_browsing: Number(profile.webHours), video_playback: Number(profile.videoHours), gaming: Number(profile.gamingHours)};
  let dailyFraction = 0, processorApplied = false;
  for (const row of baseline.runtimes) {
    if (!row.expectedHours || row.expectedHours <= 0) return {status:'unresolved', designation:'Simulated', processorApplied:false, summary:'Battery coverage is unavailable for this configuration.'};
    let runtime = row.expectedHours;
    // Transfer a matched power DIFFERENCE only. Video decoding has no CPU/GPU proxy.
    if (input.socName && row.workload !== 'video_playback') {
      const protocol = row.workload === 'gaming' ? 'steelNomadLight' : 'geekbench6';
      const target = getSocEfficiencyCurve(input.socName, protocol);
      if (target) for (const referenceSocName of ['Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 2', 'Dimensity 9300+', 'A17 Pro']) {
        const reference = getSocEfficiencyCurve(referenceSocName, protocol);
        if (!reference || reference.soc === target.soc) continue;
        const scores = (curve: typeof target) => curve.points.map(point => point.benchmarkScore);
        const low = Math.max(Math.min(...scores(target)), Math.min(...scores(reference)));
        const high = Math.min(Math.max(...scores(target)), Math.max(...scores(reference)));
        if (high <= low) continue;
        // Editorial benchmark duty scenarios, not measured application duty cycles.
        const activeDutyFraction = row.workload === 'gaming' ? {Light:.15,Typical:.25,Heavy:.4}[usage] : {Light:.03,Typical:.05,Heavy:.08}[usage];
        const scenario = estimateMatchedSocBatteryScenario(corpus, simulation, input.socName, {referenceSocName, protocol, workload:row.workload, targetBenchmarkScore:(low+high)/2, activeDutyFraction});
        if (scenario.status !== 'scenario') continue;
        // Keep the exact reference cohort that owns the transferred power delta.
        runtime = scenario.scenarioRuntimeHours;
        processorApplied = true;
        break;
      }
    }
    const workloadFactor = usagePresetDrainFactor(usage,row.workload) * socWhatIfDrainFactor(powerScenario,row.workload) * projectedDisplayPowerFactor(simulation.displays.primary,row.workload) * projectedBrightnessPowerFactor(input.brightnessNits) * (row.workload === 'gaming' ? projectedGamingThermalPowerFactor(expansion.advanced.coolingClass) : 1);
    dailyFraction += hours[row.workload] * workloadFactor / runtime;
  }
  // Explicit user scenario; never inferred from an OS or manufacturer label.
  const multiplier = {standard:1, optimized:.95, 'background-heavy':1.05}[software];
  const softwareFactor = resolveSystemEfficiency({coefficients:{mixed_use:{consumptionMultiplier:multiplier,evidenceKind:'user'}}}, 'mixed_use').consumptionMultiplier;
  const activeHours = Object.values(hours).reduce((sum, value) => sum + value, 0);
  const runtimeHours = activeHours / (dailyFraction * softwareFactor);
  if (!Number.isFinite(runtimeHours) || runtimeHours <= 0) return {status:'unresolved', designation:'Simulated', processorApplied:false, summary:'Battery coverage is unavailable for this configuration.'};
  return {status:'scenario', designation:'Simulated', runtimeHours, processorApplied, method:'reference', summary:processorApplied ? 'Simulated mixed active use with processor and software scenario settings.' : 'Simulated mixed active use with software settings. Processor-specific coverage is unavailable; reference battery performance is used.'};
}

/** AI is a bounded fallback for missing evidence, never a replacement for measured results. */
export async function analyzeSimpleBatteryWithFallback(raw: unknown, generate?: GenerateJson): Promise<SimpleBatteryResult> {
  const p = simpleBatteryParameters(raw);
  const reference = analyzeSimpleBattery(raw);
  if (!generate || (reference.status === 'scenario' && reference.processorApplied && p.missingCpu.length === 0)) return reference;
  try {
    const result = object(JSON.parse(await generate({
      system: 'Return only JSON matching the schema. Model a hypothetical smartphone battery workload using the supplied battery energy, exact processor generation, display and explicit software scenario. Do not claim measurements or tests, invent sources, use vendor stereotypes, or count standby as active use. If the processor is unknown/unreleased or its efficiency cannot be supported, return supported:false. Return positive average whole-device power watts for browsing, video playback and gaming. These include screen, processor, memory and radios; never add board power twice. When missingCpu requests a Geekbench 6 score, optionally supply singleCore and multiCore as simulated peak scores for that exact processor. Omit scores you cannot support; do not confuse Geekbench versions. No public technical reasoning.',
      prompt: JSON.stringify({...p,software:'standard',powerScenario:'neutral',usage:'Typical'}),
      schema:{type:'object',additionalProperties:false,required:['supported','webW','videoW','gamingW'],properties:{singleCore:{type:'number',minimum:100,maximum:20000},multiCore:{type:'number',minimum:100,maximum:100000},supported:{type:'boolean'},webW:{type:'number',minimum:.3,maximum:20},videoW:{type:'number',minimum:.3,maximum:20},gamingW:{type:'number',minimum:.3,maximum:25}}},
    })));
    const cpu: Pick<SimpleBatteryResult,'singleCore' | 'multiCore'> = {};
    if (p.missingCpu.includes('geekbench6_single') && result.singleCore !== undefined) cpu.singleCore = number(result.singleCore,100,20000);
    if (p.missingCpu.includes('geekbench6_multi') && result.multiCore !== undefined) cpu.multiCore = number(result.multiCore,100,100000);
    if (cpu.singleCore && cpu.multiCore && (cpu.multiCore < cpu.singleCore || cpu.multiCore > cpu.singleCore*30)) throw new Error('Invalid CPU relationship.');
    if (result.supported !== true) return {...reference,...cpu};
    const powers = [number(result.webW,.3,20), number(result.videoW,.3,20), number(result.gamingW,.3,25)];
    const profile = SIMPLE_USAGE_SCENARIOS[p.usage];
    const hours = [Number(profile.webHours),Number(profile.videoHours),Number(profile.gamingHours)];
    const energyWh = p.input.batteryMah * (p.input.batteryVoltageV ?? 3.85) / 1000;
    const workloads = ['web_browsing','video_playback','gaming'] as const;
    const softwareFactor = {standard:1,optimized:.95,'background-heavy':1.05}[p.software];
    const consumed = hours.reduce((sum,hour,index) => sum + hour*powers[index]*usagePresetDrainFactor(p.usage,workloads[index])*socWhatIfDrainFactor(p.powerScenario,workloads[index])*softwareFactor,0);
    const runtimeHours = energyWh * hours.reduce((sum,hour)=>sum+hour,0) / consumed;
    if (!Number.isFinite(runtimeHours) || runtimeHours < .5 || runtimeHours > 100) return reference;
    return {...cpu,status:'scenario',designation:'Simulated',runtimeHours,processorApplied:false,method:'ai',summary:'AI-simulated active-use endurance. Real-world results may vary.'};
  } catch { return reference; }
}
