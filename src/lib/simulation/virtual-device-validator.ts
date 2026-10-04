import {
  PARAMETER_RULES, analogyAssessmentSchema, virtualDeviceSchema, virtualEvidenceSnapshotSchema,
  VIRTUAL_DEVICE_VALIDATOR_VERSION, type VirtualDeviceModel, type VirtualParameter,
  type VirtualEvidenceSnapshot, type AnalogyAssessment,
} from './virtual-device';

export interface VirtualDeviceValidationContext {
  snapshot: VirtualEvidenceSnapshot;
  /** Trusted policy decisions, never provider-supplied approvals. */
  analogies: AnalogyAssessment[];
  configurationId: string;
  configurationRevision: number;
  subjectId: string;
  previous?: VirtualDeviceModel;
}
export type VirtualDeviceValidation =
  | { valid: true; model: VirtualDeviceModel; validatorVersion: string }
  | { valid: false; issues: string[] };
const rank = { low: 0, medium: 1, high: 2 };
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const entries = Object.entries(a);
  return entries.length === Object.keys(b).length && entries.every(([key, value]) =>
    Object.entries(b).some(([otherKey, other]) => key === otherKey && same(value, other)));
};
const inside = (a: { min: number; max: number }, b: { min: number; max: number }) => a.min >= b.min && a.max <= b.max;

