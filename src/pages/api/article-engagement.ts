import type {APIRoute} from 'astro';
import {labClient,json,smallJson} from '../../lib/labs/http';
import {validUuid} from '../../lib/editorial';
export const POST:APIRoute=async context=>{
 const client=labClient(context);if(!client)return json({error:'Article reactions are temporarily unavailable.'},503);
 let body;try{body=await smallJson(context.request);}catch{return json({error:'Invalid request.'},400);}
 if(!body||!validUuid(body.article)||!['stats','start','complete','like','unlike'].includes(body.action))return json({error:'Invalid article action.'},400);
 const {data:{user}}=await client.auth.getUser();
 if(['like','unlike'].includes(body.action)&&!user)return json({error:'Sign in to like this article.'},401);
 let visitor=context.cookies.get('pf_reader')?.value;
 if(!visitor||!validUuid(visitor)){visitor=crypto.randomUUID();context.cookies.set('pf_reader',visitor,{path:'/',httpOnly:true,secure:context.url.protocol==='https:',sameSite:'lax',maxAge:60*60*24*365});}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(visitor));const reader=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const {data,error}=await client.rpc('article_engagement',{p_article:body.article,p_action:body.action,p_reader:reader});
 if(error)return json({error:error.code==='42501'?'A verified active account is required.':'This action is not available yet. Finish reading, then try again.'},error.code==='42501'?403:409);
 return json({...data,signedIn:!!user});
};
