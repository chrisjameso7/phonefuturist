import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelUnfinishedTotp, mfaError } from '../src/lib/mfa';
it('cancels only a caller-owned unfinished TOTP; never verified, another type or an unknown ID',async()=>{
  const unenroll=vi.fn().mockResolvedValue({error:null});
  const listFactors=vi.fn().mockResolvedValue({data:{all:[
    {id:'pending',factor_type:'totp',status:'unverified'},
    {id:'verified',factor_type:'totp',status:'verified'},
    {id:'phone',factor_type:'phone',status:'unverified'},
  ]},error:null});
  const client={auth:{mfa:{listFactors,unenroll}}} as unknown as SupabaseClient;
  for(const id of ['verified','phone','someone-else']) expect((await cancelUnfinishedTotp(client,id)).error).toBeTruthy();
  expect(unenroll).not.toHaveBeenCalled();
  expect((await cancelUnfinishedTotp(client,'pending')).error).toBeNull();
  expect(unenroll).toHaveBeenCalledWith({factorId:'pending'});
  listFactors.mockResolvedValue({data:null,error:{code:'network_error'}});
  expect((await cancelUnfinishedTotp(client,'pending')).error).toBeTruthy();
  expect(unenroll).toHaveBeenCalledTimes(1);
});
it('reports error code without logging provider message or secrets',()=>{
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const error={code:'mfa_factor_name_conflict',status:422,message:'secret token'};
  expect(mfaError('enroll',error)).toContain('mfa_factor_name_conflict');
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret token');
  log.mockRestore();
});