/** Validates a candidate against independently supplied, server-owned evidence. No I/O or inference. */
export function validateVirtualDevice(input: unknown, context: VirtualDeviceValidationContext): VirtualDeviceValidation {
  const parsed = virtualDeviceSchema.safeParse(input);
  if (!parsed.success) return { valid: false, issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  const snapshot = virtualEvidenceSnapshotSchema.safeParse(context.snapshot);
  const analogies = analogyAssessmentSchema.array().max(500).safeParse(context.analogies);
  if (!snapshot.success || !analogies.success) return { valid: false, issues: ['Invalid trusted validation context.'] };
  const model = parsed.data;
  const issues: string[] = [];
  const fail = (message: string) => { issues.push(message); };
  if (model.evidenceSnapshotId !== snapshot.data.id) fail('Evidence snapshot mismatch.');
  if (model.configurationId !== context.configurationId || model.configurationRevision !== context.configurationRevision || model.subjectId !== context.subjectId) fail('Configuration identity mismatch.');
  if (Date.parse(model.createdAt) < Date.parse(snapshot.data.createdAt)) fail('Model predates its evidence snapshot.');
  const previous = context.previous;
  if (previous) {
    if (model.modelId !== previous.modelId || model.revision !== previous.revision + 1 || model.parentRevision !== previous.revision) fail('Revision must append to the previous model.');
    if (model.configurationId !== previous.configurationId || model.subjectId !== previous.subjectId || model.configurationRevision < previous.configurationRevision) fail('Revision cannot change identity or rewind configuration.');
    if (Date.parse(model.createdAt) < Date.parse(previous.createdAt)) fail('Revision timestamp cannot move backwards.');
  } else if (model.revision !== 1 || model.parentRevision !== null) fail('Initial revision must be 1 with no parent.');
  const evidence = new Map<string, VirtualEvidenceSnapshot['records'][number]>();
  for (const record of snapshot.data.records) {
    const key = `${record.id}@${record.revision}`;
    if (evidence.has(key)) fail(`Duplicate evidence: ${key}`);
    evidence.set(key, record);
    const rule = PARAMETER_RULES[record.key];
    if (record.unit !== rule.unit || record.range.min > record.range.max || !inside(record.range, rule)) fail(`Invalid evidence quantity: ${key}`);
    if (record.status !== 'derived' && record.lineage === 'predicted') fail(`Evidence status laundering: ${key}`);
  }
  const assessmentIds = new Set<string>();
  for (const assessment of analogies.data) {
    if (assessmentIds.has(assessment.id)) fail(`Duplicate analogy assessment: ${assessment.id}`);
    assessmentIds.add(assessment.id);
    if (assessment.allowedRange.min > assessment.allowedRange.max) fail(`Invalid analogy bounds: ${assessment.id}`);
  }
  const parameters = new Map<string, VirtualParameter>();
  for (const parameter of model.parameters) {
    if (parameters.has(parameter.id)) fail(`Duplicate parameter: ${parameter.id}`);
    parameters.set(parameter.id, parameter);
  }
  const predictedMemo = new Map<string, boolean>();
  function hasPredictedLineage(id: string, visiting = new Set<string>()): boolean {
    if (visiting.has(id)) { fail(`Dependency cycle: ${id}`); return true; }
    if (predictedMemo.has(id)) return predictedMemo.get(id) === true;
    const parameter = parameters.get(id);
    if (!parameter || parameter.status === 'unknown') return false;
    visiting.add(id);
    // Evaluate every dependency even when this node itself is predicted.
    const upstream = parameter.dependencies.map(dep => hasPredictedLineage(dep, new Set(visiting))).some(Boolean);
    const result = parameter.status === 'predicted' || upstream || parameter.evidence.some(ref => evidence.get(`${ref.id}@${ref.revision}`)?.lineage === 'predicted');
    predictedMemo.set(id, result);
    return result;
  }
  const points = new Set<string>();
  for (const parameter of model.parameters) {
    if (parameter.status === 'unknown') continue;
    const rule = PARAMETER_RULES[parameter.key];
    if (parameter.unit !== rule.unit || parameter.range.min > parameter.range.max || !inside(parameter.range, rule)) fail(`Invalid unit/range: ${parameter.id}`);
    const point = JSON.stringify([parameter.key, Object.entries(parameter.conditions).sort()]);
    if (points.has(point)) fail(`Contradictory duplicate operating point: ${parameter.id}`);
    points.add(point);
    if (new Set(parameter.dependencies).size !== parameter.dependencies.length) fail(`Duplicate dependencies: ${parameter.id}`);
    for (const dep of parameter.dependencies) {
      if (!parameters.has(dep) || parameters.get(dep)?.status === 'unknown') fail(`Missing/unknown dependency: ${parameter.id} -> ${dep}`);
    }
    const refs = parameter.evidence.map(ref => evidence.get(`${ref.id}@${ref.revision}`));
    if (refs.some(ref => !ref)) fail(`Evidence outside snapshot: ${parameter.id}`);
    if (new Set(parameter.evidence.map(ref => `${ref.id}@${ref.revision}`)).size !== refs.length) fail(`Duplicate evidence references: ${parameter.id}`);
    if (parameter.status === 'predicted') {
      const assessment = analogies.data.find(a => a.id === parameter.analogyAssessmentId && a.parameterId === parameter.id && a.key === parameter.key);
      if (!assessment || !assessment.sufficient || !inside(parameter.range, assessment.allowedRange) || rank[parameter.confidence] > rank[assessment.maxConfidence]) fail(`Prediction lacks sufficient approved analogy: ${parameter.id}`);
      if (!refs.some(ref => ref?.lineage === 'evidence')) fail(`Prediction requires non-predicted analogous evidence: ${parameter.id}`);
      if (!parameter.evidence.length || parameter.range.min === parameter.range.max) fail(`Prediction requires evidence and a nonzero range: ${parameter.id}`);
      if (assessment && !same([...assessment.evidence].sort((a,b)=>a.id.localeCompare(b.id)), [...parameter.evidence].sort((a,b)=>a.id.localeCompare(b.id)))) fail(`Prediction evidence differs from assessment: ${parameter.id}`);
    } else if (parameter.status === 'derived') {
      if (!parameter.dependencies.length) fail(`Derived parameter requires dependencies: ${parameter.id}`);
      if ((parameter.lineage === 'predicted') !== hasPredictedLineage(parameter.id)) fail(`Derived lineage mismatch: ${parameter.id}`);
      for (const dep of parameter.dependencies) {
        const source = parameters.get(dep);
        if (source && (source.status === 'predicted' || source.status === 'derived') && rank[parameter.confidence] > rank[source.confidence]) fail(`Derived confidence exceeds dependency: ${parameter.id}`);
      }
    } else {
      if (parameter.dependencies.length || !refs.length || refs.some(ref => !ref || ref.subjectId !== model.subjectId || ref.key !== parameter.key || ref.status !== parameter.status || ref.lineage !== 'evidence' || ref.unit !== parameter.unit || !same(ref.range, parameter.range) || !same(ref.conditions, parameter.conditions))) fail(`Direct evidence laundering: ${parameter.id}`);
    }
    hasPredictedLineage(parameter.id);
    if (parameter.key.startsWith('gpu.') && (!parameter.conditions.resolution || !parameter.conditions.quality)) fail(`GPU requires resolution and quality: ${parameter.id}`);
    if (parameter.key.startsWith('thermal.') && !parameter.conditions.temperatureLocation) fail(`Thermal location required: ${parameter.id}`);
    if (parameter.key === 'charging.acceptedPower' && parameter.conditions.stateOfCharge === undefined) fail(`Charging operating point requires state of charge: ${parameter.id}`);
    if (['battery.capacity','battery.nominalVoltage','battery.energy'].includes(parameter.key) && parameter.conditions.capacityBasis !== 'pack') fail(`Battery quantity must use pack basis: ${parameter.id}`);
  }
  const known = model.parameters.filter(p => p.status !== 'unknown');
  for (const p of known) {
    if (p.key === 'battery.energy' && p.status === 'derived') {
      const deps = p.dependencies.map(id => parameters.get(id));
      const capacity = deps.find(d => d?.key === 'battery.capacity');
      const voltage = deps.find(d => d?.key === 'battery.nominalVoltage');
      if (capacity && voltage && capacity.status !== 'unknown' && voltage.status !== 'unknown') {
        const expected = { min: capacity.range.min * voltage.range.min / 1000, max: capacity.range.max * voltage.range.max / 1000 };
        if (p.range.min > expected.min + 1e-9 || p.range.max < expected.max - 1e-9) fail(`Energy range excludes dependency bounds: ${p.id}`);
      }
    }
    if (p.key === 'charging.acceptedPower') {
      const peaks = known.filter(q => q.key === 'charging.peakPower');
      if (peaks.some(peak => p.range.max > peak.range.max)) fail(`Accepted charging power exceeds peak: ${p.id}`);
    }
  }
  if (issues.length) return { valid: false, issues: [...new Set(issues)] };
  function freeze(value: object): void {
    for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
    Object.freeze(value);
  }
  freeze(model);
  return { valid: true, model, validatorVersion: VIRTUAL_DEVICE_VALIDATOR_VERSION };
}
