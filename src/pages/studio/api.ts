import type { APIRoute } from 'astro';
import { boundedJson, studioError, validUuid } from '../../lib/editorial';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
export const GET:APIRoute=async({locals,url})=>{
 if(!locals.supabase||!locals.user)return json({error:'Sign in to Studio.'},401);
 const id=url.searchParams.get('id');if(id&&!validUuid(id))return json({error:'Invalid article ID.'},400);
 const offset=Number(url.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return json({error:'Invalid page.'},400);
 const {data,error}=await locals.supabase.rpc('studio_read',{p_article:id,p_offset:offset});
 if(error){const result=studioError(error);return json({error:result.message},result.status);}return json({data});
};
export const POST:APIRoute=async({locals,request})=>{
 if(!locals.supabase||!locals.user)return json({error:'Sign in to Studio.'},401);
 let input:Record<string,unknown>;try{input=await boundedJson(request);}catch{return json({error:'Invalid request or article larger than 300 KB.'},400);}
 const {id,version,action,payload}=input;
 if(typeof action!=='string'||!['create','save','submit','approve','request_changes','publish','override_publish','withdraw'].includes(action))return json({error:'Invalid action.'},400);
 if(action!=='create'&&(!validUuid(id)||!Number.isSafeInteger(version)||(version as number)<1))return json({error:'Invalid article or version.'},400);
 const {data,error}=await locals.supabase.rpc('studio_command',{p_article:action==='create'?null:id,p_expected_version:action==='create'?null:version,p_action:action,p_payload:payload??{}});
 if(error){const result=studioError(error);return json({error:result.message},result.status);}return json({data});
};
