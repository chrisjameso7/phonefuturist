import { describe, expect, it, vi } from 'vitest';
import { assembleVirtualEvidence, type VirtualEvidenceCatalog } from '../src/lib/simulation/virtual-device-evidence';
import { createVirtualDeviceInferenceService, parseVirtualDeviceProposal, type VirtualDeviceProposalRequest } from '../src/lib/simulation/virtual-device-inference';
import { virtualDeviceConfigurationSchema, virtualParameterSchema, PARAMETER_RULES, type ParameterKey, type VirtualDeviceModel } from '../src/lib/simulation/virtual-device';
import { createBatteryVirtualEvidenceCatalog } from '../src/lib/simulation/virtual-device-battery-evidence';
import { buildVirtualDevicePrompt } from '../src/lib/simulation/virtual-device-prompt';
import { createCloudflareVirtualDeviceProvider } from '../src/lib/simulation/providers/cloudflare-virtual-device-provider';
import { validateVirtualEngineering } from '../src/lib/simulation/virtual-device-sanity';

const now = () => '2026-10-04T12:00:00Z';
const configuration = () => virtualDeviceConfigurationSchema.parse({ id:'config',revision:1,parentRevision:null,subjectId:'future',name:'Synthetic test device',assertions:[] });
function catalog(key: ParameterKey = 'battery.nominalVoltage'): VirtualEvidenceCatalog {
  const conditions = { protocol:'synthetic',version:'1',workload:'test',capacityBasis:'pack' as const, resolution:{width:1080,height:2400},quality:'test',temperatureLocation:'junction' as const,stateOfCharge:0.5,ambientC:20 };
  const bounds = PARAMETER_RULES[key];
  const min = Math.max(bounds.min, 3), max = Math.min(bounds.max, 4);
  // Keys with fractional bounds use their acceptance interval; all data are synthetic.
  const range = min < max ? {min,max} : {min:bounds.min,max:bounds.max};
  return structuredClone({ version:'synthetic-v1', records:['a','b'].map(subjectId => ({
    id:`source-${subjectId}`,revision:1,subjectId,key,unit:bounds.unit,range:{...range},status:'measured',lineage:'evidence',conditions:structuredClone(conditions),
    source:{title:'Synthetic fixture, not real evidence',url:`https://example.com/${subjectId}`,retrievedAt:now()},
  })), relationships:[{target:'future',reference:'a',kind:'predecessor',rationale:'Synthetic predecessor'},
    {target:'future',reference:'b',kind:'comparable-soc',rationale:'Synthetic comparable SoC'}],
    policies:[{id:'policy',target:'future',key,conditions,allowedRange:range,rationale:'Synthetic engineering envelope',referenceIds:['source-a','source-b']}] });
}
function proposal(request: VirtualDeviceProposalRequest) {
  return { parameters:request.evidence.slots.map(slot => {
    if (slot.fixed) return structuredClone(slot.fixed);
    const assessment = request.evidence.analogies.find(a=>a.parameterId===slot.id)!;
    return virtualParameterSchema.parse({id:slot.id,key:slot.key,status:'predicted',unit:PARAMETER_RULES[slot.key].unit,
      conditions:slot.conditions,range:assessment.allowedRange,evidence:assessment.evidence,dependencies:[],
      confidence:'low',rationale:'Synthetic analogy',assumptions:['Synthetic matching platform'],analogyAssessmentId:assessment.id,rangeMeaning:'prediction-envelope'});
  }), limitations:[] };
}
function setup(input=catalog(), mutate?: (value:ReturnType<typeof proposal>)=>unknown) {
  let id=0;
  const propose=vi.fn(async (request:VirtualDeviceProposalRequest)=>mutate ? mutate(proposal(request)) : proposal(request));
  const service=createVirtualDeviceInferenceService({catalog:input,provider:{providerId:'test',modelId:'test',propose},now,createId:()=>`id-${++id}`});
  return {service,propose};
}

