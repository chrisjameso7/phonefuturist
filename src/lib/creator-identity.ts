import {proMembers} from './billing/pro-members';
import type {SupabaseClient} from '@supabase/supabase-js';
export type CreatorRole='admin'|'writer'|'pro'|'user';
export const ROLE_BADGES={admin:{label:'Admin',background:'#fbbf24',color:'#000000'},writer:{label:'Writer',background:'#10b981',color:'#ffffff'},pro:{label:'Pro',background:'#3b82f6',color:'#ffffff'},user:null} as const;
export function creatorRole(roles:readonly string[],pro=false):CreatorRole{return roles.includes('admin')?'admin':roles.some(r=>['writer','editor','publisher'].includes(r))?'writer':pro?'pro':'user';}
export async function publicCreatorRoles(client:SupabaseClient,ids:string[]){
 const unique=[...new Set(ids)].slice(0,50);if(!unique.length)return new Map<string,CreatorRole>();
 const [{data,error},pros]=await Promise.all([client.from('creator_profiles').select('user_id,verification_badge').in('user_id',unique),proMembers(client,unique)]);
 if(error)return new Map<string,CreatorRole>();
 return new Map<string,CreatorRole>((data??[]).map((r:{user_id:string;verification_badge:string|null})=>[r.user_id,r.verification_badge==='gold'?'admin':r.verification_badge==='green'?'writer':pros?.has(r.user_id)?'pro':'user']));
}
export async function searchCreators(client:SupabaseClient,raw:string){
 const query=raw.trim().replace(/^@/,'');if(!/^[a-z0-9_]{1,20}$/.test(query))return {rows:[],error:'Search using lowercase letters, numbers, and underscores.'};
 const {data,error}=await client.from('creator_profiles').select('user_id,handle,display_name,avatar_url')
 .gte('handle',query).lt('handle',query+'\uffff').like('handle',query.replaceAll('_','\\_')+'%').order('handle').limit(12);
 return {rows:data??[],error:error?'Creator search is temporarily unavailable. Please retry.':''};
}
