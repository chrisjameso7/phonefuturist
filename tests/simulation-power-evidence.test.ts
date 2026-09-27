import {describe,it,expect} from 'vitest';
import {
  DAY_HOURS,
  USAGE_PRESETS,
  INITIAL_EXPERIENCE,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  simpleEndurance,
  simpleEnduranceHeadline,
  simpleProfile,
  freezeRun,
  type UsagePreset,
} from '../src/lib/simulation/alpha-workspace';
import {buildProfile, runWorkspace, type WorkloadFields} from '../src/lib/simulation/beta-workspace';
import {receiptSections, resultSummary, headlineText, headlineLabel, isSimpleEndurance, renderPng, confidenceText} from '../src/lib/simulation/result-export';
import {
  DEVICE_ADJUSTMENT,
  POWER_EVIDENCE_VERSION,
  REFERENCE_DEVICES,
  SIMPLE_WORKLOADS,
  WEB_ANCHOR_CONDITIONS,
  WEB_ANCHOR_HELDOUT_OPTIMISM,
  displayAreaCm2,
  enduranceUpperBoundDays,
  evidenceDeviceFrom,
  resolveEndurance,
  resolvePowerEvidence,
  simpleEvidenceConfidence,
  workloadEvidence,
} from '../src/lib/simulation/power-evidence';
import measurements from '../data/calibration/battery/measurements.json';
import devices from '../data/calibration/battery/devices.json';
import type {SimulationInput} from '../src/lib/simulation/types';

const noPower:WorkloadFields={mixed_use:'',web_browsing:'',video_playback:'',gaming:'',camera_use:'',standby:''};

/* Galaxy S25 Ultra is in the calibration set, so it has a matched reference. */
const s25:SimulationInput={
  name:'Galaxy S25 Ultra',
  formFactor:'phone',
  displays:{primary:{diagonalInches:6.9,resolutionWidthPx:1440,resolutionHeightPx:3120}},
  battery:{cells:[{capacityMah:4855,nominalVoltageV:3.88}]},
};

function customRun(input:SimulationInput,custom:Record<string,string>){
  const experience={...INITIAL_EXPERIENCE,preset:'Custom' as const,custom:{web_browsing:'0',video_playback:'0',gaming:'0',camera_use:'0',...custom}};
  return build(input,experience);
}
function build(input:SimulationInput,experience=INITIAL_EXPERIENCE){
  const profile=simpleProfile(experience,noPower,evidenceDeviceFrom(input));
  const workspace=runWorkspace(input,'',profile);
  const endurance=simpleEndurance(experience,workspace.device?.battery?.totalEnergyWh,evidenceDeviceFrom(input));
  const evidence=resolvePowerEvidence(evidenceDeviceFrom(input));
  return {profile,workspace,endurance,evidence,run:freezeRun(workspace,{
    mode:'simple',usageProfile:experience.preset,usageVersion:'daily-usage-1',
    usage:{...(experience.preset==='Custom'?experience.custom:USAGE_PRESETS[experience.preset])},
    powerSource:'Calibrated from reference measurements',usablePercent:'',calibrationVersion:POWER_EVIDENCE_VERSION,
  },endurance&&evidence?{endurance,evidence}:undefined)};
}
const preset=(input:SimulationInput,p:UsagePreset)=>build(input,{...INITIAL_EXPERIENCE,preset:p});

