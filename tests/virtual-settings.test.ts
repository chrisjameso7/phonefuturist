import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const secrets = vi.hoisted(() => new Map<string,string>());
vi.mock('astro:env/server', () => ({getSecret:(name:string)=>secrets.get(name)}));
import { virtualDeviceInferenceSettings } from '../src/lib/simulation/inference-settings';
beforeEach(()=>{secrets.clear();vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>vi.restoreAllMocks());
describe('runtime Virtual Device settings',()=>{
  it('reads Gemini 3.8 bindings at call time, including secrets added after module initialization',()=>{
    expect(virtualDeviceInferenceSettings()).toBeNull();
    secrets.set('VIRTUAL_DEVICE_PROVIDER','gemini');secrets.set('VIRTUAL_DEVICE_MODEL','gemini-3.8-flash');secrets.set('GEMINI_API_KEY','test-secret-not-real');
    expect(virtualDeviceInferenceSettings()).toEqual({provider:'gemini',model:'gemini-3.8-flash',apiKey:'test-secret-not-real'});
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('test-secret-not-real');
  });
  it.each(['VIRTUAL_DEVICE_PROVIDER','VIRTUAL_DEVICE_MODEL','GEMINI_API_KEY'])('identifies missing %s without logging values',name=>{
    secrets.set('VIRTUAL_DEVICE_PROVIDER','gemini');secrets.set('VIRTUAL_DEVICE_MODEL','gemini-3.8-flash');secrets.set('GEMINI_API_KEY','sensitive-test');secrets.delete(name);
    expect(virtualDeviceInferenceSettings()).toBeNull();expect(console.warn).toHaveBeenCalled();expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('sensitive-test');
  });
  it('distinguishes a present but unrecognized provider without printing it',()=>{
    secrets.set('VIRTUAL_DEVICE_PROVIDER','private-invalid-value');secrets.set('VIRTUAL_DEVICE_MODEL','model');
    expect(virtualDeviceInferenceSettings()).toBeNull();expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('provider_unsupported'));expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('private-invalid-value');
  });
});
