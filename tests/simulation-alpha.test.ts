import {describe,it,expect,vi,afterEach} from 'vitest';
import {INITIAL_EXPERIENCE,experienceReducer,USAGE_PRESETS,deriveUsage,simpleProfile,freezeRun,USAGE_VERSION,type AlphaRun} from '../src/lib/simulation/alpha-workspace';
import {buildProfile,runWorkspace,type WorkloadFields} from '../src/lib/simulation/beta-workspace';
import {filename,resultSummary,receiptSections,simulationId,wrapText,renderPng,canWebShare,numberText} from '../src/lib/simulation/result-export';
import type {SimulationInput} from '../src/lib/simulation/types';
const powers:WorkloadFields={mixed_use:'',web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'};
const input:SimulationInput={name:'Alpha concept',formFactor:'phone',displays:{primary:{diagonalInches:6.7,resolutionWidthPx:1440,resolutionHeightPx:3200}},battery:{cells:[{capacityMah:5000,nominalVoltageV:4}]}};
function sample(simple=false):AlphaRun {
 const profile=simple?simpleProfile({...INITIAL_EXPERIENCE,useEnteredPower:true},powers):buildProfile(powers,powers,'equal');
 return freezeRun(runWorkspace(input,'',profile),{mode:simple?'simple':'advanced',usageProfile:simple?'Typical':'Advanced',usageVersion:USAGE_VERSION,powerSource:'User supplied; unverified',usablePercent:'',calibrationVersion:'None applied'});
}
afterEach(()=>vi.unstubAllGlobals());
describe('Alpha usage translation',()=>{
 it('defaults to Simple and Typical and simulates without any user wattage',()=>{expect(INITIAL_EXPERIENCE).toMatchObject({mode:'simple',preset:'Typical',useEnteredPower:false});const profile=simpleProfile(INITIAL_EXPERIENCE,powers,{energyWh:20,displayAreaCm2:75});expect(profile.issues).toEqual([]);expect(profile.terms.length).toBeGreaterThan(0);expect(runWorkspace(input,'',profile).battery?.result.status).toBe('resolved');});
 it.each(['Light','Typical','Heavy'] as const)('derives complete daily distribution for %s',preset=>{const d=deriveUsage(USAGE_PRESETS[preset]);expect(d.issues).toEqual([]);expect(Object.values(d.shares).reduce((sum,s)=>sum+Number(s),0)).toBeCloseTo(100);expect(d.activeMinutes+d.idleMinutes).toBe(1440);});
 it('preserves custom usage and explicit power consent across mode/preset switches',()=>{
  let state=experienceReducer(INITIAL_EXPERIENCE,{type:'duration',key:'gaming',value:'72.5'});
  state=experienceReducer(state,{type:'mode',value:'advanced'});state=experienceReducer(state,{type:'preset',value:'Heavy'});state=experienceReducer(state,{type:'mode',value:'simple'});state=experienceReducer(state,{type:'preset',value:'Custom'});
  expect(state.custom.gaming).toBe('72.5');expect(state.useEnteredPower).toBe(false);
 });
 it.each(['','-1','1441','NaN','Infinity','1e999'])('rejects invalid duration %s',value=>{expect(deriveUsage({...USAGE_PRESETS.Typical,gaming:value}).issues.length).toBeGreaterThan(0);});
 it('rejects more than a day and permits all idle or one active workload',()=>{expect(deriveUsage({web_browsing:'1000',video_playback:'500',gaming:'0',camera_use:'0'}).issues.length).toBe(1);expect(deriveUsage({web_browsing:'0',video_playback:'0',gaming:'0',camera_use:'0'}).shares.standby).toBe('100');expect(deriveUsage({web_browsing:'1440',video_playback:'0',gaming:'0',camera_use:'0'}).shares.web_browsing).toBe('100');});
 it('requires idle power instead of silently dropping it',()=>{const p=simpleProfile({...INITIAL_EXPERIENCE,useEnteredPower:true},{...powers,standby:''});expect(p.issues.join(' ')).toContain('Standby');expect(runWorkspace(input,'',p).battery).toBeUndefined();});
 it('uses the same model deterministically with the established energy default',()=>{const a=sample(true);expect(a).toEqual(sample(true));expect(a.battery?.result.status).toBe('resolved');expect(a.battery?.result.estimate?.usableEnergyWh?.min).toBe(20);expect(a.battery?.result.estimate?.assumptions[0].code).toBe('NO_USABLE_PERCENT_SUPPLIED');});
 it('preserves PPI derivation and unknown volume',()=>{const a=sample();expect(a.device?.displays.primary.ppi).toBeCloseTo(Math.hypot(1440,3200)/6.7);expect(a.device?.battery?.totalVolumeCm3).toBeUndefined();expect(runWorkspace({...input,displays:{primary:{}}},'',a.profile).device?.displays.primary.ppi).toBeUndefined();});
});
describe('Frozen sharing',()=>{
 it('deep freezes a detached calculation without changing it during export',()=>{const a=sample();const before=JSON.stringify(a);expect(Object.isFrozen(a.input)).toBe(true);receiptSections(a,'2026-09-25T00:00:00Z');resultSummary(a);expect(JSON.stringify(a)).toBe(before);expect(simulationId(a)).toBe(simulationId(sample()));});
 it.each([false,true])('exports correct result, confidence and versions for simple=%s',simple=>{const a=sample(simple);const summary=resultSummary(a);expect(summary).toContain(a.battery!.result.estimate!.runtimeHours!.min!.toFixed(1)+' h');expect(summary).toContain('Moderate');expect(summary).toContain(simple?'Typical':'Advanced');const receipt=JSON.stringify(receiptSections(a,'2026-09-25T00:00:00Z'));expect(receipt).toContain('0.5.1-battery.1');expect(receipt).toContain('0.4.0');expect(receipt).not.toMatch(/undefined|NaN|Infinity/);});
 it('sanitizes filenames and wraps long names without dropping text',()=>{expect(filename('../../A phone?💡')).toBe('phonefuturist-a-phone-simulation.png');expect(filename('💡',true)).toBe('phonefuturist-device-simulation-receipt.png');expect(wrapText('x'.repeat(160),100,s=>s.length*10).join('')).toBe('x'.repeat(160));});
 it('handles unknown values and missing browser sharing',()=>{expect(numberText(undefined)).toBe('Unknown');expect(numberText(NaN)).toBe('Unknown');expect(numberText(100,0)).toBe('100');expect(canWebShare({})).toBe(false);expect(canWebShare({share(){}})).toBe(true);const a=sample();expect(JSON.stringify(receiptSections(a,'now'))).toContain('Unknown');});
 it.each(['card','receipt'] as const)('generates a dedicated high-resolution %s PNG',async kind=>{
  const drawn:string[]=[];const canvas={width:0,height:0,getContext:()=>({font:'',fillStyle:'',measureText:(s:string)=>({width:s.length*14}),fillRect(){},fillText(s:string){drawn.push(s);}}),toBlob:(cb:(b:Blob)=>void)=>cb(new Blob(['png'],{type:'image/png'}))};
  vi.stubGlobal('document',{createElement:()=>canvas});const a=sample();const before=JSON.stringify(a);const blob=await renderPng(a,kind,'2026-09-25T00:00:00Z');expect(blob.type).toBe('image/png');expect(canvas.width).toBe(1080);expect(canvas.height).toBeGreaterThanOrEqual(1350);expect(drawn.join(' ')).toContain('PHONEFUTURIST');expect(drawn.join(' ')).not.toMatch(/undefined|NaN|Infinity/);expect(JSON.stringify(a)).toBe(before);
 });
});


it('renders Simple as default with no engineering power or derating controls',async()=>{
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {default:Simulator}=await import('../src/components/interactive-leaks/InteractiveLeaksSimulator');
 const html=renderToStaticMarkup(createElement(Simulator));
 expect(html).toContain('name="simulation-mode" checked=""');expect(html).toContain('How do you use this phone?');expect(html).toContain('name="usage-profile" checked=""');expect(html).not.toContain('aria-label="Gaming average device power (W)"');expect(html).not.toContain('Full rated pack');
});
it('wraps a long device name in the PNG and never changes the calculated result',async()=>{
 const a=freezeRun({...sample(),input:{...input,name:'A very long device concept '.repeat(6)}},sample().context);
 const drawn:{text:string;y:number}[]=[];const ctx={font:'',fillStyle:'',textBaseline:'',measureText:(s:string)=>({width:s.length*18}),fillRect(){},fillText(text:string,_x:number,y:number){drawn.push({text,y});}};
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx,toBlob:(cb:(b:Blob)=>void)=>cb(new Blob(['png'],{type:'image/png'}))})});
 await renderPng(a,'card');expect(ctx.textBaseline).toBe('top');expect(drawn.filter(row=>row.text.includes('concept')).length).toBeGreaterThan(1);expect(drawn.every(row=>row.y<1310)).toBe(true);
});