describe('Evidence inventory: what the dataset actually contains',()=>{
  it('contains exactly one measured duty cycle and no others',()=>{
    const all=measurements.measurements;
    expect(all.every(m=>m.metric==='runtime')).toBe(true);
    expect([...new Set(all.map(m=>m.workload_class))]).toEqual(['web']);
    expect([...new Set(all.map(m=>m.protocol_id))].sort()).toEqual([
      'notebookcheck_wifi_web_v1_3','toms_guide_cellular_web_150_nits',
    ]);
    // The DXOMARK multi-use-case protocol is declared but carries no data.
    const protocolIds=new Set(all.map(m=>m.protocol_id));
    expect(protocolIds.has('dxomark_calibrated_use_case_200_nits')).toBe(false);
  });

  it('has no video, gaming, camera or idle measurement of any kind',()=>{
    for(const entry of Object.values(workloadEvidence(resolvePowerEvidence(evidenceDeviceFrom(s25))!))){
      if(entry.workload==='web_browsing'||entry.workload==='mixed_use') continue;
      expect(entry.status).toBe('insufficient');
      expect(entry.powerW).toBeUndefined();
    }
  });

  it('documents the one benchmark every watt figure comes from',()=>{
    expect(WEB_ANCHOR_CONDITIONS.provider).toBe('Notebookcheck');
    expect(WEB_ANCHOR_CONDITIONS.connectivity).toBe('wifi');
    expect(WEB_ANCHOR_CONDITIONS.brightnessNits).toBe(150);
    expect(WEB_ANCHOR_CONDITIONS.brightnessQualifier).toBe('approximate');
    expect(WEB_ANCHOR_CONDITIONS.workload).toContain('web browsing');
  });

  it('anchors on calibration records only and never on held-out validation',()=>{
    const used=new Set(REFERENCE_DEVICES.flatMap(r=>r.measurementIds));
    const heldOut=measurements.measurements.filter(m=>m.dataset_role==='validation');
    expect(heldOut.length).toBeGreaterThan(0);
    for(const record of heldOut) expect(used.has(record.id)).toBe(false);
    for(const reference of REFERENCE_DEVICES){
      const source=measurements.measurements.find(m=>m.id===reference.measurementIds[0])!;
      expect(source.dataset_role).toBe('calibration');
      expect(reference.datasetRole).toBe('calibration');
    }
  });

  it('derives power by dividing published energy by measured runtime',()=>{
    expect(REFERENCE_DEVICES.length).toBe(5);
    for(const reference of REFERENCE_DEVICES){
      const source=measurements.measurements.find(m=>m.id===reference.measurementIds[0])!;
      const device=devices.devices.find(d=>d.id===reference.id)!;
      const energy=reference.energyBasis==='rated'?device.battery.rated_energy_wh:device.battery.typical_energy_wh;
      expect(energy).toBe(reference.energyWh);
      expect(source.value.runtime_seconds).toBe(reference.runtimeSeconds);
      expect(reference.screenOnPowerW).toBeCloseTo(reference.energyWh/(reference.runtimeSeconds/3600),10);
    }
  });
});

describe('Descriptive cross-protocol comparison (not an accuracy backtest)',()=>{
  const heldOut=measurements.measurements.filter(m=>m.dataset_role==='validation');

  it.each(heldOut.map(m=>[devices.devices.find(d=>d.id===m.device_id)!.model,m] as const))(
    'reports the protocol gap for %s without calling it accuracy',
    (model,measurement)=>{
      const device=devices.devices.find(d=>d.id===measurement.device_id)!;
      const energy=REFERENCE_DEVICES.find(r=>r.id===measurement.device_id)!.energyWh;
      const input:SimulationInput={name:model,formFactor:'phone',displays:{primary:{diagonalInches:device.display.diagonal_inches!,resolutionWidthPx:device.display.width_pixels!,resolutionHeightPx:device.display.height_pixels!}},battery:{cells:[{capacityMah:energy*1000,nominalVoltageV:1}]}};
      const evidence=resolvePowerEvidence(evidenceDeviceFrom(input))!;
      // A matched device uses its own calibrated power, so the prediction
      // is exactly the runtime that power was derived from.
      expect(evidence.reference?.model).toBe(model);
      const predicted=energy/evidence.webPowerW.min;
      const actual=measurement.value.runtime_seconds/3600;
      const errorPercent=(predicted-actual)/actual*100;
      // The anchor is systematically optimistic on cellular; the model must
      // report that rather than silently correct it with a fitted constant.
      expect(errorPercent).toBeGreaterThan(0);
      expect(errorPercent).toBeGreaterThanOrEqual(WEB_ANCHOR_HELDOUT_OPTIMISM.range.min-1);
      expect(errorPercent).toBeLessThanOrEqual(WEB_ANCHOR_HELDOUT_OPTIMISM.range.max+1);
      expect(evidence.notes.join(' ')).toContain('cross-protocol gap');
      expect(device.model).toBe(model);
    },
  );

  it('surfaces the measured held-out optimism as a documented limitation',()=>{
    expect(WEB_ANCHOR_HELDOUT_OPTIMISM.measuredDevices).toBe(3);
    expect(WEB_ANCHOR_HELDOUT_OPTIMISM.meanSignedPercentError).toBeGreaterThan(0);
    expect(WEB_ANCHOR_HELDOUT_OPTIMISM.reason).toContain('Wi-Fi');
  });
});

