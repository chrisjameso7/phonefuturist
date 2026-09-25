import {describe,it,expect} from 'vitest';
import {DAY_HOURS,INITIAL_EXPERIENCE,INSUFFICIENT_EVIDENCE_MESSAGE,simpleProfile,simpleRuntimeFraming,type UsagePreset} from '../src/lib/simulation/alpha-workspace';
import {runWorkspace,buildProfile,type WorkloadFields} from '../src/lib/simulation/beta-workspace';
import {
  DISPLAY_AREA_ADJUSTMENT,
  IDLE_FRACTION_OF_SCREEN_ON,
  POWER_EVIDENCE_VERSION,
  REFERENCE_DEVICES,
  displayAreaCm2,
  evidenceDeviceFrom,
  resolvePowerEvidence,
  workloadProvenance,
} from '../src/lib/simulation/power-evidence';
import measurements from '../data/calibration/battery/measurements.json';
import devices from '../data/calibration/battery/devices.json';
import type {SimulationInput} from '../src/lib/simulation/types';

const noPower:WorkloadFields={mixed_use:'',web_browsing:'',video_playback:'',gaming:'',camera_use:'',standby:''};

/* A Galaxy S25 Ultra is in the calibration set, so it has a matched reference. */
const s25:SimulationInput={
  name:'Reference-class phone',
  formFactor:'phone',
  displays:{primary:{diagonalInches:6.9,resolutionWidthPx:1440,resolutionHeightPx:3120}},
  battery:{cells:[{capacityMah:4855,nominalVoltageV:3.88}]},
};

function simpleRun(input:SimulationInput,preset:UsagePreset='Typical',custom?:Record<string,string>){
  const experience=custom?
    {...INITIAL_EXPERIENCE,preset:'Custom' as const,custom:{web_browsing:'0',video_playback:'0',gaming:'0',camera_use:'0',...custom}}:
    {...INITIAL_EXPERIENCE,preset};
  const profile=simpleProfile(experience,noPower,evidenceDeviceFrom(input));
  return {profile,run:runWorkspace(input,'',profile)};
}

describe('Power evidence derived from the seed calibration dataset',()=>{
  it('derives screen-on power by dividing published energy by measured runtime',()=>{
    expect(REFERENCE_DEVICES.length).toBe(5);
    for(const reference of REFERENCE_DEVICES){
      const source=measurements.measurements.find(m=>m.id===reference.measurementIds[0]);
      const device=devices.devices.find(d=>d.id===reference.id);
      const energy=reference.energyBasis==='rated'?device!.battery.rated_energy_wh:device!.battery.typical_energy_wh;
      expect(energy).toBe(reference.energyWh);
      expect(source?.value.runtime_seconds).toBe(reference.runtimeSeconds);
      expect(reference.screenOnPowerW).toBeCloseTo(reference.energyWh/(reference.runtimeSeconds/3600),10);
      // Physically plausible whole-device draw for a screen-on phone.
      expect(reference.screenOnPowerW).toBeGreaterThan(0.3);
      expect(reference.screenOnPowerW).toBeLessThan(3);
    }
  });

  it('keeps held-out validation observations out of the power anchor',()=>{
    const heldOut=measurements.measurements.filter(m=>m.dataset_role==='validation');
    expect(heldOut.length).toBeGreaterThan(0);
    const used=new Set(REFERENCE_DEVICES.flatMap(r=>r.measurementIds));
    for(const record of heldOut) expect(used.has(record.id)).toBe(false);
  });

  it('never labels a derived value as measured',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25));
    expect(evidence).toBeDefined();
    expect(evidence!.notes.join(' ')).toContain('not measurements of the simulated device');
    expect(workloadProvenance('web_browsing',evidence!).kind).toBe('calibrated');
    expect(workloadProvenance('gaming',evidence!).kind).toBe('estimated');
    expect(workloadProvenance('standby',evidence!).kind).toBe('estimated');
    expect([evidence!.reference,...[]].every(()=>true)).toBe(true);
  });

  it('names the reference device instead of borrowing its number silently',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    expect(evidence.basis).toBe('matched-reference');
    expect(evidence.reference?.model).toBe('Galaxy S25 Ultra');
    expect(workloadProvenance('web_browsing',evidence).note).toContain('Measured on that reference device, never on the simulated device');
  });

  it('falls back to the whole calibration spread for an unmatched device',()=>{
    const evidence=resolvePowerEvidence({energyWh:3,displayAreaCm2:2})!;
    expect(evidence.basis).toBe('reference-population');
    expect(evidence.reference).toBeUndefined();
    expect(evidence.screenOnPowerW.max).toBeGreaterThan(evidence.screenOnPowerW.min);
  });

  it('adjusts for panel area and clamps the correction',()=>{
    const only=REFERENCE_DEVICES.filter(r=>r.model==='Galaxy S25 Ultra');
    const area=only[0].displayAreaCm2;
    const base=resolvePowerEvidence({energyWh:18.84,displayAreaCm2:area},only)!;
    const bigger=resolvePowerEvidence({energyWh:18.84,displayAreaCm2:area*1.2},only)!;
    const ratio=bigger.screenOnPowerW.min/base.screenOnPowerW.min;
    expect(ratio).toBeCloseTo(1.2,6);
    const absurd=resolvePowerEvidence({energyWh:18.84,displayAreaCm2:area*20},only)!;
    expect(absurd.screenOnPowerW.min/base.screenOnPowerW.min).toBeCloseTo(DISPLAY_AREA_ADJUSTMENT.max,6);
    const unknown=resolvePowerEvidence({energyWh:18.84})!;
    expect(unknown.displayAdjustmentApplied).toBe(false);
  });

  it('applies the documented idle fraction',()=>{
    const evidence=resolvePowerEvidence(evidenceDeviceFrom(s25))!;
    expect(evidence.idlePowerW.min).toBeCloseTo(evidence.screenOnPowerW.min*IDLE_FRACTION_OF_SCREEN_ON,12);
    expect(evidence.assumptions.join(' ')).toContain('assumption rather than evidence');
  });

  it('leaves unknown device facts unknown instead of guessing',()=>{
    expect(displayAreaCm2(undefined,1440,3120)).toBeUndefined();
    expect(displayAreaCm2(6.9,0,3120)).toBeUndefined();
    expect(evidenceDeviceFrom({formFactor:'phone',displays:{primary:{}}})).toEqual({});
  });
});

