import { z } from 'zod';

export const VIRTUAL_DEVICE_SCHEMA_VERSION = '1.0.0' as const;
export const VIRTUAL_DEVICE_VALIDATOR_VERSION = '1.0.0' as const;

// Bounds are acceptance limits for smartphone scenarios, not calibrated predictions.
export const PARAMETER_RULES = {
  'battery.capacity': { unit: 'mAh', min: 100, max: 30000 },
  'battery.nominalVoltage': { unit: 'V', min: 2, max: 20 },
  'battery.energy': { unit: 'Wh', min: 0.2, max: 200 },
  'battery.usableFraction': { unit: 'fraction', min: 0.01, max: 1 },
  'battery.averagePower': { unit: 'W', min: 0.001, max: 100 },
  'cpu.singleCore': { unit: 'score', min: 1, max: 1000000 },
  'cpu.multiCore': { unit: 'score', min: 1, max: 1000000 },
  'cpu.power': { unit: 'W', min: 0.001, max: 100 },
  'gpu.frameRate': { unit: 'fps', min: 0.01, max: 2000 },
  'gpu.power': { unit: 'W', min: 0.001, max: 100 },
  'thermal.resistance': { unit: 'K/W', min: 0.001, max: 1000 },
  'thermal.capacitance': { unit: 'J/K', min: 0.001, max: 100000 },
  'thermal.throttleTemperature': { unit: 'degC', min: -20, max: 150 },
  'thermal.sustainedPower': { unit: 'W', min: 0.001, max: 100 },
  'charging.peakPower': { unit: 'W', min: 0.01, max: 500 },
  'charging.efficiency': { unit: 'fraction', min: 0.01, max: 1 },
  'charging.acceptedPower': { unit: 'W', min: 0.001, max: 500 },
} as const;
export type ParameterKey = keyof typeof PARAMETER_RULES;
const text = z.string().trim().min(1).max(2000);
const id = z.string().trim().min(1).max(160);
export const parameterKeySchema = z.enum(Object.keys(PARAMETER_RULES) as [ParameterKey, ...ParameterKey[]]);
const rangeSchema = z.object({ min: z.number(), max: z.number() }).strict();
export const testConditionsSchema = z.object({
  protocol: text, version: text,
  workload: text, ambientC: z.number().min(-50).max(100).optional(),
  brightnessNits: z.number().positive().max(10000).optional(),
  refreshHz: z.number().positive().max(1000).optional(),
  resolution: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict().optional(),
  quality: text.optional(), durationSeconds: z.number().positive().max(604800).optional(),
  network: z.enum(['wifi', 'cellular', 'mixed', 'offline']).optional(),
  temperatureLocation: z.enum(['junction', 'surface', 'battery']).optional(),
  stateOfCharge: z.number().min(0).max(1).optional(),
  capacityBasis: z.enum(['pack', 'cell']).optional(),
}).strict();
export type TestConditions = z.infer<typeof testConditionsSchema>;
const evidenceRef = z.object({ id, revision: z.number().int().positive() }).strict();
const known = {
  id, key: parameterKeySchema, unit: text, conditions: testConditionsSchema,
  evidence: z.array(evidenceRef).max(100), dependencies: z.array(id).max(100),
};
const prediction = {
  range: rangeSchema,
  confidence: z.enum(['low', 'medium', 'high']),
  rationale: text, assumptions: z.array(text).min(1).max(100),
  analogyAssessmentId: id,
  rangeMeaning: z.literal('prediction-envelope'),
};
export const virtualParameterSchema = z.discriminatedUnion('status', [
  z.object({ id, key: parameterKeySchema, status: z.literal('unknown'), reason: text }).strict(),
  ...(['confirmed', 'measured', 'reported'] as const).map(status => z.object({
    ...known, status: z.literal(status), range: rangeSchema,
  }).strict()),
  z.object({ ...known, status: z.literal('predicted'), ...prediction }).strict(),
  z.object({ ...known, status: z.literal('derived'), range: rangeSchema,
    method: text, methodVersion: id, rationale: text,
    lineage: z.enum(['evidence', 'predicted']),
    confidence: z.enum(['low', 'medium', 'high']),
  }).strict(),
]);
export type VirtualParameter = z.infer<typeof virtualParameterSchema>;
export type InformationStatus = VirtualParameter['status'];

