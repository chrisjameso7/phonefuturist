import { describe, expect, it } from 'vitest';
import {
  communityPostRoute,
  validateCommunityPost,
  type CommunityPostInput,
} from '../src/lib/community/community-context';
import { rankCommunityFeed } from '../src/lib/community/community-feed';

const post: CommunityPostInput = {
  id: 'p1',
  authorId: 'u1',
  kind: 'simulation_share',
  body: 'S27 Ultra at 5700 mAh and 60 W looks more plausible than expected.',
  contexts: [
    { type: 'device', id: 'galaxy-s27-ultra', label: 'Galaxy S27 Ultra' },
    { type: 'simulation', id: 'sim-123' },
  ],
  simulation: {
    simulationId: 'sim-123',
    engineVersion: 'test',
    corpusVersion: 'test-corpus',
    summary: { batteryMah: 5700, chargingW: 60 },
  },
  createdAt: new Date().toISOString(),
};

describe('community context model', () => {
  it('requires posts to be grounded in product context', () => {
    expect(validateCommunityPost(post)).toEqual([]);
    expect(
      validateCommunityPost({ ...post, contexts: [] }).some(
        (issue) => issue.code === 'MISSING_CONTEXT',
      ),
    ).toBe(true);
  });

  it('routes device-linked posts into device communities', () => {
    expect(communityPostRoute(post)).toBe(
      '/community/device/galaxy-s27-ultra',
    );
  });

  it('rewards evidence and simulation-native posts without raw popularity dominating', () => {
    const plain: CommunityPostInput = {
      ...post,
      id: 'p2',
      kind: 'discussion',
      evidence: undefined,
      simulation: undefined,
    };

    const ranked = rankCommunityFeed(
      [
        { ...post, evidence: [{ sourceId: 'src-1', stance: 'supports' }] },
        plain,
      ],
      {
        p1: { reactions: 3, replies: 2 },
        p2: { reactions: 30, replies: 10 },
      },
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBeGreaterThan(0);
  });
});