describe('authoritative evidence assembly',()=>{
  it.each(Object.keys(PARAMETER_RULES) as ParameterKey[])('supports %s through the same trusted policy',key=>{
    const evidence=assembleVirtualEvidence(configuration(),catalog(key),'snapshot',now());
    expect(evidence.analogies).toHaveLength(1);
    expect(new Set(evidence.slots.map(s=>s.key)).size).toBe(17);
    expect(Object.isFrozen(evidence.snapshot.records)).toBe(true);
  });
  it.each(['same-brand','single-subject','wrong-conditions','predicted-source','missing-source'])('fails analogy sufficiency for %s',mode=>{
    const c=catalog();
    if(mode==='same-brand') c.relationships.forEach(r=>r.kind='same-brand');
    if(mode==='single-subject') c.records[1].subjectId='a';
    if(mode==='wrong-conditions') c.records[1].conditions.workload='other';
    if(mode==='predicted-source') {c.records[1].status='derived';c.records[1].lineage='predicted';}
    if(mode==='missing-source') c.policies[0].referenceIds[1]='fabricated';
    expect(assembleVirtualEvidence(configuration(),c,'snapshot',now()).analogies).toHaveLength(0);
  });
  it('excludes unrelated devices and ignores client evidence references',()=>{
    const c=catalog(); c.relationships=[];
    const config=configuration();config.assertions=[{key:'battery.nominalVoltage',unit:'V',range:{min:3.8,max:3.8},origin:'user-supplied',evidence:[{id:'source-a',revision:1}]}];
    const result=assembleVirtualEvidence(config,c,'snapshot',now());
    expect(result.snapshot.records).toEqual([]);expect(result.analogies).toEqual([]);
  });
  it.each(['unit','bounds','duplicate','future-source','source-protocol'])('rejects malformed trusted catalog: %s',mode=>{
    const c=catalog();
    if(mode==='source-protocol') c.records[0].source.url='javascript:alert(1)';
    if(mode==='unit') c.records[0].unit='mAh';
    if(mode==='bounds') c.records[0].range.min=100;
    if(mode==='duplicate') c.records.push(c.records[0]);
    if(mode==='future-source') c.records[0].source.retrievedAt='2099-01-01T00:00:00Z';
    expect(()=>assembleVirtualEvidence(configuration(),c,'snapshot',now())).toThrow();
  });
  it('copies direct target evidence with the real source revision',async()=>{
    const c=catalog();c.records[0].subjectId='future';c.records[0].revision=3;
    const {service}=setup(c);const result=await service.generate(configuration());
    expect(result.status).toBe('accepted');
    if(result.status==='accepted') expect(result.model.parameters.find(p=>p.key==='battery.nominalVoltage')).toMatchObject({status:'measured',evidence:[{id:'source-a',revision:3}]});
  });
  it('rejects contradictory direct records rather than picking a convenient source',()=>{
    const c=catalog();c.records.forEach(r=>r.subjectId='future');c.records[1].range.max=5;
    expect(()=>assembleVirtualEvidence(configuration(),c,'snapshot',now())).toThrow(/Conflicting/);
  });
  it('reuses legacy derived watts without held-out data or automatic analogy permission',()=>{
    const c=createBatteryVirtualEvidenceCatalog();
    expect(c.records.length).toBeGreaterThan(0);expect(c.policies).toEqual([]);
    expect(c.records.every(r=>r.status==='derived' && r.lineage==='evidence' && r.source.url.startsWith('https://'))).toBe(true);
    expect(c.records.some(r=>r.source.url.includes('tomsguide'))).toBe(false);
  });
});