describe('BACKTEST 2: leave-one-out over the calibration set',()=>{
  it('the band is unbiased on average but does not bracket every device',()=>{
    const errors:number[]=[];
    let covered=0;
    for(const target of REFERENCE_DEVICES){
      const others=REFERENCE_DEVICES.filter(r=>r.id!==target.id);
      const powers=others.map(r=>r.screenOnPowerW).sort((a,b)=>a-b);
      const lo=target.energyWh/powers[powers.length-1];
      const hi=target.energyWh/powers[0];
      const actual=target.runtimeSeconds/3600;
      if(actual>=lo&&actual<=hi) covered++;
      errors.push(((lo+hi)/2-actual)/actual*100);
    }
    const mean=errors.reduce((a,b)=>a+b,0)/errors.length;
    expect(Math.abs(mean)).toBeLessThan(10);
    // Recorded honestly: a five-device, single-protocol band does not
    // bracket every device. This is a stated limitation, not a tuned one.
    expect(covered).toBeLessThan(REFERENCE_DEVICES.length);
  });
});

describe('Device adjustment: none, and the evidence for removing it',()=>{
  it('applies no panel-area or platform correction',()=>{
    expect(DEVICE_ADJUSTMENT).toBe('none');
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    expect(evidence.notes.join(' ')).toContain('No device adjustment is applied');
  });

  it('power does not increase with panel area in the calibration set',()=>{
    const rows=REFERENCE_DEVICES.filter(r=>r.displayAreaCm2!==undefined)
      .map(r=>({area:r.displayAreaCm2!,power:r.screenOnPowerW}));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const n=rows.length;
    const mx=rows.reduce((s,r)=>s+r.area,0)/n;
    const my=rows.reduce((s,r)=>s+r.power,0)/n;
    const num=rows.reduce((s,r)=>s+(r.area-mx)*(r.power-my),0);
    const den=Math.sqrt(rows.reduce((s,r)=>s+(r.area-mx)**2,0)*rows.reduce((s,r)=>s+(r.power-my)**2,0));
    const correlation=num/den;
    // A positive area->power correction is not supported by this data.
    expect(correlation).toBeLessThan(0);
  });

  it('scales runtime with the device own pack energy, not with panel size',()=>{
    // Two configurations that both identify as the same reference device,
    // differing only in pack energy. Power must be identical; endurance
    // must scale purely with the pack.
    const small={...s25,battery:{cells:[{capacityMah:4850,nominalVoltageV:3.88}]}};
    const large={...s25,battery:{cells:[{capacityMah:4900,nominalVoltageV:3.88}]}};
    const smallEvidence=resolvePowerEvidence(evidenceDeviceFrom(small))!;
    const largeEvidence=resolvePowerEvidence(evidenceDeviceFrom(large))!;
    expect(smallEvidence.reference?.model).toBe(largeEvidence.reference?.model);
    expect(smallEvidence.webPowerW.min).toBeCloseTo(largeEvidence.webPowerW.min,10);
    const smallHours=preset(small,'Typical').endurance!.screenOnBudgetHours;
    const largeHours=preset(large,'Typical').endurance!.screenOnBudgetHours;
    expect(largeHours.max).toBeGreaterThan(smallHours.max);
    const energyRatio=(4900*3.88)/(4850*3.88);
    expect(largeHours.max/smallHours.max).toBeCloseTo(energyRatio,6);
  });
});

