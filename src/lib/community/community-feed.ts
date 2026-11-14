import type {
  CommunityContextType,
  CommunityPostInput,
  CommunityPostKind,
} from './community-context';

export interface CommunityFeedFilter {
  contextType?: CommunityContextType;
  contextId?: string;
  kinds?: CommunityPostKind[];
  followingAuthorIds?: string[];
}

export interface RankedCommunityPost {
  post: CommunityPostInput;
  score: number;
  reasons: string[];
}

export interface CommunityPostSignals {
  replies?: number;
  reactions?: number;
  evidenceCount?: number;
  simulationOpens?: number;
  uniqueContributors?: number;
}

export function rankCommunityFeed(
  posts: CommunityPostInput[],
  signalByPostId: Record<string, CommunityPostSignals>,
  filter: CommunityFeedFilter = {},
): RankedCommunityPost[] {
  const now = Date.now();

  return posts
    .filter((post) => {
      if (
        filter.contextType &&
        !post.contexts.some((context) => context.type === filter.contextType)
      ) {
        return false;
      }

      if (
        filter.contextId &&
        !post.contexts.some((context) => context.id === filter.contextId)
      ) {
        return false;
      }

      if (filter.kinds?.length && !filter.kinds.includes(post.kind)) {
        return false;
      }

      return true;
    })
    .map((post) => {
      const signals = signalByPostId[post.id] ?? {};
      const reasons: string[] = [];
      const ageHours = Math.max(
        0,
        (now - Date.parse(post.createdAt)) / (60 * 60 * 1000),
      );
      const recency = 1 / (1 + ageHours / 18);

      let score = recency * 4;

      if (post.evidence?.length) {
        score += Math.min(3, post.evidence.length) * 1.25;
        reasons.push('evidence attached');
      }

      if (post.simulation) {
        score += 1.5;
        reasons.push('interactive simulation attached');
      }

      score += Math.log1p(signals.replies ?? 0) * 0.8;
      score += Math.log1p(signals.reactions ?? 0) * 0.35;
      score += Math.log1p(signals.evidenceCount ?? 0) * 1.1;
      score += Math.log1p(signals.simulationOpens ?? 0) * 0.45;
      score += Math.log1p(signals.uniqueContributors ?? 0) * 0.7;

      if (filter.followingAuthorIds?.includes(post.authorId)) {
        score += 1.25;
        reasons.push('author followed');
      }

      if (post.kind === 'evidence_drop' || post.kind === 'claim') {
        score += 0.6;
      }

      return { post, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
