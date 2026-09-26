import {simpleEnduranceHeadline,type AlphaRun} from './alpha-workspace';
import {WORKLOAD_LABEL} from './beta-workspace';
import {WEB_ANCHOR_CONDITIONS,WEB_ANCHOR_HELDOUT_OPTIMISM,enduranceUpperBoundDays,simpleEvidenceConfidence,workloadEvidence} from './power-evidence';

export const DISCLAIMER='Simulated estimate based on supplied specifications and model assumptions.';
export const RECEIPT_DISCLAIMER='This is a simulated estimate, not a measured battery-life result. Results depend on supplied specifications, assumptions, model versions and available reference data.';
export function numberText(value:unknown,digits=2):string {return typeof value==='number'&&Number.isFinite(value)?String(Number(value.toFixed(digits))):'Unknown';}
export function runtimeText(run:AlphaRun):string {
  const r=run.battery?.result.estimate?.runtimeHours;
  if(r?.min===undefined||r.max===undefined||!Number.isFinite(r.min)||!Number.isFinite(r.max))return 'Unknown';
  return Math.abs(r.max-r.min)<1e-9?`${r.min.toFixed(1)} h`:`${r.min.toFixed(1)}–${r.max.toFixed(1)} h`;
}
export function confidenceText(run:AlphaRun):string {
  if(run.endurance&&run.evidence){const level=simpleEvidenceConfidence(run.evidence,run.endurance).level;return level[0].toUpperCase()+level.slice(1);}
  const value=run.battery?.result.confidence;return value?value[0].toUpperCase()+value.slice(1):'Unknown';
}

/**
 * The quantity a result actually represents.
 *
 * A Simple Mode daily profile answers "how long does a charge last under
 * this pattern". An Advanced continuous-workload simulation answers "how
 * long does this one workload last". Those are different numbers and the
 * card must never present one as the other.
 */
export function isSimpleEndurance(run:AlphaRun):boolean {return run.context.mode==='simple'&&!!run.endurance;}

/** Headline text: an endurance verdict in Simple Mode, hours in Advanced. */
export function headlineText(run:AlphaRun):string {
  if(isSimpleEndurance(run)) return simpleEnduranceHeadline(run.endurance)?.headline??'Unknown';
  if(run.context.mode==='simple') {
    const hours=run.battery?.result.estimate?.runtimeHours;
    if(hours?.min!==undefined&&hours.max!==undefined) return `${numberText(hours.min/24)}-${numberText(hours.max/24)} days per charge`;
  }
  return runtimeText(run);
}

