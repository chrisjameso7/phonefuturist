/**
 * Reproducible validation of the Simple Mode power-evidence model.
 *
 * Run: node scripts/validate-endurance.mjs
 *
 * Two held-out checks, neither of which uses validation data to build the
 * model:
 *
 *   V1  Tom's Guide cellular web runtimes, which the power anchor never
 *       sees. Directly comparable: same workload class, same ~150 cd/m2,
 *       different radio.
 *   V2  Leave-one-out across the five Notebookcheck calibration devices,
 *       to see whether the population band brackets a device it has not
 *       seen.
 *
 * The v1.0 figures are reproduced alongside v2.0 so the change in reported
 * behaviour is visible rather than asserted.
 */
import {readFileSync} from 'node:fs';

const load=(p)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const D=load('../data/calibration/battery/devices.json').devices;
const M=load('../data/calibration/battery/measurements.json').measurements;
const byId=Object.fromEntries(D.map(d=>[d.id,d]));
const energy=d=>d.battery.rated_energy_wh??d.battery.typical_energy_wh;
const areaCm2=d=>{const diag=d.display.diagonal_inches*2.54;const px=d.display.width_pixels**2+d.display.height_pixels**2;return diag*diag*d.display.width_pixels**2/px;};
const ref=m=>{const d=byId[m.device_id];return{id:d.id,model:d.model,E:energy(d),t:m.value.runtime_seconds/3600,P:energy(d)/(m.value.runtime_seconds/3600),A:areaCm2(d),meas:m.id};};
const CAL=M.filter(m=>m.dataset_role==='calibration').map(ref);
const VAL=M.filter(m=>m.dataset_role==='validation').map(ref);
const f=(n,d=2)=>Number(n.toFixed(d));

console.log('='.repeat(80));
console.log('V1  HELD-OUT cellular web (never used to build the model)');
console.log('='.repeat(80));
console.log('Device                  t_NB(h)  t_TG(h)   pred(h)    abs err    % err');
let v1=[];
for(const v of VAL){
  const c=CAL.find(r=>r.id===v.id); if(!c) continue;
  const err=c.t-v.t, pct=err/v.t*100;
  v1.push(pct);
  console.log(`${c.model.padEnd(24)}${f(c.t).toFixed(2).padStart(6)}${f(v.t).toFixed(2).padStart(8)}${f(c.t).toFixed(2).padStart(9)}${f(err).toFixed(2).padStart(11)}${((pct>=0?'+':'')+pct.toFixed(1)+'%').padStart(9)}`);
}
const mean=v1.reduce((a,b)=>a+b,0)/v1.length;
const v1Direction=v1.every(x=>x>0)?'optimistic in every case':'mixed';
console.log(`\nmean signed error ${mean>=0?'+':''}${mean.toFixed(1)}%  (n=${v1.length}, ${v1Direction})`);
console.log('This bias is DISCLOSED, not corrected: applying a fitted factor would');
console.log('consume the validation set as calibration data.');

console.log('\n'+'='.repeat(80));
console.log('V2  LEAVE-ONE-OUT across the calibration set');
console.log('='.repeat(80));
console.log('Device                       band (h)      actual(h)  contains   % err(mid)');
let v2=[],covered=0;
for(const target of CAL){
  const others=CAL.filter(r=>r.id!==target.id);
  const p=others.map(r=>r.P).sort((a,b)=>a-b);
  const lo=target.E/p[p.length-1], hi=target.E/p[0];
  const mid=(lo+hi)/2, pct=(mid-target.t)/target.t*100;
  const ok=target.t>=lo&&target.t<=hi; if(ok) covered++;
  v2.push(pct);
  console.log(`${target.model.padEnd(24)}${(f(lo)+'-'+f(hi)).padStart(18)}${f(target.t).toFixed(2).padStart(12)}${(ok?'yes':'no ').padStart(11)}${((pct>=0?'+':'')+pct.toFixed(1)+'%').padStart(9)}`);
}
const mean2=v2.reduce((a,b)=>a+b,0)/v2.length;
console.log(`\nmean signed error ${mean2>=0?'+':''}${mean2.toFixed(1)}%   band brackets ${covered}/${v2.length}`);

console.log('\n'+'='.repeat(80));
console.log('DEVICE ADJUSTMENT: evidence for removing the panel-area correction');
console.log('='.repeat(80));
const rows=[...CAL].sort((a,b)=>a.A-b.A);
for(const r of rows) console.log(`${r.model.padEnd(22)} area ${r.A.toFixed(1)} cm2   P ${r.P.toFixed(3)} W`);
const n=rows.length,mx=rows.reduce((s,r)=>s+r.A,0)/n,my=rows.reduce((s,r)=>s+r.P,0)/n;
const num=rows.reduce((s,r)=>s+(r.A-mx)*(r.P-my),0);
const den=Math.sqrt(rows.reduce((s,r)=>s+(r.A-mx)**2,0)*rows.reduce((s,r)=>s+(r.P-my)**2,0));
console.log(`\nPearson r(panel area, measured power) = ${(num/den).toFixed(3)}`);
console.log('NEGATIVE. A positive area->power correction, which v1.0 applied with a');
console.log('0.75-1.35x clamp, pushes power the wrong way and is removed in v2.0.');

console.log('\n'+'='.repeat(80));
console.log('REPORTED BEHAVIOUR: v1.0 days-per-charge vs v2.0 endurance');
console.log('='.repeat(80));
const PRESETS={Light:{web_browsing:60,video_playback:30,gaming:0,camera_use:10},Typical:{web_browsing:120,video_playback:90,gaming:45,camera_use:15},Heavy:{web_browsing:180,video_playback:180,gaming:120,camera_use:30}};
const IDLE_V1=0.02;
console.log('v1.0 priced every active workload at the web figure and idle at 2%.');
console.log('v2.0 prices only web and leaves video/gaming/camera/idle unpriced.\n');
console.log('Device               v1.0 days (L/T/H)      v2.0 verdict / web budget');
for(const dev of CAL){
  const P=dev.P;
  const v1days=Object.entries(PRESETS).map(([,mins])=>{
    const active=Object.values(mins).reduce((a,b)=>a+b,0)/60;
    return (dev.E/(active*P+(24-active)*P*IDLE_V1)).toFixed(2);
  });
  const budget=(dev.E/P).toFixed(1);
  const active=Object.values(PRESETS.Typical).reduce((a,b)=>a+b,0)/60;
  const verdict=active<=dev.E/P?'covered':'exceeds';
  const unevid=(90+45+15)/60;
  console.log(`${dev.model.padEnd(20)} ${v1days.join(' / ').padEnd(24)}  Typical ${verdict}; ${budget} h web budget; ${unevid.toFixed(1)} h/day unpriced`);
}
console.log('\nv1.0 published 2-10 days per charge. No comparable held-out evidence');
console.log('exists for a daily mixed profile, so those numbers were never');
console.log('verifiable and are withdrawn rather than re-tuned.');
