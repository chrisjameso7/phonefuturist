import { z } from 'zod';
import {
  PARAMETER_RULES, parameterKeySchema, testConditionsSchema, virtualEvidenceSchema,
  virtualEvidenceSnapshotSchema, type VirtualDeviceConfiguration, type VirtualParameter,
  type AnalogyAssessment, type TestConditions,
} from './virtual-device';

export const VIRTUAL_EVIDENCE_POLICY_VERSION = '1.1.0';
const identifier = z.string().trim().min(1).max(160);
const relationshipSchema = z.object({
  target: identifier, reference: identifier,
  kind: z.enum(['predecessor', 'comparable-soc', 'comparable-device', 'same-brand']),
  rationale: z.string().trim().min(1).max(2000),
}).strict();
/** Only application-owned catalog data may enter this schema. Never parse HTTP input here. */
export const virtualEvidenceCatalogSchema = z.object({
  version: identifier,
  records: z.array(virtualEvidenceSchema).max(1000),
  relationships: z.array(relationshipSchema).max(1000),
  policies: z.array(z.object({
    id: identifier, target: identifier, key: parameterKeySchema, conditions: testConditionsSchema,
    allowedRange: z.object({ min: z.number(), max: z.number() }).strict(),
    rationale: z.string().trim().min(1).max(2000),
    // A reviewed engineering envelope, not a multiplier fitted by the LLM.
    referenceIds: z.array(identifier).min(2).max(100),
    // Explicit server-reviewed transfer: original observations keep their original quantity/conditions.
    transfer: z.object({
      version: identifier, sourceKeys: z.array(parameterKeySchema).min(1).max(17),
      rationale: z.string().trim().min(1).max(2000),
      assumptions: z.array(z.string().trim().min(1).max(2000)).min(1).max(20),
    }).strict().optional(),
  }).strict()).max(500),
}).strict();
export type VirtualEvidenceCatalog = z.infer<typeof virtualEvidenceCatalogSchema>;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function sameConditions(a: TestConditions, b: TestConditions): boolean { return canonical(a) === canonical(b); }
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
export interface VirtualParameterSlot {
  id: string;
  key: keyof typeof PARAMETER_RULES;
  conditions?: TestConditions;
  fixed?: VirtualParameter;
}
/** Creates source metadata exclusively from the server catalog, ignoring client evidence claims. */
export function assembleVirtualEvidence(configuration: VirtualDeviceConfiguration, input: VirtualEvidenceCatalog, snapshotId: string, createdAt: string) {
  const catalog = virtualEvidenceCatalogSchema.parse(input);
  const seen = new Set<string>();
  for (const record of catalog.records) {
    const id = `${record.id}@${record.revision}`;
    const bounds = PARAMETER_RULES[record.key];
    if (!['http:', 'https:'].includes(new URL(record.source.url).protocol) || seen.has(id) || record.unit !== bounds.unit || record.range.min > record.range.max || record.range.min < bounds.min || record.range.max > bounds.max ||
      (record.status !== 'derived' && record.lineage !== 'evidence') || Date.parse(record.source.retrievedAt) > Date.parse(createdAt)) throw new Error('Invalid server evidence catalog.');
    seen.add(id);
  }
  const related = catalog.relationships.filter(r => r.target === configuration.subjectId);
  const subjects = new Set([configuration.subjectId, ...related.map(r => r.reference)]);
  const snapshot = virtualEvidenceSnapshotSchema.parse({ id: snapshotId, schemaVersion: '1.0.0', createdAt,
    records: catalog.records.filter(r => subjects.has(r.subjectId)) });
  const slots: VirtualParameterSlot[] = [];
  const analogies: AnalogyAssessment[] = [];
  const decisions: string[] = [];
  const policies = catalog.policies.filter(p => p.target === configuration.subjectId);
  if (new Set(policies.map(p => p.id)).size !== policies.length) throw new Error('Duplicate server policy identity.');
  for (const key of parameterKeySchema.options) {
    const direct = snapshot.records.filter(r => r.subjectId === configuration.subjectId && r.key === key && r.lineage === 'evidence' && r.status !== 'derived');
    const groups = new Map<string, typeof direct>();
    for (const record of direct) { const k = canonical(record.conditions); groups.set(k, [...(groups.get(k) ?? []), record]); }
    for (const records of groups.values()) {
      const record = records[0];
      if (records.some(r => r.status !== record.status || canonical(r.range) !== canonical(record.range))) throw new Error(`Conflicting direct evidence for ${key}.`);
      // Narrowing is explicit; derived catalog records are analogy inputs, never direct measurements.
      if (record.status === 'derived') continue;
      const id = `${key}:${slots.length}`;
      slots.push({ id, key, conditions: record.conditions, fixed: {
        id, key, status: record.status, unit: record.unit, range: record.range, conditions: record.conditions,
        dependencies: [], evidence: records.map(r => ({ id: r.id, revision: r.revision })),
      } });
    }
    for (const policy of policies.filter(p => p.key === key)) {
      if (slots.some(s => s.key === key && s.conditions && sameConditions(s.conditions, policy.conditions))) continue;
      const bounds = PARAMETER_RULES[key];
      if (policy.allowedRange.min >= policy.allowedRange.max || policy.allowedRange.min < bounds.min || policy.allowedRange.max > bounds.max) throw new Error(`Invalid server analogy range: ${policy.id}`);
      const records = snapshot.records.filter(r => policy.referenceIds.includes(r.id));
      const sufficient = records.length === policy.referenceIds.length && new Set(policy.referenceIds).size === policy.referenceIds.length &&
        new Set(records.map(r => r.subjectId)).size >= 2 && records.every(r =>
          r.subjectId !== configuration.subjectId && r.lineage === 'evidence' &&
          (policy.transfer ? policy.transfer.sourceKeys.includes(r.key) : r.key === key && sameConditions(r.conditions, policy.conditions)) &&
          related.some(link => link.reference === r.subjectId && link.kind !== 'same-brand'));
      decisions.push(`${policy.id}: ${sufficient ? 'sufficient' : 'insufficient'}; ${policy.rationale}`);
      if (!sufficient) continue;
      const id = `${key}:${slots.length}`;
      slots.push({ id, key, conditions: policy.conditions });
      analogies.push({ id: policy.id, parameterId: id, key, sufficient: true, rationale: policy.rationale,
        allowedRange: policy.allowedRange, maxConfidence: 'low', evidence: records.map(r => ({ id: r.id, revision: r.revision })) });
    }
    if (!slots.some(s => s.key === key)) slots.push({ id: `${key}:unknown`, key,
      fixed: { id: `${key}:unknown`, key, status: 'unknown', reason: 'No direct evidence or sufficient application-approved analogy at a defined operating point.' } });
  }
  return deepFreeze({ snapshot, slots, analogies, decisions, relationships: related, reviewedPolicies: policies, snapshotRevision: 1, catalogVersion: catalog.version, policyVersion: VIRTUAL_EVIDENCE_POLICY_VERSION });
}
export type AssembledVirtualEvidence = ReturnType<typeof assembleVirtualEvidence>;