/** Label naming the quantity shown, so the number is never ambiguous. */
export function headlineLabel(run:AlphaRun):string {
  return run.context.mode==='simple'?'ESTIMATED ENDURANCE':'SIMULATED BATTERY RUNTIME';
}
export function filename(name:string,receipt=false):string {
  const slug=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75).replace(/-$/,'')||'device';
  return `phonefuturist-${slug}-simulation${receipt?'-receipt':''}.png`;
}
function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  return JSON.stringify(value)??'null';
}
/** Compact configuration reference, not a signature or cryptographic verification. */
export function simulationId(run:AlphaRun):string {
  let hash=2166136261;
  for(const ch of canonical(run)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return 'IL-'+(hash>>>0).toString(16).toUpperCase().padStart(8,'0');
}
export function resultSummary(run:AlphaRun):string {
  return `${run.input.name?.trim()||'Untitled concept'}\n${headlineLabel(run)}: ${headlineText(run)}\nUsage profile: ${run.context.usageProfile}\nConfidence: ${confidenceText(run)}\nInteractive Leaks · PhoneFuturist\nEngine v${run.device?.engineVersion??'Unknown'}\n\n${DISCLAIMER}`;
}
export type ExportSection={title:string;lines:string[]};
function describe(value:unknown,prefix=''):string[] {
  if(value===undefined||value===null)return [`${prefix}: Unknown`];
  if(Array.isArray(value))return value.length?value.flatMap((item,i)=>describe(item,`${prefix} ${i+1}`)):[`${prefix}: Unknown`];
  if(typeof value==='object')return Object.entries(value).flatMap(([key,v])=>describe(v,`${prefix?prefix+' · ':''}${key.replace(/([a-z])([A-Z])/g,'$1 $2')}`));
  return [`${prefix}: ${typeof value==='number'?numberText(value):String(value)}`];
}
/** Simple Mode endurance accounting, one line per workload, with evidence status. */
function enduranceLines(run:AlphaRun):string[] {
  const endurance=run.endurance;
  if(!endurance) return [];
  const upper=enduranceUpperBoundDays(endurance);
  const lines:string[]=[
    `Verdict: ${simpleEnduranceHeadline(endurance)?.headline}`,
    `Active use: ${numberText(endurance.activeHours)} h/day`,
    `Idle remainder: ${numberText(endurance.idleHours)} h/day (no calibration evidence for idle draw)`,
    `Evidenced screen-on budget: ${numberText(endurance.screenOnBudgetHours.min)}–${numberText(endurance.screenOnBudgetHours.max)} h of continuous ${WEB_ANCHOR_CONDITIONS.connectivity} web at ~${WEB_ANCHOR_CONDITIONS.brightnessNits} cd/m²`,
  ];
  if(endurance.accountedEnergyWh) lines.push(`Accounted daily energy (evidenced workloads only, partial): ${numberText(endurance.accountedEnergyWh.min)}–${numberText(endurance.accountedEnergyWh.max)} Wh`);
  if(upper!==undefined) lines.push(`Reference calculation upper endpoint: ${numberText(upper,1)} days per charge. All 24 hours are accounted for; this is not a measured real-world uncertainty bound.`);
  for(const line of endurance.dailyBudget) lines.push(`${WORKLOAD_LABEL[line.workload]}: ${numberText(line.hours)} h/day · evidence: ${line.status==='insufficient'?'NONE IN DATASET':line.status}${line.energyWh?` · ${numberText(line.energyWh.min)}–${numberText(line.energyWh.max)} Wh`:''}`);
  lines.push(`Cross-protocol observed gap (not model accuracy): ${WEB_ANCHOR_HELDOUT_OPTIMISM.meanSignedPercentError}% mean (${WEB_ANCHOR_HELDOUT_OPTIMISM.range.min}–${WEB_ANCHOR_HELDOUT_OPTIMISM.range.max}%, n=${WEB_ANCHOR_HELDOUT_OPTIMISM.measuredDevices}) — recorded, not corrected`);
  if(run.evidence){const confidence=simpleEvidenceConfidence(run.evidence,endurance);lines.push(`Evidence confidence: ${confidence.level} (${(confidence.evidencedShare*100).toFixed(0)}% of the full day has power evidence)`);for(const reason of confidence.reasons) lines.push(`  · ${reason}`);}
  return lines;
}

export function receiptSections(run:AlphaRun,generatedAt:string):ExportSection[] {
  const estimate=run.battery?.result.estimate;
  const evidence=run.evidence;
  const perWorkload=evidence?workloadEvidence(evidence):undefined;
  return [
    {title:'RESULT',lines:[run.input.name||'Untitled concept',`${headlineLabel(run)}: ${headlineText(run)}`,...(isSimpleEndurance(run)?[`Continuous web runtime for reference: ${runtimeText(run)}`]:[]),`Confidence: ${confidenceText(run)}`]},
    {title:'DEVICE',lines:[`Form factor: ${run.input.formFactor.replaceAll('_',' ')}`,...describe(run.input.dimensions,'Dimensions'),...describe(run.input.displays,'Display'),...describe(run.input.battery,'Rated battery'), 'Processor: Unknown — not supported by this engine schema']},
    {title:'ENVIRONMENT',lines:[`Usage profile: ${run.context.usageProfile}`,...(isSimpleEndurance(run)?enduranceLines(run):[]),`Usage mapping: ${run.context.usageVersion}`,...(run.context.usage?describe(run.context.usage,'Minutes per day'):[]),...run.profile.terms.map(t=>`${WORKLOAD_LABEL[t.workload]}: ${numberText(t.share*100)}% at ${numberText(t.power)} W whole-device power`),`Power source: ${run.context.powerSource}`,`Usable energy: ${numberText(estimate?.usableEnergyWh?.min)} Wh`,...estimate?.assumptions.map(a=>a.message)??[]]},
    {title:'CAMERAS',lines:describe(run.input.cameras,'Camera')},
    {title:'MODEL',lines:[`Engine v${run.device?.engineVersion??'Unknown'}`,`Battery model ${run.battery?.result.engineVersion??'Unknown'}`,`Calibration: ${run.context.calibrationVersion}`,`Receipt generated: ${generatedAt}`,`Simulation ID: ${simulationId(run)} (reference only, not verification)`]},
    {title:'ASSUMPTIONS / PROVENANCE',lines:[`Device specifications: user supplied / unverified; illustrative inputs remain assumptions.`,...(evidence?.notes??[]),...(evidence?.assumptions??[]),...(perWorkload?Object.values(perWorkload).map(w=>`${WORKLOAD_LABEL[w.workload]}: ${w.powerW?`${numberText(w.powerW.min)}–${numberText(w.powerW.max)} W`:'no power value'} · ${w.provenance?.kind??w.status} · ${w.note}`):[]),...(estimate?.parameters??[]).map(p=>`${p.parameter}: ${p.value!==undefined?numberText(p.value):`${numberText(p.range?.min)}–${numberText(p.range?.max)} W`} · provenance: ${p.provenanceRecorded?p.provenance?.kind??'unknown':'unknown (no source recorded by the model)'}${p.provenance?.note?` · ${p.provenance.note}`:''}`),...(estimate?.assumptions??[]).map(a=>`Assumption (${a.provenance?.kind??'modeled'}): ${a.message}`),'Equal runtime bounds from point inputs are one estimate, not a measured uncertainty interval.']},
    {title:'WARNINGS / MISSING INFORMATION',lines:[...run.issues,...run.device?.warnings.map(w=>w.message)??[],...run.battery?.result.confidenceNotes??[],...(run.battery?.warnings??[]).map(w=>w.message),'Missing optional device fields stay Unknown. No measured runtime or calibrated power is claimed.']},
  ];
}
export function canWebShare(nav:{share?:unknown}):boolean{return typeof nav.share==='function';}

// Dedicated canvas composition: fixed pixels, no page screenshot, external fonts or network requests.
export function wrapText(text:string,maxWidth:number,measure:(s:string)=>number):string[] {
  const lines:string[]=[];let line='';
  for(const word of text.split(/\s+/)){
    if(measure(word)>maxWidth){if(line){lines.push(line);line='';}for(const ch of word){if(measure(line+ch)>maxWidth){lines.push(line);line='';}line+=ch;}continue;}
    const next=line?line+' '+word:word;if(measure(next)>maxWidth&&line){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);return lines.length?lines:[''];
}
export async function renderPng(run:AlphaRun,kind:'card'|'receipt',generatedAt=new Date().toISOString()):Promise<Blob> {
  if(run.battery?.result.status!=='resolved'||(headlineText(run)==='Unknown'&&runtimeText(run)==='Unknown'))throw new Error('Run a complete simulation before exporting.');
  const canvas=document.createElement('canvas');canvas.width=1080;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export is unavailable in this browser.');
  type Line={text:string;x:number;y:number;size:number;color:string;bold:boolean};
  const lines:Line[]=[];let y=90;
  function add(text:string,size=26,color='#eee9db',bold=false,gap=20){ctx!.font=`${bold?'700':'400'} ${size}px Arial`;for(const row of wrapText(text,924,s=>ctx!.measureText(s).width)){lines.push({text:row,x:78,y,size,color,bold});y+=size*1.35;}y+=gap;}
  add('PHONEFUTURIST',32,'#eee9db',true,4);add('INTERACTIVE LEAKS',20,'#c6c0b0',false,55);
  if(kind==='card'){
    const name=run.input.name?.trim()||'Untitled concept';add(name, name.length>70?32:54,'#fffaf0',true,45);
    add(headlineLabel(run),23,'#c6c0b0',false,12);
    if(isSimpleEndurance(run)){
      add(headlineText(run),headlineText(run).length>60?38:headlineText(run).length>28?54:72,'#eee9db',true,10);
      add(`Reference-only: ${numberText(run.battery?.result.estimate?.runtimeHours?.min,1)}–${numberText(run.battery?.result.estimate?.runtimeHours?.max,1)} h of continuous Wi-Fi web browsing`,24,'#c6c0b0',false,20);
    }else add(headlineText(run),run.context.mode==='simple'?54:100,'#eee9db',true,35);
    add(`Usage profile  ·  ${run.context.usageProfile}`,30);add(`Confidence  ·  ${confidenceText(run)}`,30,undefined,false,30);
    const cell=run.input.battery?.cells?.[0];add(`Rated battery: ${numberText(cell?.capacityMah)} mAh`,25);add(`Display: ${numberText(run.input.displays.primary.diagonalInches)} in`,25);
    y=Math.max(y+30,1050);add(DISCLAIMER,23,'#d6d0c1',false,26);add(`Interactive Leaks · Public Beta | Engine v${run.device?.engineVersion}`,20);add('phonefuturist',24,'#eee9db',true,0);
    if(y>1310)throw new Error('Device name is too long for the card. Use the receipt or shorten the name and run again.');canvas.height=1350;
  }else{
    add('SIMULATION RECEIPT',38,'#fffaf0',true,35);
    for(const section of receiptSections(run,generatedAt)){add(section.title,25,'#d8ceaa',true,12);for(const line of section.lines)add(line,23,'#eee9db',false,9);y+=28;}
    add(RECEIPT_DISCLAIMER,23);canvas.height=Math.ceil(y+65);
    if(canvas.height>16000)throw new Error('This receipt is too long for a single PNG. Reduce optional camera detail and run again.');
  }
  ctx.fillStyle='#2c2c29';ctx.fillRect(0,0,1080,canvas.height);ctx.fillStyle='#797261';ctx.fillRect(35,35,4,canvas.height-70);
  ctx.textBaseline='top';
  for(const line of lines){ctx.fillStyle=line.color;ctx.font=`${line.bold?'700':'400'} ${line.size}px Arial`;ctx.fillText(line.text,line.x,line.y);}
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG could not be generated. Try another browser.')),'image/png'));
}