describe('Endurance semantics are separated from continuous runtime',()=>{
  it('labels the Simple Mode quantity as endurance, not runtime',()=>{
    const {run}=preset(s25,'Typical');
    expect(isSimpleEndurance(run)).toBe(true);
    expect(headlineLabel(run)).toBe('ESTIMATED ENDURANCE');
    expect(headlineText(run)).toContain('enough reference data');
    expect(headlineText(run)).not.toMatch(/\d+(\.\d+)?\s*h of battery life/);
  });

  it('keeps hour semantics for Advanced continuous-workload runs',()=>{
    const {profile,workspace}=build(s25);
    const advanced=freezeRun({...workspace,profile},{
      mode:'advanced',usageProfile:'Advanced',usageVersion:'daily-usage-1',
      powerSource:'User supplied in Advanced; unverified',usablePercent:'',calibrationVersion:'None applied',
    });
    expect(isSimpleEndurance(advanced)).toBe(false);
    expect(headlineLabel(advanced)).toBe('SIMULATED BATTERY RUNTIME');
  });

  it('never reports a precise days-per-charge as an estimate',()=>{
    const {endurance,run}=preset(s25,'Heavy');
    const upper=enduranceUpperBoundDays(endurance!)!;
    expect(upper).toBeUndefined();
    // The receipt must call it a bound, and say what it assumes.
    const receipt=JSON.stringify(receiptSections(run,'now'));
    expect(receipt).not.toContain('Endurance upper bound');
    expect(receipt).toContain('enough reference data');
  });

  it('compares a day against the evidenced screen-on budget',()=>{
    const light=preset(s25,'Light').endurance!;
    const heavy=preset(s25,'Heavy').endurance!;
    expect(light.activeHours).toBeLessThan(heavy.activeHours);
    expect(light.budgetUseRatio).toBeLessThan(heavy.budgetUseRatio);
    expect(light.idleHours+light.activeHours).toBeCloseTo(DAY_HOURS,10);
  });

  it('reports a headline and never a bare number of hours',()=>{
    const headline=simpleEnduranceHeadline(preset(s25,'Typical').endurance)!;
    expect(headline.headline).toContain('enough reference data');
    expect(headline.detail).toContain('Continuous Wi-Fi web');
    expect(simpleEnduranceHeadline(undefined)).toBeUndefined();
  });
});

describe('Daily energy budget accounts only for evidenced workloads',()=>{
  it('prices web hours and refuses to price the rest',()=>{
    const {endurance}=preset(s25,'Typical');
    const byWorkload=Object.fromEntries(endurance!.dailyBudget.map(l=>[l.workload,l]));
    expect(byWorkload.web_browsing.energyWh).toBeDefined();
    expect(byWorkload.gaming.energyWh).toBeUndefined();
    expect(byWorkload.gaming.status).toBe('insufficient');
    expect(byWorkload.standby.status).toBe('insufficient');
    // The accounted sum is explicitly partial and excludes idle.
    expect(endurance!.accountedEnergyWh).toBeDefined();
    expect(endurance!.unevidencedHours).toBeCloseTo(22,10);
  });

  it('never assigns an unevidenced workload a multiplier of web',()=>{
    const perWorkload=workloadEvidence(resolvePowerEvidence(evidenceDeviceFrom(s25))!);
    const web=perWorkload.web_browsing.powerW!;
    for(const workload of SIMPLE_WORKLOADS){
      if(workload==='web_browsing') continue;
      expect(perWorkload[workload].powerW).toBeUndefined();
      expect(perWorkload[workload].note).toMatch(/No .* measurement exists/);
    }
    expect(web.min).toBeGreaterThan(0);
  });

  it('resolves a verdict with no energy evidence at all',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    const endurance=resolveEndurance({evidence,minutesPerDay:{web_browsing:'0',video_playback:'0',gaming:'0',camera_use:'0'},usableEnergyWh:18.84});
    expect(endurance.verdict).toBe('insufficient-evidence');
    expect(endurance.accountedEnergyWh).toBeUndefined();
    expect(endurance.unevidencedHours).toBe(24);
  });
});

