import { describe, expect, it } from 'vitest';
import { virtualDeviceSchema, virtualDeviceConfigurationSchema, virtualEvidenceSnapshotSchema, virtualParameterSchema, virtualTestRequestSchema, toLegacyParameter, PARAMETER_RULES } from '../src/lib/simulation/virtual-device';
import { validateVirtualDevice, type VirtualDeviceValidationContext } from '../src/lib/simulation/virtual-device-validator';

const conditions = { protocol: 'pack specification', version: '1', workload: 'rated', capacityBasis: 'pack' as const };
function fixture() {
  const model = virtualDeviceSchema.parse({
    schemaVersion: '1.0.0', modelId: 'phone-a', revision: 1, parentRevision: null,
    configurationId: 'config-a', configurationRevision: 1, subjectId: 'unreleased-a',
    evidenceSnapshotId: 'snapshot-1', createdAt: '2026-10-04T12:00:00Z',
    generation: { provider: 'test', model: 'fixture', promptVersion: '1' }, limitations: [],
    parameters: [{ id: 'voltage', key: 'battery.nominalVoltage', unit: 'V', status: 'predicted', range: { min: 3.7, max: 3.9 },
      conditions, evidence: [{ id: 'voltage-reference', revision: 1 }], dependencies: [], confidence: 'low',
      rationale: 'Analogous cell chemistry; exact pack voltage unknown.', assumptions: ['Single-cell pack'], analogyAssessmentId: 'analogy-1', rangeMeaning: 'prediction-envelope' }],
  });
  const context: VirtualDeviceValidationContext = {
    configurationId: 'config-a', configurationRevision: 1, subjectId: 'unreleased-a',
    snapshot: { id: 'snapshot-1', schemaVersion: '1.0.0', createdAt: '2026-10-04T11:00:00Z', records: [{
      id: 'voltage-reference', revision: 1, subjectId: 'released-reference', key: 'battery.nominalVoltage', unit: 'V',
      range: { min: 3.8, max: 3.8 }, status: 'measured', lineage: 'evidence', conditions,
      source: { title: 'Synthetic test fixture, not real evidence', url: 'https://example.com/test', retrievedAt: '2026-10-04T10:00:00Z' },
    }] },
    analogies: [{ id: 'analogy-1', parameterId: 'voltage', key: 'battery.nominalVoltage', sufficient: true,
      rationale: 'Fixture policy decision', allowedRange: { min: 3.6, max: 4 }, maxConfidence: 'low', evidence: [{ id: 'voltage-reference', revision: 1 }] }],
  };
  return { model, context };
}
function direct() {
  const { model, context } = fixture();
  context.snapshot.records[0].subjectId = model.subjectId;
  model.parameters = [virtualParameterSchema.parse({ id: 'voltage', key: 'battery.nominalVoltage', status: 'measured',
    unit: 'V', range: { min: 3.8, max: 3.8 }, conditions, dependencies: [], evidence: [{ id: 'voltage-reference', revision: 1 }] })];
  return { model, context };
}

