import type {SupabaseClient} from '@supabase/supabase-js';
/** Existing administrator-managed badge table: clients have SELECT only, never self-assignment. */
export async function proMembers(client:SupabaseClient,ids:readonly string[]):Promise<Set<string>|null>{
 const unique=[...new Set(ids)].slice(0,50);if(!unique.length)return new Set();
 const {data,error}=await client.from('user_badges').select('user_id').eq('badge_name','Pro').in('user_id',unique);
 return error?null:new Set((data??[]).map((row:{user_id:string})=>row.user_id));
}