describe('Predefined presets order correctly, from the model not from constants',()=>{
  it('preset active use rises without inventing endurance',()=>{
    const light=preset(s25,'Light').endurance!;
    const typical=preset(s25,'Typical').endurance!;
    const heavy=preset(s25,'Heavy').endurance!;
    // Budget use rises with use; endurance is the inverse.
    expect(light.budgetUseRatio).toBeLessThan(typical.budgetUseRatio);
    expect(typical.budgetUseRatio).toBeLessThan(heavy.budgetUseRatio);
    // Expressed as days-per-charge upper bounds, the ordering is identical.
    const days=(e:typeof light)=>enduranceUpperBoundDays(e)!;
    expect(days(light)).toBeUndefined();
    expect(days(heavy)).toBeUndefined();
  });

  it('holds across every calibration reference device',()=>{
    for(const reference of REFERENCE_DEVICES){
      const input:SimulationInput={name:reference.model,formFactor:'phone',displays:{primary:{}},battery:{cells:[{capacityMah:reference.energyWh*1000,nominalVoltageV:1}]}};
      const days=(p:UsagePreset)=>enduranceUpperBoundDays(preset(input,p).endurance!)!;
      expect(days('Light')).toBeUndefined();
      expect(days('Heavy')).toBeUndefined();
    }
  });

  it.each([
    ['gaming',{gaming:'300'}],
    ['video_playback',{video_playback:'300'}],
    ['camera_use',{camera_use:'120'}],
  ] as const)('more %s time is reported as unevidenced rather than priced',(_label,extra)=>{
    // Unpriced hours cannot move a priced bound. What they must do is
    // shrink the evidenced share, which is what lowers confidence.
    const base={web_browsing:'60',video_playback:'30',gaming:'0',camera_use:'0'};
    const without=customRun(s25,{...base,...extra}).endurance!;
    const withMore=customRun(s25,{...base,...{gaming:'360',video_playback:'330',camera_use:'120'}}).endurance!;
    expect(withMore.unevidencedHours).toBe(without.unevidencedHours);
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    expect(simpleEvidenceConfidence(evidence,withMore).evidencedShare)
      .toBe(simpleEvidenceConfidence(evidence,without).evidencedShare);
  });

  it('more web time cannot resolve unknown standby power',()=>{
    const light=customRun(s25,{web_browsing:'60',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    const heavy=customRun(s25,{web_browsing:'600',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    const days=(e:typeof light)=>enduranceUpperBoundDays(e)!;
    expect(days(light)).toBeUndefined();
    expect(days(heavy)).toBeUndefined();
  });

  it('more web time raises accounted energy',()=>{
    const low=customRun(s25,{web_browsing:'30',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    const high=customRun(s25,{web_browsing:'300',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    expect(high.accountedEnergyWh!.max).toBeGreaterThan(low.accountedEnergyWh!.max);
  });
});

describe('Confidence reflects evidence quality',()=>{
  it('drops to low when most active hours have no evidence',()=>{
    const heavy=preset(s25,'Heavy');
    const report=simpleEvidenceConfidence(heavy.evidence!,heavy.endurance!);
    expect(report.level).toBe('low');
    expect(report.evidencedShare).toBeLessThan(0.5);
    expect(report.reasons.join(' ')).toContain('no calibration evidence');
  });

  it('stays low when web is evidenced but standby is not',()=>{
    const webOnly=customRun(s25,{web_browsing:'300',video_playback:'0',gaming:'0',camera_use:'0'});
    expect(simpleEvidenceConfidence(webOnly.evidence!,webOnly.endurance!).level).toBe('low');
  });

  it('never reaches high without a matched reference',()=>{
    const unmatched=build({...s25,battery:{cells:[{capacityMah:3000,nominalVoltageV:3.8}]}},{...INITIAL_EXPERIENCE,preset:'Custom',custom:{web_browsing:'300',video_playback:'0',gaming:'0',camera_use:'0'}});
    expect(simpleEvidenceConfidence(unmatched.evidence!,unmatched.endurance!).level).toBe('low');
  });

  it('is surfaced in the UI, summary and receipt',()=>{
    const {run}=preset(s25,'Heavy');
    expect(confidenceText(run)).toBe('Low');
    expect(resultSummary(run)).toContain('Low');
    expect(JSON.stringify(receiptSections(run,'now'))).toContain('Evidence confidence: low');
  });
});

describe('Provenance is structured and never claims a measurement it does not have',()=>{
  it('labels the matched web anchor calibrated and names the reference',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    const web=workloadEvidence(evidence).web_browsing;
    expect(web.status).toBe('calibrated');
    expect(web.provenance?.kind).toBe('calibrated');
    expect(web.provenance?.note).toContain('Galaxy S25 Ultra');
    expect(web.provenance?.note).toContain('never measured on the simulated device');
  });

  it('labels an unmatched device reference-derived',()=>{
    const evidence=resolvePowerEvidence({energyWh:11.5})!;
    expect(evidence.basis).toBe('reference-population');
    expect(workloadEvidence(evidence).web_browsing.status).toBe('reference');
    expect(workloadEvidence(evidence).web_browsing.provenance?.kind).toBe('reference');
  });

  it('no workload provenance is ever "measured"',()=>{
    for(const reference of REFERENCE_DEVICES){
      const device=devices.devices.find(d=>d.id===reference.id)!;
      const input:SimulationInput={name:reference.model,formFactor:'phone',displays:{primary:{diagonalInches:device.display.diagonal_inches!,resolutionWidthPx:device.display.width_pixels!,resolutionHeightPx:device.display.height_pixels!}},battery:{cells:[{capacityMah:reference.energyWh*1000,nominalVoltageV:1}]}};
      for(const entry of Object.values(workloadEvidence(resolvePowerEvidence(evidenceDeviceFrom(input))!))){
        expect(entry.provenance?.kind).not.toBe('measured');
      }
    }
  });

  it('names the source measurement ids and pack-energy basis',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    const notes=evidence.notes.join(' ');
    for(const reference of REFERENCE_DEVICES){
      expect(notes).toContain(reference.measurementIds[0]);
      expect(notes).toContain(`${reference.energyWh} Wh ${reference.energyBasis}`);
    }
  });

  it('reaches the receipt with per-workload status',()=>{
    const {run}=preset(s25,'Typical');
    const receipt=JSON.stringify(receiptSections(run,'now'));
    expect(receipt).toContain('calibrated');
    expect(receipt).toContain('insufficient');
    expect(receipt).toContain('NONE IN DATASET');
    expect(receipt).toContain(WEB_ANCHOR_CONDITIONS.protocolId);
  });
});

describe('Device name regression',()=>{
  const named={...s25,name:'Aurora X9 Concept'};

  it('preserves the simulated device name in result, summary and receipt',()=>{
    const {run}=build(named,{...INITIAL_EXPERIENCE,preset:'Typical'});
    expect(run.input.name).toBe('Aurora X9 Concept');
    expect(resultSummary(run).split('\n')[0]).toBe('Aurora X9 Concept');
    expect(receiptSections(run,'now')[0].lines[0]).toBe('Aurora X9 Concept');
  });

  it('keeps reference model names out of the result and out of the headline',()=>{
    const {run}=build(named,{...INITIAL_EXPERIENCE,preset:'Typical'});
    const result=receiptSections(run,'now')[0];
    expect(result.lines.join(' ')).not.toContain('Galaxy');
    expect(result.lines.join(' ')).not.toContain('iPhone');
    expect(result.lines.join(' ')).not.toContain('OnePlus');
    expect(result.lines.join(' ')).not.toContain('Pixel');
    expect(result.lines.join(' ')).toContain('Aurora X9 Concept');
    // The reference belongs in assumptions and provenance, nowhere else.
    const assumptions=receiptSections(run,'now').find(s=>s.title==='ASSUMPTIONS / PROVENANCE')!;
    expect(assumptions.lines.join(' ')).toContain('Galaxy');
    expect(headlineText(run)).not.toContain('Galaxy');
  });

  it('never shows "Flagship reference" for a named device',()=>{
    for(const presetName of ['Light','Typical','Heavy'] as const){
      const {run}=preset(s25,presetName);
      expect(JSON.stringify(run)).not.toContain('Flagship reference');
      expect(resultSummary(run)).toContain('Galaxy S25 Ultra');
    }
  });
});

describe('Determinism and output hygiene',()=>{
  it('repeats identically for the same configuration and evidence version',()=>{
    const a=preset(s25,'Heavy');
    const b=preset(s25,'Heavy');
    expect(JSON.stringify(a.run)).toBe(JSON.stringify(b.run));
    expect(POWER_EVIDENCE_VERSION).toBe('battery-calibration-2.1');
  });

  it('produces no NaN, Infinity, undefined or null anywhere in the result',()=>{
    for(const presetName of ['Light','Typical','Heavy'] as const){
      const text=JSON.stringify(preset(s25,presetName).run);
      expect(text).not.toMatch(/NaN|Infinity/);
      expect(text).not.toMatch(/"(activeHours|idleHours|budgetUseRatio|unevidencedHours)":null/);
    }
  });

  it('keeps every numeric budget line finite and non-negative',()=>{
    for(const presetName of ['Light','Typical','Heavy'] as const){
      for(const line of preset(s25,presetName).endurance!.dailyBudget){
        expect(Number.isFinite(line.hours)).toBe(true);
        expect(line.hours).toBeGreaterThanOrEqual(0);
        if(line.energyWh){
          expect(Number.isFinite(line.energyWh.min)).toBe(true);
          expect(line.energyWh.max).toBeGreaterThanOrEqual(line.energyWh.min);
        }
      }
    }
  });
});

describe('Genuinely insufficient evidence',()=>{
  it('reports the agreed message and offers Advanced as secondary',()=>{
    const {profile,workspace}=(()=>{
      const p=simpleProfile(INITIAL_EXPERIENCE,noPower,evidenceDeviceFrom(s25),[]);
      return {profile:p,workspace:runWorkspace(s25,'',p)};
    })();
    expect(profile.issues).toEqual([INSUFFICIENT_EVIDENCE_MESSAGE]);
    expect(INSUFFICIENT_EVIDENCE_MESSAGE).toBe("We don't have enough reference data to simulate this configuration yet.");
    expect(workspace.battery).toBeUndefined();
    // The message must not instruct the user to supply wattage.
    expect(INSUFFICIENT_EVIDENCE_MESSAGE).not.toMatch(/Advanced|watt|power/i);
  });

  it('resolves no endurance without usable pack energy',()=>{
    expect(simpleEndurance(INITIAL_EXPERIENCE,undefined,evidenceDeviceFrom(s25))).toBeUndefined();
    const noVoltage:SimulationInput={...s25,battery:{cells:[{capacityMah:4855}]}};
    expect(simpleEndurance(INITIAL_EXPERIENCE,undefined,evidenceDeviceFrom(noVoltage))).toBeUndefined();
  });

  it('fails closed on an out-of-range custom profile',()=>{
    const profile=simpleProfile({...INITIAL_EXPERIENCE,preset:'Custom',custom:{web_browsing:'2000',video_playback:'0',gaming:'0',camera_use:'0'}},noPower,evidenceDeviceFrom(s25));
    expect(profile.issues.length).toBeGreaterThan(0);
  });
});

describe('Advanced Mode is untouched',()=>{
  it('still fails closed on missing power and bad shares',()=>{
    const shares={mixed_use:'',web_browsing:'50',video_playback:'45',gaming:'',camera_use:'',standby:''};
    expect(buildProfile(noPower,shares,'percent').issues.join(' ')).toContain('at least one workload');
    expect(buildProfile({...noPower,web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'},shares,'percent').issues.join(' ')).toContain('100%');
  });

  it('still uses explicitly entered power when the user consents',() => {
    const experience={...INITIAL_EXPERIENCE,useEnteredPower:true};
    const profile=simpleProfile(experience,{...noPower,web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'},evidenceDeviceFrom(s25));
    expect(runWorkspace(s25,'',profile).battery?.result.status).toBe('resolved');
  });
});

describe('Result card and receipt use the corrected semantics',() => {
  it('card labels endurance and shows the continuous web reference',async() => {
    const drawn:string[]=[];
    const canvas={width:0,height:0,getContext:()=>({font:'',fillStyle:'',measureText:(s:string)=>({width:s.length*14}),fillRect(){},fillText(s:string){drawn.push(s);}}),toBlob:(cb:(b:Blob)=>void)=>cb(new Blob(['png'],{type:'image/png'}))};
    const g=globalThis as unknown as {document?:unknown};
    g.document={createElement:()=>canvas};
    try{
      const {run}=preset(s25,'Heavy');
      await renderPng(run,'card','2026-09-25T00:00:00Z');
      const text=drawn.join(' ');
      expect(text).toContain('ESTIMATED ENDURANCE');
      expect(text).not.toContain('SIMULATED BATTERY RUNTIME');
      expect(text).toContain('continuous Wi-Fi web browsing');
      expect(text).toContain('Heavy');
      expect(text).toContain('Galaxy S25 Ultra');
    }finally{delete g.document;}
  });

  it('receipt carries the exact frozen result',() => {
    const {run}=preset(s25,'Typical');
    const before=JSON.stringify(run);
    receiptSections(run,'2026-09-25T00:00:00Z');
    expect(JSON.stringify(run)).toBe(before);
  });
});

describe('Unknown inputs stay unknown',() => {
  it('leaves area unknown rather than guessing',() => {
    expect(displayAreaCm2(undefined,1440,3120)).toBeUndefined();
    expect(displayAreaCm2(6.9,0,3120)).toBeUndefined();
    expect(evidenceDeviceFrom({formFactor:'phone',displays:{primary:{}}})).toEqual({});
  });
});

describe('Evidence integrity regressions',()=>{
  it('does not identify an arbitrary concept from equal pack energy and geometry',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom({...s25,name:'Unreleased concept'}))!;
    expect(evidence.basis).toBe('reference-population');
    expect(evidence.reference).toBeUndefined();
  });
  it('computes rectangular panel area from both sides',()=>{
    expect(displayAreaCm2(5,3,4)).toBeCloseTo(3*4*2.54**2,10);
    expect(displayAreaCm2(5,4,3)).toBeCloseTo(displayAreaCm2(5,3,4)!,10);
  });
  it('uses every known battery cell and never a partial pack',()=>{
    const input={...s25,battery:{cells:[{capacityMah:2000,nominalVoltageV:4},{capacityMah:2500,nominalVoltageV:4}]}};
    expect(evidenceDeviceFrom(input).energyWh).toBe(18);
    expect(evidenceDeviceFrom({...input,battery:{cells:[input.battery.cells[0],{capacityMah:2500}]}}).energyWh).toBeUndefined();
  });
  it('does not transfer phone evidence to tablets',()=>{
    expect(resolvePowerEvidence(evidenceDeviceFrom({...s25,formFactor:'tablet'}))).toBeUndefined();
  });
  it.each([NaN,Infinity,-1,1441])('rejects invalid daily minutes %s',minutes=>{
    expect(()=>resolveEndurance({evidence:resolvePowerEvidence(evidenceDeviceFrom(s25))!,minutesPerDay:{web_browsing:minutes},usableEnergyWh:18.84})).toThrow(RangeError);
  });
  it('only computes days when the entire day has evidence',()=>{
    const partial=customRun(s25,{web_browsing:'300',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    expect(partial.verdict).toBe('insufficient-evidence');
    expect(enduranceUpperBoundDays(partial)).toBeUndefined();
    const full=customRun(s25,{web_browsing:'1440',video_playback:'0',gaming:'0',camera_use:'0'}).endurance!;
    expect(full.unevidencedHours).toBe(0);
    expect(enduranceUpperBoundDays(full)).toBeCloseTo(full.usableEnergyWh/full.accountedEnergyWh!.min,10);
    expect(simpleEnduranceHeadline(full)?.headline).toContain('days per charge');
  });
});
