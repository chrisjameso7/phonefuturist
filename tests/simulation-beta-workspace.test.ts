import {describe,it,expect} from 'vitest';
import {buildProfile,captureNumericValue,captureValue,INVALID_NUMBER,numeric,numericIssues,runWorkspace,hasNonFinite,type WorkloadFields} from '../src/lib/simulation/beta-workspace';
import {SIMULATION_ENGINE_VERSION} from '../src/lib/simulation/engine';
import {BATTERY_EXPERIENCE_VERSION} from '../src/lib/simulation/modules/battery-experience';
import type {SimulationInput} from '../src/lib/simulation/types';

const fields=(patch:Partial<WorkloadFields>={}):WorkloadFields=>({mixed_use:'',web_browsing:'',video_playback:'',gaming:'',camera_use:'',standby:'',...patch});
const device=(capacity=5000,voltage=4):SimulationInput=>({formFactor:'phone',dimensions:{widthMm:75,heightMm:160,thicknessMm:8},displays:{primary:{diagonalInches:6.7,resolutionWidthPx:1440,resolutionHeightPx:3200}},battery:{cells:[{capacityMah:capacity,nominalVoltageV:voltage}]}});
const powers=fields({web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'});
const shares=fields({web_browsing:'30',video_playback:'20',gaming:'10',camera_use:'5',standby:'35'});
const single=()=>buildProfile(fields({gaming:'5'}),fields(),'equal');

describe('Interactive Leaks beta input boundary',()=>{
 it('captures workload edits before deferred state updates consume them',()=>{
  let state=fields();const pending:Array<()=>void>=[];
  const handler=captureNumericValue(value=>pending.push(()=>{state={...state,gaming:value};}));
  const event={currentTarget:{value:'7.5',validity:{badInput:false}}};handler(event);
  Object.defineProperty(event,'currentTarget',{get(){throw Error('Event expired');}});
  pending[0]();expect(state.gaming).toBe('7.5');
  handler({currentTarget:{value:'',validity:{badInput:false}}});pending[1]();expect(state.gaming).toBe('');
 });
 it('captures selectors before their event expires',()=>{
  let captured='';const queue:Array<()=>void>=[];const event={currentTarget:{value:'percent'}};
  captureValue(value=>queue.push(()=>{captured=value;}))(event);event.currentTarget.value='manual';queue[0]();expect(captured).toBe('percent');
 });
 it('distinguishes incomplete native numeric input from an intentionally empty field',()=>{
  let raw='';captureNumericValue(value=>{raw=value;})({currentTarget:{value:'',validity:{badInput:true}}});
  expect(raw).toBe(INVALID_NUMBER);expect(numericIssues({batteryVoltageV:raw})).toHaveLength(1);
  expect(runWorkspace(device(),raw,single()).battery).toBeUndefined();
 });
 it('validates a 100% profile and computes its weighted whole-device power',()=>{
  const profile=buildProfile(powers,shares,'percent');expect(profile.issues).toEqual([]);expect(profile.totalPercent).toBe(100);
  const run=runWorkspace(device(),'100',profile);
  expect(run.battery?.result.comparisonReady?.averagePowerW?.min).toBeCloseTo(2.32,10);
  expect(run.battery?.result.estimate?.runtimeHours?.min).toBeCloseTo(20/2.32,10);
  expect(run.battery?.result.estimate?.contributors.every(c=>c.component==='whole_device')).toBe(true);
 });
 it.each(['20','40'])('rejects totals under/over 100 rather than normalizing: standby=%s',standby=>{
  const p=buildProfile(powers,{...shares,standby},'percent');expect(p.issues.join(' ')).toContain('reach 100%');expect(runWorkspace(device(),'100',p).battery).toBeUndefined();
 });
 it.each(['-1','101','NaN','1e999'])('rejects invalid share %s',gaming=>{
  const p=buildProfile(powers,{...shares,gaming},'percent');expect(p.issues.length).toBeGreaterThan(0);expect(runWorkspace(device(),'100',p).battery).toBeUndefined();
 });
 it('requires power for every positive share instead of discarding incomplete workloads',()=>{
  const p=buildProfile({...powers,gaming:''},shares,'percent');expect(p.issues.join(' ')).toContain('Gaming: supply average device power');expect(runWorkspace(device(),'100',p).battery).toBeUndefined();
 });
 it('allows explicit zero share without requiring power and handles decimal percentages',()=>{
  const p=buildProfile(fields({web_browsing:'2',gaming:'8'}),fields({web_browsing:'33.33',gaming:'66.67',standby:'0'}),'percent');
  expect(p.issues).toEqual([]);expect(p.terms).toHaveLength(2);expect(runWorkspace(device(),'100',p).battery?.result.status).toBe('resolved');
 });
 it('does not treat a missing share on supplied power as an implicit equal weight',()=>{
  const p=buildProfile(powers,{...shares,gaming:''},'percent');expect(p.issues.join(' ')).toContain('add its share');
 });
 it('makes equal weighting explicit and excludes the manual mixed-use value',()=>{
  const p=buildProfile(fields({web_browsing:'2',gaming:'8',mixed_use:'100'}),fields(),'equal');
  expect(p.terms.map(t=>t.share)).toEqual([0.5,0.5]);expect(runWorkspace(device(),'100',p).battery?.result.estimate?.runtimeHours).toEqual({min:4,max:4});
 });
 it('keeps manual mixed use separate from individual powers',()=>{
  const p=buildProfile({...powers,mixed_use:'4'},shares,'manual');expect(p.terms).toHaveLength(1);expect(runWorkspace(device(),'100',p).battery?.result.estimate?.runtimeHours).toEqual({min:5,max:5});
 });
 it.each(['0','-5','NaN','Infinity'])('rejects invalid workload power %s',gaming=>{
  const p=buildProfile(fields({gaming,web_browsing:'2'}),fields(),'equal');expect(p.issues.length).toBeGreaterThan(0);expect(runWorkspace(device(),'100',p).battery).toBeUndefined();
 });
 it('preserves the full-rated-pack default when usable energy percentage is empty',()=>{
  const run=runWorkspace(device(),'',single());expect(run.battery?.result.estimate?.usableEnergyWh).toEqual({min:20,max:20});expect(run.battery?.result.estimate?.assumptions.some(a=>a.code==='NO_USABLE_PERCENT_SUPPLIED')).toBe(true);
  expect(runWorkspace(device(),'90',single()).battery?.result.estimate?.runtimeHours).toEqual({min:3.6,max:3.6});
 });
 it.each(['0','-1','101','nonsense'])('fails closed for invalid usable energy %s',usable=>{
  expect(runWorkspace(device(),usable,single()).battery).toBeUndefined();
 });
 it('uses newly edited capacity and voltage without a previous-result dependency',()=>{
  expect(runWorkspace(device(),'100',single()).battery?.result.estimate?.runtimeHours?.min).toBe(4);
  expect(runWorkspace(device(2500,3.8),'100',single()).battery?.result.estimate?.runtimeHours?.min).toBe(1.9);
 });
 it('retains useful partial geometry but does not invent battery energy or power',()=>{
  const run=runWorkspace({formFactor:'phone',displays:{primary:{diagonalInches:6.7}}},'',single());
  expect(run.device).toBeDefined();expect(run.battery?.result.status).toBe('unresolved');expect(run.issues.join(' ')).toContain('Battery energy is missing');
  expect(runWorkspace(device(),'',buildProfile(fields(),fields(),'equal')).issues.join(' ')).toContain('at least one workload');
 });
 it('rejects malformed device/camera values while allowing unknown or zero bezel values',()=>{
  const issues=numericIssues({widthMm:'-1',batteryVoltageV:'oops',resolutionWidthPx:'3.2',bezelTopMm:'0',heightMm:''});
  expect(issues).toHaveLength(3);expect(numericIssues({apertureFNumber:'-2'},'Camera 1 — ')[0]).toContain('Camera 1');
  expect(runWorkspace(device(),'',single(),issues).device).toBeUndefined();expect(numeric('')).toBeUndefined();
 });
 it('handles camera additions/removals and partial modules deterministically',()=>{
  const input=device();input.cameras=[{type:'wide',sensorFormatDenominator:1.3,resolutionMp:50},{type:'periscope'}];
  expect(runWorkspace(input,'',single()).device?.cameras).toHaveLength(2);
  expect(runWorkspace({...input,cameras:[input.cameras[1]]},'',single()).device?.cameras).toHaveLength(1);
 });
 it('returns an unresolved state for overflow rather than numeric Infinity/NaN results',()=>{
  const run=runWorkspace(device(1e308,1e308),'',single());expect(run.device).toBeUndefined();expect(run.issues.join(' ')).toContain('numerical range');expect(hasNonFinite(run.battery)).toBe(false);
 });
 it('repeats exactly with unchanged engine and model versions',()=>{
  const first=runWorkspace(device(),'95',buildProfile(powers,shares,'percent'));
  expect(runWorkspace(device(),'95',buildProfile(powers,shares,'percent'))).toEqual(first);
  expect(SIMULATION_ENGINE_VERSION).toBe('0.6.0');expect(BATTERY_EXPERIENCE_VERSION).toBe('0.5.1-battery.1');expect(hasNonFinite(first)).toBe(false);
 });
});
