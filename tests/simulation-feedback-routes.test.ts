import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from 'astro/middleware';
import { POST } from '../src/pages/api/simulator-feedback';
import { GET } from '../src/pages/api/simulator-feedback-admin';

const { serverClient } = vi.hoisted(() => ({ serverClient: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ serverClient }));
const access = { active: true, verified: true, roles: ['admin'], mfa_required: false, aal: 'aal1' };
function context(path: string, body?: unknown) {
  return createContext({ defaultLocale: 'en', request: new Request('https://phonefuturist.test' + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }) });
}
beforeEach(() => vi.clearAllMocks());
describe('beta feedback API boundaries', () => {
  it('stores a validated submission and returns its reference', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    serverClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({ insert }) });
    const response = await POST(context('/api/simulator-feedback', { category: 'broken', message: 'The charging result did not load.', simulatorMode: 'simple', versions: {}, snapshot: { batteryMah: 5100 } }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, reference: expect.any(String) });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: null, status: 'new', simulation_snapshot: { batteryMah: 5100 } }));
  });
  it('rejects invalid submissions before reaching storage', async () => {
    const response = await POST(context('/api/simulator-feedback', { message: '' }));
    expect(response.status).toBe(400); expect(serverClient).not.toHaveBeenCalled();
  });
  it('denies a signed-out reader access to the report list', async () => {
    serverClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    expect((await GET(context('/api/simulator-feedback-admin'))).status).toBe(401);
  });
  it('denies an ordinary account before querying reports', async () => {
    const from = vi.fn();
    serverClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'reader' } } }) }, rpc: async () => ({ data: { ...access, roles: [] }, error: null }), from });
    expect((await GET(context('/api/simulator-feedback-admin'))).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });
  it('returns stored reports to an authorized admin', async () => {
    const reports = [{ id: 'feedback-1', message: 'Charging did not load.' }];
    const limit = vi.fn().mockResolvedValue({ data: reports, error: null });
    serverClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, rpc: async () => ({ data: access, error: null }), from: () => ({ select: () => ({ order: () => ({ limit }) }) }) });
    const response = await GET(context('/api/simulator-feedback-admin'));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true, reports }); expect(limit).toHaveBeenCalledWith(100);
  });
});
