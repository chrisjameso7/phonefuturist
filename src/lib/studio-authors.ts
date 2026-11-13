import type { SupabaseClient } from '@supabase/supabase-js';
export type StudioAuthor = { user_id: string; display_name: string; handle: string };
export async function studioAuthors(client: SupabaseClient, userId: string) {
 const [directory, profile] = await Promise.all([
  client.rpc('studio_authors'),
  client.from('creator_profiles').select('user_id,display_name,handle').eq('user_id',userId).maybeSingle(),
 ]);
 const own = profile.data as StudioAuthor | null;
 const authors = directory.error ? own ? [own] : [] : directory.data as StudioAuthor[];
 return { authors, currentAuthor: own, directoryUnavailable: !!directory.error };
}
