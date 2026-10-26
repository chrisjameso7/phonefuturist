import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('astro:middleware', () => ({ defineMiddleware: (handler: unknown) => handler }));
vi.mock('../src/lib/supabase', () => ({ settings: () => ({origin: 'https://example.test'}), serverClient: () => ({auth: {getUser: mocks.getUser}, rpc: mocks.rpc}) }));
import { onRequest } from '../src/middleware';
beforeEach(() => vi.clearAllMocks());
function context() {
  return { url: new URL('https://example.test/account'), request: new Request('https://example.test/account', {headers:{cookie:'sb-fixture-auth-token=fixture'}}), cookies: {}, locals: {}, redirect: (url: string, status: number) => new Response(null, { status, headers: {location:url} }) };
}
it('starts both checks without waiting for the first network response', async () => {
  let finish!: (value: unknown) => void;
  mocks.getUser.mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  mocks.rpc.mockResolvedValue({data: {active:true, roles:[], mfa_required:false}, error:null});
  const ctx = context();
  const pending = onRequest(ctx as never, async () => new Response('account'));
  expect(mocks.getUser).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith('foundation_access');
  finish({data:{user:{id:'verified'}}, error:null});
  const response = await pending;
  if (!(response instanceof Response)) throw new Error('Middleware did not return a response');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('rejects unverified identity even if the parallel role response claims admin', async () => {
  mocks.getUser.mockResolvedValue({data:{user:null}, error:new Error('invalid session')});
  mocks.rpc.mockResolvedValue({data:{active:true, roles:['admin'], verified:true}, error:null});
  const next = vi.fn(async () => new Response('private'));
  const response = await onRequest(context() as never, next);
  if (!(response instanceof Response)) throw new Error('Middleware did not return a response');
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toContain('/login?');
  expect(next).not.toHaveBeenCalled();
});
it('fails closed if role verification fails for a verified identity', async () => {
  mocks.getUser.mockResolvedValue({data:{user:{id:'verified'}}, error:null});
  mocks.rpc.mockResolvedValue({data:null, error:new Error('unavailable')});
  const response = await onRequest(context() as never, async () => new Response('private'));
  if (!(response instanceof Response)) throw new Error('Middleware did not return a response');
  expect(response.status).toBe(503);
});
