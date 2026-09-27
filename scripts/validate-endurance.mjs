/** Audit the actual evidence resolver. Cross-protocol gaps are NOT accuracy tests. */
import {tsImport} from 'tsx/esm/api';
import {readFileSync} from 'node:fs';
const {REFERENCE_DEVICES,resolvePowerEvidence,resolveEndurance,POWER_EVIDENCE_VERSION}=await tsImport('../src/lib/simulation/power-evidence.ts',import.meta.url);
const {USAGE_PRESETS}=await tsImport('../src/lib/simulation/alpha-workspace.ts',import.meta.url);
const measurements=JSON.parse(readFileSync(new URL('../data/calibration/battery/measurements.json',import.meta.url),'utf8')).measurements;
console.log(`# Endurance audit — ${POWER_EVIDENCE_VERSION}\n`);
console.log('Actual production resolver; no validation records fitted. Published pack energy divided by runtime is derived power, not measured watts.\n');
console.log('## Internal leave-one-device-out, same Wi-Fi protocol\n');
console.log('Calibration-set cross-validation, not independent held-out validation. Population extrema are a reference envelope, not an uncertainty interval.\n');
console.log('| Device | Observed h | Reference envelope h | Midpoint absolute gap h | Midpoint signed gap % | Inside envelope |');
console.log('|---|---:|---:|---:|---:|---|');
for(const target of REFERENCE_DEVICES){
 const evidence=resolvePowerEvidence({energyWh:target.energyWh,name:target.model},REFERENCE_DEVICES.filter(r=>r.id!==target.id));
 const {min,max}=evidence.screenOnBudgetHours, actual=target.runtimeSeconds/3600, midpoint=(min+max)/2;
 console.log(`| ${target.model} | ${actual.toFixed(2)} | ${min.toFixed(2)}–${max.toFixed(2)} | ${Math.abs(midpoint-actual).toFixed(2)} | ${((midpoint-actual)/actual*100).toFixed(1)} | ${actual>=min&&actual<=max} |`);
}
console.log('\n## Held-out records: different protocol, descriptive only\n');
console.log('| Device | Wi-Fi calibration h | Cellular held-out h | Wi-Fi / cellular gap % | Accuracy error |');
console.log('|---|---:|---:|---:|---|');
for(const m of measurements.filter(m=>m.dataset_role==='validation')){
 const ref=REFERENCE_DEVICES.find(r=>r.id===m.device_id); if(!ref) continue;
 const wifi=ref.runtimeSeconds/3600,cell=m.value.runtime_seconds/3600;
 console.log(`| ${ref.model} | ${wifi.toFixed(2)} | ${cell.toFixed(2)} | ${((wifi-cell)/cell*100).toFixed(1)} | N/A: protocol differs |`);
}
console.log('\n## Daily profiles: no comparable measured mixed-use records\n');
console.log('| Device | Profile | Daily verdict | Unaccounted h | Accuracy error |');
console.log('|---|---|---|---:|---|');
for(const ref of REFERENCE_DEVICES){
 const evidence=resolvePowerEvidence({energyWh:ref.energyWh,name:ref.model});
 for(const [name,usage] of Object.entries({...USAGE_PRESETS,Custom:{web_browsing:60,video_playback:0,gaming:360,camera_use:30}})){
  const result=resolveEndurance({evidence,minutesPerDay:usage,usableEnergyWh:ref.energyWh});
  console.log(`| ${ref.model} | ${name} | ${result.verdict} | ${result.unevidencedHours.toFixed(2)} | N/A: no comparable observations |`);
 }
}
console.log('\nCalibration IDs: '+REFERENCE_DEVICES.flatMap(r=>r.measurementIds).join(', '));
console.log('\nHeld-out IDs: '+measurements.filter(m=>m.dataset_role==='validation').map(m=>m.id).join(', '));
console.log('\nNo multipliers or fitted corrections. Missing: gaming, video, camera and standby power; independent same-protocol and mixed-use validation. A claimed 2× real-world error cannot be quantified from these data.');