describe('Virtual Device contracts and authority boundary', () => {
  it('accepts bounded predicted voltage with trusted analogous evidence', () => {
    const {model, context} = fixture(); const before = JSON.stringify({model, context});
    expect(validateVirtualDevice(model, context).valid).toBe(true);
    expect(JSON.stringify({model, context})).toBe(before);
  });
  it.each(['battery','cpu','gpu','thermal','charging'])('accepts a versioned %s test', category => {
    expect(virtualTestRequestSchema.safeParse({modelId:'phone-a',modelRevision:1,category,conditions}).success).toBe(true);
  });
  it('supports explicit unknowns for every launch parameter without fake zeros', () => {
    const {model, context} = fixture();
    model.parameters = Object.keys(PARAMETER_RULES).map((key,i) => virtualParameterSchema.parse({id:`unknown-${i}`,key,status:'unknown',reason:'No usable evidence'}));
    expect(validateVirtualDevice(model,context).valid).toBe(true);
    expect(toLegacyParameter(model.parameters[0])).toBeUndefined();
  });
  it('rejects values on an unknown parameter', () => {
    expect(virtualParameterSchema.safeParse({id:'x',key:'cpu.power',status:'unknown',reason:'Missing',range:{min:1,max:2}}).success).toBe(false);
  });
  it('does not accept provider-supplied source metadata or approval', () => {
    const {model,context}=fixture();
    expect(validateVirtualDevice({...model,analogies:context.analogies},context).valid).toBe(false);
    expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],sourceUrl:'https://example.com/forged'}]},context).valid).toBe(false);
  });
  it.each([{min:4,max:3},{min:0,max:0},{min:NaN,max:4},{min:3,max:Infinity},{min:3.8,max:3.8},{min:3,max:5}])('rejects invalid or unapproved predicted bounds %j', range => {
    const {model,context}=fixture();
    expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],range}]},context).valid).toBe(false);
  });
  it('rejects wrong units', () => {
    const {model,context}=fixture(); expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],unit:'mAh'}]},context).valid).toBe(false);
  });
  it('rejects self-awarded confidence or insufficient analogies', () => {
    const {model,context}=fixture();
    expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],confidence:'high'}]},context).valid).toBe(false);
    context.analogies[0].sufficient=false;
    expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it('rejects evidence outside the frozen snapshot and wrong source revisions', () => {
    for(const evidence of [[{id:'invented',revision:1}],[{id:'voltage-reference',revision:2}]]) {
      const {model,context}=fixture(); expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],evidence}]},context).valid).toBe(false);
    }
  });
  it('accepts direct measurement only when subject, quantity, conditions and status match', () => {
    const {model,context}=direct(); expect(validateVirtualDevice(model,context).valid).toBe(true);
    context.snapshot.records[0].subjectId='other-device'; expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it.each(['status','range','conditions'])('rejects laundering direct %s', field => {
    const {model,context}=direct();
    const changed = field==='status'?{status:'confirmed'}:field==='range'?{range:{min:3.7,max:3.9}}:{conditions:{...conditions,workload:'gaming'}};
    expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],...changed}]},context).valid).toBe(false);
  });
  it('keeps predicted lineage in the legacy adapter', () => {
    const {model}=fixture(); expect(toLegacyParameter(model.parameters[0])).toMatchObject({range:{min:3.7,max:3.9},provenance:{kind:'estimated'}});
  });
  it('requires transitive prediction lineage and caps derived confidence', () => {
    const {model,context}=fixture();
    const derived = {id:'derived',key:'battery.energy',status:'derived',unit:'Wh',range:{min:18,max:20},conditions,evidence:[],dependencies:['voltage'],method:'test',methodVersion:'1',rationale:'Fixture',lineage:'predicted',confidence:'low'};
    model.parameters.push(virtualParameterSchema.parse(derived));
    expect(validateVirtualDevice(model,context).valid).toBe(true);
    for(const change of [{lineage:'evidence'},{confidence:'high'},{dependencies:['unknown']}]) {
      expect(validateVirtualDevice({...model,parameters:[model.parameters[0],{...derived,...change}]},context).valid).toBe(false);
    }
  });
  it('rejects dependency cycles', () => {
    const {model,context}=fixture();
    expect(validateVirtualDevice({...model,parameters:[{...model.parameters[0],dependencies:['voltage']}]},context).valid).toBe(false);
  });
  it('rejects duplicate IDs and operating points', () => {
    const {model,context}=fixture();
    expect(validateVirtualDevice({...model,parameters:[...model.parameters,...model.parameters]},context).valid).toBe(false);
  });
  it('requires append-only revision lineage', () => {
    const {model,context}=fixture(); context.previous=model;
    expect(validateVirtualDevice(model,context).valid).toBe(false);
    expect(validateVirtualDevice({...model,revision:2,parentRevision:1},context).valid).toBe(true);
    expect(validateVirtualDevice({...model,revision:3,parentRevision:1},context).valid).toBe(false);
  });
  it('rejects mismatched configurations, snapshots and backwards timestamps', () => {
    for (const change of [{configurationRevision:2},{subjectId:'other'},{evidenceSnapshotId:'forged'},{createdAt:'2025-01-01T00:00:00Z'}]) {
      const {model,context}=fixture(); expect(validateVirtualDevice({...model,...change},context).valid).toBe(false);
    }
  });
});

