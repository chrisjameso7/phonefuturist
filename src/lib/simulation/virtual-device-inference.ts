import { logVirtualFailure, VirtualProviderError } from './virtual-diagnostics';
import { z } from 'zod';
import { virtualParameterSchema, virtualDeviceConfigurationSchema, virtualDeviceSchema,
  VIRTUAL_DEVICE_SCHEMA_VERSION, type VirtualParameter, type VirtualDeviceModel } from './virtual-device';
import { assembleVirtualEvidence, canonical, deepFreeze, virtualEvidenceCatalogSchema,
  sameConditions, type VirtualEvidenceCatalog, type AssembledVirtualEvidence } from './virtual-device-evidence';
import { validateVirtualDevice } from './virtual-device-validator';
import { validateVirtualEngineering } from './virtual-device-sanity';

export const VIRTUAL_DEVICE_PROMPT_VERSION = '1.0.0';
export const virtualDeviceProposalSchema = z.object({
  parameters: z.array(virtualParameterSchema).min(1).max(500),
  limitations: z.array(z.string().trim().min(1).max(2000)).max(99),
}).strict();
export function parseVirtualDeviceProposal(input: unknown) {
  // Providers must return an object. Markdown, repair, coerced numbers and extra authority fields are forbidden.
  return virtualDeviceProposalSchema.safeParse(input);
}
export interface VirtualDeviceProposalRequest {
  configuration: z.infer<typeof virtualDeviceConfigurationSchema>;
  evidence: AssembledVirtualEvidence;
}
export interface VirtualDeviceProvider {
  providerId: string;
  modelId: string;
  propose(request: VirtualDeviceProposalRequest): Promise<unknown>;
}
export type VirtualGenerationResult =
  | { status: 'accepted'; model: VirtualDeviceModel; configuration: VirtualDeviceProposalRequest['configuration']; evidence: AssembledVirtualEvidence; validatorVersion: string }
  | { status: 'rejected'; stage: 'configuration' | 'evidence' | 'provider' | 'parse' | 'provenance' | 'engineering'; issues: string[] };

export type AcceptedVirtualDevice = Extract<VirtualGenerationResult, {status:'accepted'}>;
// A frozen object alone is not evidence of acceptance. No serialized/client object can register here.
const acceptedModels = new WeakSet<object>();
export function isAcceptedVirtualDevice(value: unknown): value is AcceptedVirtualDevice {
  return typeof value === 'object' && value !== null && acceptedModels.has(value);
}

/** Only this allowlisted derivation is performed here; no endurance mathematics or test execution. */
function derivePackEnergy(parameters: VirtualParameter[]): VirtualParameter[] {
  const capacities = parameters.filter(p => p.key === 'battery.capacity' && p.status !== 'unknown');
  const voltages = parameters.filter(p => p.key === 'battery.nominalVoltage' && p.status !== 'unknown');
  // Ambiguous operating points require explicit curation rather than picking a convenient pair.
  if (capacities.length !== 1 || voltages.length !== 1) return parameters;
  const capacity = capacities[0], voltage = voltages[0];
  if (capacity.status === 'unknown' || voltage.status === 'unknown' ||
    capacity.conditions.capacityBasis !== 'pack' || !sameConditions(capacity.conditions, voltage.conditions)) return parameters;
  return parameters.map(parameter => {
    if (parameter.key !== 'battery.energy' || parameter.status !== 'unknown') return parameter;
    const predicted = [capacity, voltage].some(p => p.status === 'predicted' || (p.status === 'derived' && p.lineage === 'predicted'));
    return {
      id: parameter.id, key: parameter.key, status: 'derived', unit: 'Wh',
      range: { min: capacity.range.min * voltage.range.min / 1000, max: capacity.range.max * voltage.range.max / 1000 },
      conditions: capacity.conditions, dependencies: [capacity.id, voltage.id], evidence: [],
      method: 'pack-capacity-times-nominal-voltage', methodVersion: '1.0.0',
      rationale: 'Pack mAh times explicit pack nominal V divided by 1000; interval endpoints preserved.',
      lineage: predicted ? 'predicted' : 'evidence', confidence: 'low',
    };
  });
}