describe('Simple Mode actually simulates',()=>{
  it.each(['Light','Typical','Heavy'] as const)('resolves a runtime for %s with no user wattage',preset=>{
    const {profile,run}=simpleRun(s25,preset);
    expect(profile.issues).toEqual([]);
    expect(run.battery?.result.status).toBe('resolved');
    const runtime=run.battery?.result.estimate?.runtimeHours;
    expect(runtime?.min).toBeGreaterThan(4);
    expect(runtime?.max).toBeGreaterThan(runtime!.min!);
  });

  it('never asks the user for workload wattage',()=>{
    const {profile}=simpleRun(s25);
    for(const term of profile.terms) expect(Number.isFinite(term.power)).toBe(true);
    expect(profile.workloads.web_browsing?.subsystems.workloadSpecific?.whole_device).toBeTruthy();
  });

  it('feeds the usage profile into the runtime',()=>{
    const light=simpleRun(s25,'Light').run.battery!.result.estimate!.runtimeHours!;
    const typical=simpleRun(s25,'Typical').run.battery!.result.estimate!.runtimeHours!;
    const heavy=simpleRun(s25,'Heavy').run.battery!.result.estimate!.runtimeHours!;
    expect(light.min!).toBeGreaterThan(typical.min!);
    expect(typical.min!).toBeGreaterThan(heavy.min!);
  });

  it('feeds custom usage into the runtime too',()=>{
    const light=simpleRun(s25,'Custom',{web_browsing:'60',video_playback:'30',gaming:'0',camera_use:'10'}).run.battery!.result.estimate!.runtimeHours!;
    const heavy=simpleRun(s25,'Custom',{web_browsing:'300',video_playback:'300',gaming:'120',camera_use:'30'}).run.battery!.result.estimate!.runtimeHours!;
    expect(light.min!).toBeGreaterThan(heavy.min!);
  });

  it('keeps the idle remainder in the mixture',()=>{
    const {profile}=simpleRun(s25,'Typical');
    const standby=profile.terms.find(t=>t.workload==='standby');
    expect(standby?.share).toBeCloseTo(1170/1440,10);
    expect(profile.totalPercent).toBeCloseTo(100,10);
  });

  it('is deterministic for the same configuration and evidence version',()=>{
    expect(simpleRun(s25)).toEqual(simpleRun(s25));
    expect(resolvePowerEvidence(evidenceDeviceFrom(s25))).toEqual(resolvePowerEvidence(evidenceDeviceFrom(s25)));
    expect(POWER_EVIDENCE_VERSION).toBe('battery-calibration-1.0');
  });

  it('scales runtime with the device own battery energy',()=>{
    const small={...s25,battery:{cells:[{capacityMah:4855,nominalVoltageV:3.88}]}};
    const large={...s25,battery:{cells:[{capacityMah:6000,nominalVoltageV:3.88}]}};
    expect(simpleRun(large).run.battery!.result.estimate!.runtimeHours!.min!).toBeGreaterThan(simpleRun(small).run.battery!.result.estimate!.runtimeHours!.min!);
  });

  it('reports provenance for every workload and marks the energy input unknown',()=>{
    const {run}=simpleRun(s25);
    const parameters=run.battery!.result.estimate!.parameters;
    const workloadParameters=parameters.filter(p=>p.parameter.startsWith('workload'));
    expect(workloadParameters.length).toBeGreaterThan(0);
    for(const parameter of workloadParameters){
      expect(parameter.provenanceRecorded).toBe(true);
      expect(['calibrated','estimated','reference']).toContain(parameter.provenance?.kind);
      expect(parameter.provenance?.note).toBeTruthy();
    }
    // User-entered capacity and voltage carry no recorded source, and the
    // receipt must say so rather than imply the model vouched for them.
    const energy=parameters.find(p=>p.parameter.includes('energy'));
    expect(energy?.provenanceRecorded).toBe(false);
    expect(run.battery!.result.confidence).not.toBe('deterministic');
  });
});

