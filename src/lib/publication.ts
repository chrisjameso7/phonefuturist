import { createClient } from '@supabase/supabase-js';
import { settings } from './supabase';
import type { PublishedArticle } from './editorial';
export async function publishedArticles(path:string|null=null,offset=0,section:string|null=null):Promise<{articles:PublishedArticle[];unavailable:boolean}> {
 const config=settings();if(!config)return {articles:[],unavailable:true};
 // Public projection uses a fresh anonymous client: no reader session or private Studio data.
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await client.rpc('public_articles',{p_path:path,p_offset:offset,p_section:section});
 return {articles:error?[]:data as PublishedArticle[],unavailable:!!error};
}