function derived(id: string, key: string, unit: string, min: number, max: number, dependencies = ['voltage'], extra = {}) {
  return virtualParameterSchema.parse({ id,key,unit,status:'derived',range:{min,max},conditions:{...conditions,...extra},
    dependencies,evidence:[],method:'fixture',methodVersion:'1',rationale:'Synthetic dependency fixture',lineage:'predicted',confidence:'low' });
}
describe('Domain sanity and immutable results', () => {
  it('freezes accepted revisions without freezing caller data', () => {
    const {model,context}=fixture(); const result=validateVirtualDevice(model,context);
    expect(result.valid).toBe(true);
    if(result.valid) { expect(Object.isFrozen(result.model)).toBe(true); expect(Object.isFrozen(result.model.parameters[0])).toBe(true); }
    expect(Object.isFrozen(model)).toBe(false);
  });
  it('rejects narrowed derived energy and accepts capacity/voltage bounds', () => {
    const {model,context}=fixture();
    model.parameters.push(derived('capacity','battery.capacity','mAh',4900,5100));
    model.parameters.push(derived('energy','battery.energy','Wh',19,19.1,['capacity','voltage']));
    expect(validateVirtualDevice(model,context).valid).toBe(false);
    model.parameters[2]=derived('energy','battery.energy','Wh',18.13,19.89,['capacity','voltage']);
    expect(validateVirtualDevice(model,context).valid).toBe(true);
  });
  it('rejects accepted charge power above the declared peak', () => {
    const {model,context}=fixture();
    model.parameters.push(derived('peak','charging.peakPower','W',20,25));
    model.parameters.push(derived('curve','charging.acceptedPower','W',25,30,['voltage'],{stateOfCharge:0.5}));
    expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it.each([
    ['gpu.frameRate','fps',{},false],
    ['gpu.frameRate','fps',{resolution:{width:1920,height:1080},quality:'high'},true],
    ['thermal.resistance','K/W',{},false],
    ['thermal.resistance','K/W',{temperatureLocation:'junction'},true],
    ['charging.acceptedPower','W',{},false],
    ['charging.acceptedPower','W',{stateOfCharge:0.4},true],
    ['cpu.singleCore','score',{},true],
  ])('validates domain conditions for %s', (key,unit,extra,valid) => {
    const {model,context}=fixture(); model.parameters.push(derived('domain',String(key),String(unit),1,2,['voltage'],extra));
    expect(validateVirtualDevice(model,context).valid).toBe(valid);
  });
  it('rejects unknown dependencies even when other references exist', () => {
    const {model,context}=fixture();
    model.parameters.push(virtualParameterSchema.parse({id:'missing',key:'cpu.power',status:'unknown',reason:'No reference'}));
    model.parameters.push(derived('downstream','battery.energy','Wh',10,20,['missing']));
    expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it('rejects predicted evidence relabeled as measured in trusted context', () => {
    const {model,context}=fixture(); context.snapshot.records[0].lineage='predicted';
    expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it('does not treat a chain of predictions as sufficient analogous evidence', () => {
    const {model,context}=fixture(); context.snapshot.records[0].lineage='predicted'; context.snapshot.records[0].status='derived';
    expect(validateVirtualDevice(model,context).valid).toBe(false);
  });
  it('rejects a legacy artifact as a Virtual Device Model without changing the legacy contract', () => {
    const {context}=fixture(); expect(validateVirtualDevice({kind:'battery',schemaVersion:'0.1.0'},context).valid).toBe(false);
  });
});

it.each(['confirmed','reported'])('accepts matching %s evidence without upgrading its status', status => {
  const {model,context}=direct();
  const candidate={...model,parameters:[{...model.parameters[0],status}]};
  const snapshot={...context.snapshot,records:context.snapshot.records.map(record=>({...record,status}))};
  // Parse the trusted fixture through the same schema used at the authority boundary.
  const parsed=virtualEvidenceSnapshotSchema.parse(snapshot);
  expect(validateVirtualDevice(candidate,{...context,snapshot:parsed}).valid).toBe(true);
});

it('keeps user configuration distinct from verified evidence and validates its quantities', () => {
  const config={id:'config',revision:1,parentRevision:null,subjectId:'phone',name:'Concept',assertions:[{key:'battery.energy',unit:'Wh',range:{min:18,max:20},origin:'user-supplied',evidence:[]}]};
  expect(virtualDeviceConfigurationSchema.safeParse(config).success).toBe(true);
  expect(virtualDeviceConfigurationSchema.safeParse({...config,assertions:[{...config.assertions[0],origin:'measured'}]}).success).toBe(false);
  expect(virtualDeviceConfigurationSchema.safeParse({...config,assertions:[{...config.assertions[0],unit:'mAh'}]}).success).toBe(false);
  expect(virtualDeviceConfigurationSchema.safeParse({...config,revision:2}).success).toBe(false);
});
