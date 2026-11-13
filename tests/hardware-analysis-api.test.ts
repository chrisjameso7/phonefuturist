import { beforeEach, it, expect, vi } from 'vitest';
import { DEFAULT_PARAMETERS } from '../src/lib/valuation/types';
import { baselineValuation } from '../src/lib/valuation/baseline';
const runtime = vi.hoisted(() => ({ AI_VALUATION_ENABLED: 'true', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_AI_API_TOKEN: 'fixture-token', VIRTUAL_DEVICE_MODEL: 'fixture-model', AI_VALUATION_LIMITER: { limit: vi.fn() } }));
vi.mock('cloudflare:workers', () => ({ env: runtime }));
vi.mock('../src/lib/supabase', () => ({ settings: vi.fn(), serverClient: vi.fn() }));
import { POST } from '../src/pages/api/hardware-analysis';
const fetcher = vi.fn();
function context(parameters: unknown = DEFAULT_PARAMETERS, analyze = true, auth = true) { return { request: new Request('https://phonefuturist.com/api/hardware-analysis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'bom', parameters, analyze }) }), locals: { user: auth ? { id: 'fixture-user' } : null, access: auth ? { active: true, verified: true } : null } } as any; }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetcher); runtime.AI_VALUATION_LIMITER.limit.mockResolvedValue({ success: true }); fetcher.mockImplementation(async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(baselineValuation(DEFAULT_PARAMETERS)) } }] }))); });
it('serves public baseline without spending on inference', async () => { const response = await POST(context(undefined, true, false)), body = await response.json(); expect(response.status).toBe(200); expect(body.method).toBe('baseline'); expect(fetcher).not.toHaveBeenCalled(); expect(runtime.AI_VALUATION_LIMITER.limit).not.toHaveBeenCalled(); });
it('uses inference only on explicit verified requests and configured rate allowance', async () => { expect((await (await POST(context())).json()).method).toBe('ai'); expect(fetcher).toHaveBeenCalledTimes(1); expect(runtime.AI_VALUATION_LIMITER.limit).toHaveBeenCalledWith({ key: 'fixture-user' }); fetcher.mockClear(); await POST(context(undefined, false)); expect(fetcher).not.toHaveBeenCalled(); runtime.AI_VALUATION_LIMITER.limit.mockResolvedValue({ success: false }); expect((await (await POST(context())).json()).method).toBe('baseline'); expect(fetcher).not.toHaveBeenCalled(); });
it('rejects malformed and oversized requests before auth billing or inference', async () => { expect((await POST(context({ ...DEFAULT_PARAMETERS, retailMultiplier: Infinity }))).status).toBe(400); const ctx = context(); ctx.request = new Request('https://phonefuturist.com/api/hardware-analysis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ padding: 'x'.repeat(9000) }) }); expect((await POST(ctx)).status).toBe(400); expect(fetcher).not.toHaveBeenCalled(); });
it('fails safely on limiter failure without sending provider credentials to the browser', async () => { runtime.AI_VALUATION_LIMITER.limit.mockRejectedValue(new Error('private')); const response = await POST(context()), text = await response.text(); expect(response.status).toBe(200); expect(text).not.toContain('fixture-token'); expect(text).not.toContain('private'); expect(fetcher).not.toHaveBeenCalled(); });

it('connects anonymous Simple battery requests without enabling paid inference', async () => {
 const ctx=context(undefined,true,false);
 ctx.request=new Request('https://phonefuturist.com/api/hardware-analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'simple-battery',analyze:true,parameters:{input:{batteryMah:5500,displayDiagonalInches:6.8,refreshRateHz:120,customResolutionWidthPx:1440,customResolutionHeightPx:3200},usage:'Typical',software:'standard'}})});
 const response=await POST(ctx), result=await response.json();
 expect(response.status).toBe(200); expect(result.designation).toBe('Simulated'); expect(result.runtimeHours).toBeGreaterThan(0); expect(fetcher).not.toHaveBeenCalled();
});