describe('whole-device service authority and failure handling',()=>{
  it('accepts, freezes and appends a coherent model without mutating previous revisions',async()=>{
    const {service}=setup(); const first=await service.generate(configuration());
    expect(first.status).toBe('accepted'); if(first.status!=='accepted') return;
    expect(first.model.parameters.find(p=>p.status==='predicted')).toMatchObject({range:{min:3,max:4},confidence:'low'});
    expect(Object.isFrozen(first.model.parameters[0])).toBe(true);
    expect(Object.isFrozen(first.configuration.assertions)).toBe(true);
    expect(first.evidence.relationships).toHaveLength(2);
    const serialized=JSON.stringify(first);
    const second=await service.generate(configuration(),first.model);
    expect(second.status).toBe('accepted'); if(second.status==='accepted') expect(second.model).toMatchObject({modelId:first.model.modelId,revision:2,parentRevision:1});
    expect(JSON.stringify(first)).toBe(serialized);
  });
  it('leaves all missing domains unknown, including voltage/energy',async()=>{
    const {service}=setup({version:'empty',records:[],relationships:[],policies:[]});
    const r=await service.generate(configuration());expect(r.status).toBe('accepted');
    if(r.status==='accepted') expect(r.model.parameters.every(p=>p.status==='unknown')).toBe(true);
  });
  it.each(['authority','fake-citation','confidence','precision','measured','conditions','extra','omit','fixed','derived'])('rejects provider laundering: %s',mode=>{
    const {service}=setup(catalog(),p=>{
      const parameter=p.parameters.find(v=>v.status==='predicted')!;
      if(mode==='authority') return {...p,evidenceSnapshot:{authoritative:true}};
      if(mode==='fake-citation' && parameter.status==='predicted') parameter.evidence[0].id='invented';
      if(mode==='confidence' && parameter.status==='predicted') parameter.confidence='high';
      if(mode==='precision' && parameter.status==='predicted') parameter.range={min:3.79,max:3.81};
      if(mode==='measured') p.parameters[0]=virtualParameterSchema.parse({id:parameter.id,key:parameter.key,status:'measured',unit:'V',range:{min:3,max:4},conditions:catalog().policies[0].conditions,evidence:[{id:'source-a',revision:1}],dependencies:[]});
      if(mode==='conditions' && parameter.status==='predicted') parameter.conditions.protocol='invented';
      if(mode==='extra') p.parameters.push({...parameter,id:'other'});
      if(mode==='omit') p.parameters.pop();
      if(mode==='fixed') {const u=p.parameters.find(v=>v.status==='unknown')!; if(u.status==='unknown') u.reason='tampered';}
      if(mode==='derived') p.parameters[0]=virtualParameterSchema.parse({id:parameter.id,key:parameter.key,status:'derived',unit:'V',range:{min:3,max:4},conditions:catalog().policies[0].conditions,evidence:[],dependencies:[parameter.id],method:'magic',methodVersion:'1',rationale:'fake',lineage:'evidence',confidence:'high'});
      return p;
    });
    return expect(service.generate(configuration())).resolves.toMatchObject({status:'rejected'});
  });
  it('rejects client authority before calling the provider',async()=>{
    const {service,propose}=setup();expect(await service.generate({...configuration(),authoritative:true})).toMatchObject({stage:'configuration'});expect(propose).not.toHaveBeenCalled();
  });
  it('contains provider failures without returning raw upstream text',async()=>{
    const {service}=setup(catalog(),()=>{throw new Error('secret upstream body');});
    expect(await service.generate(configuration())).toEqual({status:'rejected',stage:'provider',issues:['Model proposal unavailable. No model was accepted.']});
  });
  it.each(['```json {} ```','{}',null,{parameters:[],limitations:[]}])('strictly rejects malformed proposals',value=>expect(parseVirtualDeviceProposal(value).success).toBe(false));
  it('prompt labels assertions as untrusted and includes the strict schema',()=>{
    const request={configuration:configuration(),evidence:assembleVirtualEvidence(configuration(),catalog(),'snapshot',now())};
    const prompt=buildVirtualDevicePrompt(request);expect(prompt.system).toContain('not measured accuracy');expect(prompt.user).toContain('outputSchema');expect(prompt.system).toContain('No implicit nominal voltage');
  });
  it('uses shared Cloudflare transport with whole-device metadata',async()=>{
    const request={configuration:configuration(),evidence:assembleVirtualEvidence(configuration(),catalog(),'snapshot',now())};
    const fetchMock=vi.fn(async (_input: string | URL | Request,init?:RequestInit)=>{
      const body=JSON.parse(String(init?.body));expect(body.metadata.phonefuturist_schema_version).toBe('1.0.0');expect(body.input[0].content).toContain('Virtual Device Model');
      return new Response(JSON.stringify({output_text:JSON.stringify(proposal(request))}));
    });
    const provider=createCloudflareVirtualDeviceProvider({accountId:'test',apiToken:'synthetic',model:'test',fetch:fetchMock});
    expect(await provider.propose(request)).toEqual(proposal(request));expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function sanityModel(values: Partial<Record<ParameterKey, [number,number]>>): VirtualDeviceModel {
  return {schemaVersion:'1.0.0',modelId:'fixture',revision:1,parentRevision:null,configurationId:'c',configurationRevision:1,subjectId:'fixture',evidenceSnapshotId:'e',createdAt:now(),generation:{provider:'test',model:'test',promptVersion:'1'},limitations:[],
    parameters:Object.entries(values).map(([key,range])=>virtualParameterSchema.parse({id:key,key,status:'measured',unit:'test',range:{min:range[0],max:range[1]},evidence:[],dependencies:[],conditions:catalog().policies[0].conditions}))};
}
describe('cross-domain necessary engineering checks',()=>{
  it.each([
    {'battery.capacity':[5000,5000],'battery.nominalVoltage':[3.8,3.8],'battery.energy':[30,35]},
    {'battery.averagePower':[2,3],'cpu.power':[4,5]},
    {'battery.averagePower':[4,5],'cpu.power':[3,4],'gpu.power':[3,4]},
    {'cpu.singleCore':[2000,3000],'cpu.multiCore':[1000,1500]},
    {'charging.peakPower':[20,20],'charging.efficiency':[0.5,0.6],'charging.acceptedPower':[15,16]},
    {'thermal.resistance':[10,12],'thermal.sustainedPower':[10,12],'thermal.throttleTemperature':[40,50]},
  ] satisfies Partial<Record<ParameterKey,[number,number]>>[])('rejects inconsistent ranges %j',values=>expect(validateVirtualEngineering(sanityModel(values)).length).toBeGreaterThan(0));
  it('does not compare power or scores across different protocols',()=>{
    const model=sanityModel({'battery.averagePower':[2,3],'cpu.power':[4,5]});const p=model.parameters[1];if(p.status!=='unknown')p.conditions.protocol='different';
    expect(validateVirtualEngineering(model)).toEqual([]);
  });
  it('accepts overlapping physical envelopes',()=>expect(validateVirtualEngineering(sanityModel({'battery.capacity':[5000,5000],'battery.nominalVoltage':[3.8,4],'battery.energy':[19,20]}))).toEqual([]));
});

function combine(keys: ParameterKey[]): VirtualEvidenceCatalog {
  const result: VirtualEvidenceCatalog={version:'combined-test',records:[],relationships:catalog().relationships,policies:[]};
  for(const key of keys) {
    const part=catalog(key);
    part.records.forEach(r=>r.id=`${key}-${r.id}`);
    part.policies.forEach(p=>{p.id=`${key}-policy`;p.referenceIds=p.referenceIds.map(id=>`${key}-${id}`);});
    result.records.push(...part.records);result.policies.push(...part.policies);
  }
  return result;
}
describe('coherent generation across categories and derived lineage',()=>{
  it('generates all five domains in a single provider invocation',async()=>{
    const {service,propose}=setup(combine(['battery.energy','cpu.singleCore','gpu.frameRate','thermal.resistance','charging.peakPower']));
    const result=await service.generate(configuration());expect(result.status).toBe('accepted');expect(propose).toHaveBeenCalledTimes(1);
    if(result.status==='accepted') expect(new Set(result.model.parameters.filter(p=>p.status==='predicted').map(p=>p.key.split('.')[0])).size).toBe(5);
  });
  it('rejects engineering contradictions after the contract/provenance checks pass',async()=>{
    const c=combine(['battery.averagePower','cpu.power']);
    c.policies.find(p=>p.key==='cpu.power')!.allowedRange={min:8,max:10};
    const {service}=setup(c);expect(await service.generate(configuration())).toMatchObject({status:'rejected',stage:'engineering'});
  });
  it('derives energy only from explicit compatible capacity and voltage, preserving prediction lineage',async()=>{
    const c=combine(['battery.capacity','battery.nominalVoltage']);
    c.policies.find(p=>p.key==='battery.capacity')!.allowedRange={min:4900,max:5100};
    const {service}=setup(c);const r=await service.generate(configuration());
    expect(r.status).toBe('accepted');
    if(r.status==='accepted') expect(r.model.parameters.find(p=>p.key==='battery.energy')).toMatchObject({status:'derived',lineage:'predicted',range:{min:14.7,max:20.4},confidence:'low',method:'pack-capacity-times-nominal-voltage'});
  });
  it('does not derive energy from capacity alone',async()=>{
    const {service}=setup(catalog('battery.capacity'));const r=await service.generate(configuration());
    expect(r.status).toBe('accepted');if(r.status==='accepted')expect(r.model.parameters.find(p=>p.key==='battery.energy')?.status).toBe('unknown');
  });
  it('does not derive energy across mismatched pack conditions',async()=>{
    const c=combine(['battery.capacity','battery.nominalVoltage']);
    c.records.filter(r=>r.key==='battery.nominalVoltage').forEach(r=>r.conditions.workload='other');
    c.policies.find(p=>p.key==='battery.nominalVoltage')!.conditions.workload='other';
    const {service}=setup(c);const r=await service.generate(configuration());expect(r.status).toBe('accepted');
    if(r.status==='accepted')expect(r.model.parameters.find(p=>p.key==='battery.energy')?.status).toBe('unknown');
  });
  it('takes an isolated catalog copy before an async provider call',async()=>{
    const c=catalog();const {service}=setup(c);c.policies[0].allowedRange={min:8,max:9};
    const r=await service.generate(configuration());if(r.status==='accepted')expect(r.model.parameters.find(p=>p.status==='predicted')).toMatchObject({range:{min:3,max:4}});else throw new Error('Expected accepted');
  });
  it('returns an evidence-stage failure for a corrupt catalog',async()=>{
    const c=catalog();c.records[0].range.min=10;
    const {service,propose}=setup(c);expect(await service.generate(configuration())).toMatchObject({stage:'evidence'});expect(propose).not.toHaveBeenCalled();
  });
  it('does not leak raw HTTP error bodies through the service',async()=>{
    const provider=createCloudflareVirtualDeviceProvider({accountId:'test',apiToken:'synthetic',model:'test',fetch:async()=>new Response('sensitive diagnostic',{status:500})});
    const service=createVirtualDeviceInferenceService({catalog:catalog(),provider,now,createId:()=>crypto.randomUUID()});
    const r=await service.generate(configuration());expect(r).toMatchObject({stage:'provider'});expect(JSON.stringify(r)).not.toContain('sensitive');
  });
  it('rejects fenced model output instead of repairing it',async()=>{
    const provider=createCloudflareVirtualDeviceProvider({accountId:'test',apiToken:'synthetic',model:'test',fetch:async()=>new Response(JSON.stringify({output_text:'```json {} ```'}))});
    await expect(provider.propose({configuration:configuration(),evidence:assembleVirtualEvidence(configuration(),catalog(),'e',now())})).rejects.toThrow(/malformed JSON/);
  });
});
