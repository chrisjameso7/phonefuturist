export const COMMUNITY_CONTEXT_MODEL_VERSION = 'community-context-0.1.0';

export type CommunityContextType =
  | 'device'
  | 'device_variant'
  | 'simulation'
  | 'leak'
  | 'prediction'
  | 'evidence'
  | 'article'
  | 'component';

export type CommunityPostKind =
  | 'discussion'
  | 'claim'
  | 'prediction'
  | 'simulation_share'
  | 'evidence_drop'
  | 'question';

export type CommunityEvidenceStance =
  | 'supports'
  | 'contradicts'
  | 'context'
  | 'uncertain';

export interface CommunityContextRef {
  type: CommunityContextType;
  id: string;
  label?: string;
}

export interface CommunityEvidenceRef {
  sourceId: string;
  stance: CommunityEvidenceStance;
  note?: string;
}

export interface CommunitySimulationSnapshot {
  simulationId: string;
  title?: string;
  engineVersion?: string;
  corpusVersion?: string;
  summary?: Record<string, string | number | boolean>;
}

export interface CommunityPostInput {
  id: string;
  authorId: string;
  kind: CommunityPostKind;
  body: string;
  contexts: CommunityContextRef[];
  evidence?: CommunityEvidenceRef[];
  simulation?: CommunitySimulationSnapshot;
  parentPostId?: string;
  createdAt: string;
}

export interface CommunityPostValidationIssue {
  code:
    | 'EMPTY_BODY'
    | 'MISSING_CONTEXT'
    | 'SIMULATION_REQUIRED'
    | 'PREDICTION_CONTEXT_REQUIRED'
    | 'INVALID_TIMESTAMP';
  message: string;
}

export function validateCommunityPost(
  post: CommunityPostInput,
): CommunityPostValidationIssue[] {
  const issues: CommunityPostValidationIssue[] = [];

  if (!post.body.trim()) {
    issues.push({
      code: 'EMPTY_BODY',
      message: 'Community posts require body content.',
    });
  }

  if (!post.contexts.length) {
    issues.push({
      code: 'MISSING_CONTEXT',
      message:
        'Community posts must attach to at least one device, simulation, leak, prediction, evidence item, article or component.',
    });
  }

  if (post.kind === 'simulation_share' && !post.simulation) {
    issues.push({
      code: 'SIMULATION_REQUIRED',
      message: 'Simulation-share posts require a simulation snapshot.',
    });
  }

  if (
    post.kind === 'prediction' &&
    !post.contexts.some((context) => context.type === 'prediction')
  ) {
    issues.push({
      code: 'PREDICTION_CONTEXT_REQUIRED',
      message: 'Prediction posts require a prediction context reference.',
    });
  }

  if (Number.isNaN(Date.parse(post.createdAt))) {
    issues.push({
      code: 'INVALID_TIMESTAMP',
      message: 'Community post timestamp must be a valid date.',
    });
  }

  return issues;
}

export function communityPostRoute(post: CommunityPostInput): string {
  const primary =
    post.contexts.find((context) =>
      ['device', 'device_variant', 'simulation', 'leak', 'prediction'].includes(
        context.type,
      ),
    ) ?? post.contexts[0];

  if (!primary) return '/community';

  switch (primary.type) {
    case 'device':
    case 'device_variant':
      return `/community/device/${encodeURIComponent(primary.id)}`;
    case 'simulation':
      return `/community/simulation/${encodeURIComponent(primary.id)}`;
    case 'leak':
      return `/community/leak/${encodeURIComponent(primary.id)}`;
    case 'prediction':
      return `/community/prediction/${encodeURIComponent(primary.id)}`;
    case 'component':
      return `/community/component/${encodeURIComponent(primary.id)}`;
    case 'article':
      return `/community/article/${encodeURIComponent(primary.id)}`;
    case 'evidence':
      return `/community/evidence/${encodeURIComponent(primary.id)}`;
  }
}