// Server-owned source records; these are never accepted from provider output.
export const virtualEvidenceSchema = z.object({
  id, revision: z.number().int().positive(), subjectId: id,
  key: parameterKeySchema, unit: text, range: rangeSchema,
  status: z.enum(['confirmed', 'measured', 'reported', 'derived']),
  lineage: z.enum(['evidence', 'predicted']),
  source: z.object({ title: text, url: z.url(), retrievedAt: z.iso.datetime() }).strict(),
  conditions: testConditionsSchema,
}).strict();
export const virtualEvidenceSnapshotSchema = z.object({
  id, schemaVersion: z.literal(VIRTUAL_DEVICE_SCHEMA_VERSION), createdAt: z.iso.datetime(),
  records: z.array(virtualEvidenceSchema).max(1000),
}).strict();
export type VirtualEvidenceSnapshot = z.infer<typeof virtualEvidenceSnapshotSchema>;
export const analogyAssessmentSchema = z.object({
  id, parameterId: id, key: parameterKeySchema,
  evidence: z.array(evidenceRef).min(1).max(100),
  sufficient: z.boolean(), rationale: text,
  allowedRange: rangeSchema, maxConfidence: z.enum(['low', 'medium', 'high']),
}).strict();
export type AnalogyAssessment = z.infer<typeof analogyAssessmentSchema>;

export const virtualDeviceSchema = z.object({
  schemaVersion: z.literal(VIRTUAL_DEVICE_SCHEMA_VERSION),
  modelId: id, revision: z.number().int().positive(), parentRevision: z.number().int().positive().nullable(),
  configurationId: id, configurationRevision: z.number().int().positive(), subjectId: id,
  evidenceSnapshotId: id, createdAt: z.iso.datetime(),
  generation: z.object({ provider: id, model: id, promptVersion: id }).strict(),
  // Repeated keys permit multiple operating points under distinct test conditions.
  parameters: z.array(virtualParameterSchema).min(1).max(500),
  limitations: z.array(text).max(100),
}).strict();
export type VirtualDeviceModel = z.infer<typeof virtualDeviceSchema>;
export type VirtualTestCategory = 'battery' | 'cpu' | 'gpu' | 'thermal' | 'charging';
export const virtualTestRequestSchema = z.object({
  modelId: id, modelRevision: z.number().int().positive(),
  category: z.enum(['battery', 'cpu', 'gpu', 'thermal', 'charging']),
  conditions: testConditionsSchema,
}).strict();
export type VirtualTestRequest = z.infer<typeof virtualTestRequestSchema>;

/** Old modules accept a point OR range. Preserve predicted provenance on adaptation. */
export function toLegacyParameter(parameter: VirtualParameter): import('./modules/modeling').ModelParameter | undefined {
  if (parameter.status === 'unknown') return undefined;
  const predicted = parameter.status === 'predicted' || (parameter.status === 'derived' && parameter.lineage === 'predicted');
  return {
    range: { ...parameter.range },
    provenance: {
      kind: predicted ? 'estimated' : parameter.status === 'measured' ? 'measured' : parameter.status === 'reported' ? 'reported' : 'modeled',
      note: `Virtual parameter ${parameter.id}; status ${parameter.status}; dependencies ${parameter.dependencies.join(', ')}; evidence ${parameter.evidence.map(ref => `${ref.id}@${ref.revision}`).join(', ')}.`,
    },
  };
}

/** User input is an assertion; evidence references do not promote its status. */
export const virtualDeviceConfigurationSchema = z.object({
  id, revision: z.number().int().positive(), parentRevision: z.number().int().positive().nullable(),
  subjectId: id, name: text,
  deviceContext: z.object({
    origin: z.literal('user-supplied'), displayInches: z.number().positive().max(20),
    resolution: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    refreshHz: z.number().positive().max(1000), chipset: text, cooling: text, software: text,
  }).strict().optional(),
  assertions: z.array(z.object({
    key: parameterKeySchema, unit: text, range: rangeSchema,
    origin: z.literal('user-supplied'), evidence: z.array(evidenceRef).max(100),
  }).strict()).max(500),
}).strict().superRefine((configuration, context) => {
  if (configuration.parentRevision !== (configuration.revision === 1 ? null : configuration.revision - 1)) {
    context.addIssue({ code: 'custom', message: 'Configuration revisions must be sequential.', path: ['parentRevision'] });
  }
  configuration.assertions.forEach((assertion, index) => {
    const rule = PARAMETER_RULES[assertion.key];
    if (assertion.unit !== rule.unit || assertion.range.min > assertion.range.max || assertion.range.min < rule.min || assertion.range.max > rule.max) {
      context.addIssue({ code: 'custom', message: 'Invalid assertion units or bounds.', path: ['assertions', index] });
    }
  });
});
export type VirtualDeviceConfiguration = z.infer<typeof virtualDeviceConfigurationSchema>;
