import { z } from 'zod';
import type { SafeProviderDiagnostic } from '../virtual-diagnostics';
const envelope = z.object({error:z.object({code:z.number().int().min(100).max(599).optional(),status:z.enum(['INVALID_ARGUMENT','FAILED_PRECONDITION','UNAUTHENTICATED','PERMISSION_DENIED','NOT_FOUND','RESOURCE_EXHAUSTED','INTERNAL','UNAVAILABLE','DEADLINE_EXCEEDED']).optional(),message:z.string().optional()})});
/** Google may echo input, project IDs or credentials in error messages. Never forward free-form text. */
export function summarizeGoogleError(payload:unknown):SafeProviderDiagnostic {
  const parsed=envelope.safeParse(payload);
  if(!parsed.success)return {category:'unknown',message:'Upstream error details unavailable or unrecognized.'};
  const {code,status,message=''}=parsed.data.error;
  const base={...(code===undefined?{}:{upstreamCode:code}),...(status?{upstreamStatus:status}:{})};
  if(status==='RESOURCE_EXHAUSTED')return {...base,category:'quota_or_rate_limit',message:'Google reported exhausted resources or quota/rate limits.'};
  if(status==='UNAVAILABLE')return /overload|high demand|capacity|busy/i.test(message)
    ? {...base,category:'capacity',message:'Google reported model overload or high demand.'}
    : {...base,category:'unavailable',message:'Google reported temporary service unavailability.'};
  if(status==='INVALID_ARGUMENT'||status==='FAILED_PRECONDITION')return {...base,category:'invalid_request',message:'Google rejected request arguments or preconditions.'};
  if(status==='UNAUTHENTICATED')return {...base,category:'authentication',message:'Google rejected authentication.'};
  if(status==='PERMISSION_DENIED')return {...base,category:'permission',message:'Google denied permission.'};
  if(status==='NOT_FOUND')return {...base,category:'not_found',message:'Google could not find the requested resource.'};
  return {...base,category:'unknown',message:'Google returned an upstream error; free-form details withheld.'};
}
export async function readGoogleError(response:Response):Promise<SafeProviderDiagnostic>{
  const reader=response.body?.getReader();if(!reader)return summarizeGoogleError(null);
  const decoder=new TextDecoder();let size=0,text='';
  try {
    while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>16384){await reader.cancel();return summarizeGoogleError(null);}text+=decoder.decode(next.value,{stream:true});}
    text+=decoder.decode();return summarizeGoogleError(JSON.parse(text));
  }catch{return summarizeGoogleError(null);}finally{reader.releaseLock();}
}