describe('Presenting a day profile against a real day',()=>{
  it('expresses a runtime longer than a day as days per charge',()=>{
    const framing=simpleRuntimeFraming({min:74,max:109})!;
    expect(framing).toContain(`whole ${DAY_HOURS}-hour day`);
    expect(framing).toContain('3.1');
    expect(framing).toContain('4.5');
    expect(framing).toContain('optimistic upper bound');
  });

  it('reports a partial day honestly when the pack does not outlast it',()=>{
    const framing=simpleRuntimeFraming({min:6,max:8})!;
    expect(framing).toContain('runs out after about 6–8 h');
    expect(framing).toContain('partway through');
  });

  it('leaves an unknown runtime unknown',()=>{
    expect(simpleRuntimeFraming(undefined)).toBeUndefined();
    expect(simpleRuntimeFraming({min:4})).toBeUndefined();
  });

  it('frames a real Simple Mode run as a day, not as hundreds of hours',()=>{
    const {run}=simpleRun(s25,'Typical');
    const raw=run.battery!.result.estimate!.runtimeHours!;
    expect(raw.min!).toBeGreaterThan(DAY_HOURS);
    const framing=simpleRuntimeFraming(raw)!;
    expect(framing).not.toContain(`${Math.round(raw.min!)} h of battery life`);
    expect(framing).toContain('days of this usage per charge');
  });
});

describe('Genuinely insufficient evidence',()=>{
  it('reports the agreed message instead of inventing watts',()=>{
    const {profile,run}=(()=>{
      const experience={...INITIAL_EXPERIENCE};
      const profile=simpleProfile(experience,noPower,evidenceDeviceFrom(s25),[]);
      return {profile,run:runWorkspace(s25,'',profile)};
    })();
    expect(profile.issues).toContain(INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(INSUFFICIENT_EVIDENCE_MESSAGE).toBe("We don't have enough reference data to simulate this configuration yet.");
    expect(run.battery).toBeUndefined();
  });

  it('does not resolve without usable battery energy',()=>{
    const {run}=simpleRun({...s25,battery:{cells:[{capacityMah:4855}]}});
    expect(run.battery?.result.status).toBe('unresolved');
    expect(run.issues.join(' ')).toContain('Battery energy');
  });
});

describe('Advanced Mode is unchanged',()=>{
  it('still fails closed on missing power and bad shares',()=>{
    const shares={mixed_use:'',web_browsing:'50',video_playback:'45',gaming:'',camera_use:'',standby:''};
    expect(buildProfile(noPower,shares,'percent').issues.join(' ')).toContain('at least one workload');
    expect(buildProfile({...noPower,web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'},shares,'percent').issues.join(' ')).toContain('100%');
  });

  it('still uses explicitly entered power when the user consents',()=>{
    const experience={...INITIAL_EXPERIENCE,useEnteredPower:true};
    const profile=simpleProfile(experience,{...noPower,web_browsing:'2',video_playback:'3',gaming:'8',camera_use:'5',standby:'0.2'},evidenceDeviceFrom(s25));
    expect(runWorkspace(s25,'',profile).battery?.result.status).toBe('resolved');
  });
});
