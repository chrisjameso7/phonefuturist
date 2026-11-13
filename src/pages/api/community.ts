import {sharedConfiguration} from '../../lib/community/simulation';
import type {APIRoute} from 'astro';
import {labClient,json} from '../../lib/labs/http';
import {communityDesign,communityJson} from '../../lib/community/build';
import {validUuid} from '../../lib/editorial';
export const GET:APIRoute=async context=>{
 const client=labClient(context);if(!client)return json({error:'Community is temporarily unavailable.'},503);
 const {data:{user}}=await client.auth.getUser();const kind=context.url.searchParams.get('kind')??'feed';
 if(kind==='people'){
  let ids=(context.url.searchParams.get('ids')??'').split(',').filter(validUuid).slice(0,50);
  if(!ids.length){const {data,error}=await client.from('creator_profiles').select('user_id').in('verification_badge',['gold','green']).order('verification_badge').limit(12);if(error)return json({error:'Suggestions are unavailable.'},503);ids=(data??[]).map(c=>c.user_id).filter(id=>id!==user?.id);}
  const {data,error}=await client.rpc('community_people',{p_ids:ids});return error?json({error:'Creators are temporarily unavailable.'},503):json({people:data??[],viewer:user?.id??null});
 }
 if(kind==='builds'){
  if(!user)return json({builds:[]});const {data,error}=await client.from('simulations').select('id,name,device_key,visibility').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(50);
  return error?json({error:'Builds could not be loaded.'},503):json({builds:data??[]});
 }
 if(kind==='design'){
  const id=context.url.searchParams.get('id');if(!validUuid(id))return json({error:'Invalid build.'},400);
  const {data,error}=await client.from('simulations').select('id,state,visibility,owner_id,forked_from').eq('id',id).maybeSingle();
  if(error||!data||(data.visibility!=='public'&&data.owner_id!==user?.id))return json({error:'Design unavailable.'},404);
  try{return json({design:communityDesign(data.state?.community_design),forkedFrom:data.forked_from??(data.visibility==='public'?data.id:null)});}catch{return json({error:'This saved build has no editable 3D design.'},400);}
 }
 if(kind==='replies'){
  const id=context.url.searchParams.get('post');if(!validUuid(id))return json({error:'Invalid post.'},400);
  const {data,error}=await client.from('community_replies').select('id,author_id,body,created_at').eq('post_id',id).order('created_at',{ascending:false}).limit(30);
  if(error)return json({error:'Replies could not be loaded.'},503);
  const {data:people,error:peopleError}=await client.rpc('community_people',{p_ids:[...new Set((data??[]).map(r=>r.author_id))]});
  if(peopleError)return json({error:'Reply authors could not be loaded.'},503);
  return json({replies:(data??[]).reverse(),people:people??[]});
 }
 if(kind!=='feed')return json({error:'Unknown community request.'},400);
 const before=context.url.searchParams.get('before'),id=context.url.searchParams.get('cursor');
 if(before&&(!Number.isFinite(Date.parse(before))||!validUuid(id)))return json({error:'Invalid feed cursor.'},400);
 const {data,error}=await client.rpc('community_feed',{p_before:before,p_before_id:id});if(error)return json({error:'The community feed is temporarily unavailable.'},503);
 const {data:people,error:peopleError}=await client.rpc('community_people',{p_ids:[...new Set((data??[]).map((p:any)=>p.author_id))]});
 if(peopleError)return json({error:'Feed authors could not be loaded.'},503);
 return json({posts:data??[],people:people??[],viewer:user?.id??null,admin:!!context.locals.access?.roles.includes('admin')});
};
export const POST:APIRoute=async context=>{
 const client=labClient(context);if(!client)return json({error:'Community is temporarily unavailable.'},503);
 const {data:{user}}=await client.auth.getUser();if(!user)return json({error:'Sign in to participate.'},401);
 let body;try{body=await communityJson(context.request);}catch{return json({error:'Invalid request.'},400);}
 if(!body||typeof body.action!=='string')return json({error:'Choose a valid action.'},400);
 let result;
 switch(body.action){
 case 'post':
  if(!validUuid(body.build)||typeof body.caption!=='string'||body.caption.trim().length>1000)return json({error:'Choose a build and use up to 1,000 characters.'},400);
  result=await client.rpc('community_publish',{p_build:body.build,p_caption:body.caption.trim()});break;
 case 'publish':{
  if(typeof body.caption!=='string'||body.caption.trim().length>1000||(!body.design&&!body.run))return json({error:'Choose a build and use up to 1,000 caption characters.'},400);
  let state:Record<string,unknown>,results:Record<string,unknown>|null=null,name:string;
  if(body.design&&typeof body.design==='object'){
   let design;try{design=communityDesign(body.design);}catch{return json({error:'Choose valid design dimensions and finishes.'},400);}name=design.name;state={community_design:design};
  }else{
   if(!body.run||typeof body.run!=='object'||!body.run.input||typeof body.run.input!=='object'||Array.isArray(body.run.input)||!body.run.device||typeof body.run.device!=='object'||Array.isArray(body.run.device))return json({error:'Calculate a valid result before sharing.'},400);
   let configuration;try{configuration=sharedConfiguration(body.run.configuration);}catch{return json({error:'Choose a valid simulation configuration.'},400);}
   name=typeof body.run.input.name==='string'?body.run.input.name.slice(0,120):'Device concept';state={input:body.run.input,...(configuration?{configuration}:{})};results={device:body.run.device,battery:body.run.battery??null,endurance:body.run.endurance??null};
  }
  result=await client.rpc('community_create_post',{p_name:name,p_state:state,p_results:results,p_caption:body.caption.trim(),p_fork:validUuid(body.forkedFrom)?body.forkedFrom:null});break;
 }
 case 'fork':{
  if(!validUuid(body.build))return json({error:'Choose an available build.'},400);
  const {data:source,error}=await client.from('simulations').select('name,device_key,configuration_source,processor_key,state,result_snapshot').eq('id',body.build).eq('visibility','public').maybeSingle();
  if(error||!source)return json({error:'Build unavailable.'},404);
  const {data:copy,error:copyError}=await client.from('simulations').insert({owner_id:user.id,name:(source.name+' (fork)').slice(0,120),device_key:source.device_key,configuration_source:source.configuration_source,processor_key:source.processor_key,state:source.state,result_snapshot:source.result_snapshot,forked_from:body.build,visibility:'private'}).select('id,name,visibility').single();
  return copyError?json({error:'A verified active account is required to fork.'},403):json({saved:true,build:copy});
 }
 case 'reply':
  if(!validUuid(body.post)||typeof body.text!=='string'||body.text.trim().length<1||body.text.trim().length>600)return json({error:'Replies need 1–600 characters.'},400);
  result=await client.from('community_replies').insert({post_id:body.post,author_id:user.id,body:body.text.trim()}).select('id').single();break;
 case 'like':case 'unlike':
  if(!validUuid(body.post))return json({error:'Invalid post.'},400);
  result=body.action==='like'?await client.from('community_likes').insert({post_id:body.post,user_id:user.id}):await client.from('community_likes').delete().eq('post_id',body.post).eq('user_id',user.id);break;
 case 'follow':case 'unfollow':
  if(!validUuid(body.person)||body.person===user.id)return json({error:'Choose another creator.'},400);
  result=body.action==='follow'?await client.from('community_follows').insert({follower_id:user.id,following_id:body.person}):await client.from('community_follows').delete().eq('follower_id',user.id).eq('following_id',body.person);break;
 case 'delete-post':case 'delete-reply':
  if(!validUuid(body.id))return json({error:'Invalid item.'},400);
  result=await client.from(body.action==='delete-post'?'community_posts':'community_replies').delete().eq('id',body.id).select('id');
  if(!result.error&&!result.data?.length)return json({error:'Item unavailable or you cannot remove it.'},404);break;
 default:return json({error:'Unknown community action.'},400);
 }
 if(result.error){
  if(result.error.code==='23505'&&['like','follow'].includes(body.action))return json({saved:true});
  const code=result.error.code;return json({error:code==='23503'?'Create your public creator profile first and choose an available build.':code==='42501'?'A verified active account and permission for this build are required.':code==='P0001'?'You are posting too quickly. Please try again later.':'This action could not be completed. Please retry.'},code==='42501'?403:code==='P0001'?429:409);
 }
 return json({saved:true});
};
