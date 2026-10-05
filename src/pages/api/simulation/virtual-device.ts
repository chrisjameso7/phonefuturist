import { logVirtualFailure } from '../../../lib/simulation/virtual-diagnostics';
import type { APIRoute } from 'astro';
import { virtualDeviceInferenceSettings } from '../../../lib/simulation/inference-settings';
import { createGoogleVirtualDeviceProvider } from '../../../lib/simulation/providers/google-virtual-device-provider';
import { generateVirtualLaunch,virtualLaunchInputSchema } from '../../../lib/simulation/virtual-launch-service';
const recent=new Map<string,number>();
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function boundedBody(request:Request):Promise<unknown>{
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Error('type');
  if(!request.body)throw new Error('body');
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try{while(true){const next=await reader.read();if(next.done)break;length+=next.value.byteLength;if(length>32768){await reader.cancel();throw new Error('size');}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
// Global middleware enforces APP_ORIGIN before this route. No client model/evidence/role fields are accepted.
export const POST:APIRoute=async({request,locals})=>{
  if(!locals.user)return json({error:'Sign in to generate a virtual device.'},401);
  if(!locals.access?.active||!locals.access.verified)return json({error:'A verified, active account is required.'},403);
  let input:unknown;
  try{input=await boundedBody(request);}catch(error){return json({error:'Send a valid device configuration under 32 KB.'},error instanceof Error&&error.message==='size'?413:400);}
  if(!virtualLaunchInputSchema.safeParse(input).success)return json({error:'Check the device inputs and try again.'},400);
  const settings=virtualDeviceInferenceSettings();if(!settings)return json({error:'Virtual device generation is not available yet. Please try again later.',code:'generation_not_configured'},503);
  const now=Date.now();for(const [id,at]of recent)if(now-at>60000)recent.delete(id);
  if(recent.has(locals.user.id)||recent.size>=1000)return json({error:'Please wait a minute before generating another device.'},429);
  recent.set(locals.user.id,now);
  try{
    const result=await generateVirtualLaunch(input,createGoogleVirtualDeviceProvider(settings));
    if(result.status!=='complete')return json({error:'We could not validate a virtual device from the available evidence. Please retry later.'},502);
    return json(result);
  }catch{logVirtualFailure('provider','generation_exception');return json({error:'Virtual device generation is temporarily unavailable. Please retry later.'},502);}
};