/** Server composition only. Catalog, previous revision, clocks and IDs must never come from request JSON. */
export function createVirtualDeviceInferenceService(dependencies: {
  provider: VirtualDeviceProvider;
  catalog: VirtualEvidenceCatalog;
  now: () => string;
  createId: () => string;
}) {
  const catalog = deepFreeze(virtualEvidenceCatalogSchema.parse(dependencies.catalog));
  return {
    async generate(input: unknown, previous?: VirtualDeviceModel): Promise<VirtualGenerationResult> {
      const rejected = (stage: Extract<VirtualGenerationResult, {status:'rejected'}>['stage'], issues: string[]): VirtualGenerationResult => { logVirtualFailure(stage, `${stage}_rejected`); return { status: 'rejected', stage, issues }; };
      const parsed = virtualDeviceConfigurationSchema.safeParse(input);
      if (!parsed.success) return rejected('configuration', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
      const configuration = deepFreeze(parsed.data);
      let evidence: AssembledVirtualEvidence;
      const parsedParent = previous ? virtualDeviceSchema.safeParse(previous) : undefined;
      if (parsedParent && !parsedParent.success) return rejected('configuration', ['Invalid trusted previous revision.']);
      const parent = parsedParent?.success ? deepFreeze(parsedParent.data) : undefined;
      try {
        evidence = assembleVirtualEvidence(configuration, catalog, dependencies.createId(), dependencies.now());
      } catch { return rejected('evidence', ['Authoritative evidence assembly failed. Review server catalog and clock.']); }
      let output: unknown;
      try { output = await dependencies.provider.propose(deepFreeze({ configuration, evidence })); }
      catch (error) {
        const stage = error instanceof VirtualProviderError && error.code === 'model_json' ? 'parse' : 'provider';
        logVirtualFailure(stage, error instanceof VirtualProviderError ? error.code : 'provider_transport', error instanceof VirtualProviderError ? error.httpStatus : undefined, error instanceof VirtualProviderError ? error.diagnostic : undefined);
        return { status: 'rejected', stage, issues: ['Model proposal unavailable. No model was accepted.'] };
      }
      const proposal = parseVirtualDeviceProposal(output);
      if (!proposal.success) return rejected('parse', proposal.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
      const issues: string[] = [];
      if (proposal.data.parameters.length !== evidence.slots.length) issues.push('Proposal must cover exactly the server parameter slots.');
      for (const parameter of proposal.data.parameters) {
        const slot = evidence.slots.find(s => s.id === parameter.id && s.key === parameter.key);
        if (!slot) { issues.push('Unexpected parameter identity.'); continue; }
        if (slot.fixed) {
          if (canonical(slot.fixed) !== canonical(parameter)) issues.push(`Server-owned parameter changed: ${parameter.id}`);
        } else if (parameter.status !== 'unknown') {
          const assessment = evidence.analogies.find(a => a.parameterId === parameter.id);
          if (parameter.status !== 'predicted' || !assessment || canonical(parameter.conditions) !== canonical(slot.conditions)) issues.push(`Unapproved inference method/conditions: ${parameter.id}`);
          else {
            if (canonical(parameter.range) !== canonical(assessment.allowedRange)) issues.push(`Prediction must preserve the full policy uncertainty envelope: ${parameter.id}`);
            const transfer = evidence.reviewedPolicies.find(p => p.id === assessment.id)?.transfer;
            if (transfer?.assumptions.some(a => !parameter.assumptions.includes(a))) issues.push(`Missing required transfer assumptions: ${parameter.id}`);
          }
        }
      }
      if (issues.length) return rejected('provenance', issues);
      const validation = validateVirtualDevice({
        schemaVersion: VIRTUAL_DEVICE_SCHEMA_VERSION, modelId: parent?.modelId ?? dependencies.createId(),
        revision: parent ? parent.revision + 1 : 1, parentRevision: parent?.revision ?? null,
        configurationId: configuration.id, configurationRevision: configuration.revision, subjectId: configuration.subjectId,
        evidenceSnapshotId: evidence.snapshot.id, createdAt: dependencies.now(),
        generation: { provider: dependencies.provider.providerId, model: dependencies.provider.modelId, promptVersion: VIRTUAL_DEVICE_PROMPT_VERSION },
        parameters: derivePackEnergy(proposal.data.parameters), limitations: [...proposal.data.limitations,
          'AI confidence is not empirical accuracy. User assertions are unverified configuration context, not source evidence. Unknown parameters remain unavailable for virtual tests.'],
      }, { snapshot: evidence.snapshot, analogies: evidence.analogies, configurationId: configuration.id,
        configurationRevision: configuration.revision, subjectId: configuration.subjectId, previous: parent });
      if (!validation.valid) return rejected('provenance', validation.issues);
      const sanity = validateVirtualEngineering(validation.model);
      if (sanity.length) return rejected('engineering', sanity);
      const accepted: AcceptedVirtualDevice = deepFreeze({ status: 'accepted', model: validation.model, configuration, evidence, validatorVersion: validation.validatorVersion });
      acceptedModels.add(accepted);
      return accepted;
    },
  };
}
