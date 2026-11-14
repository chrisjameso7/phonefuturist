import type { SupabaseClient } from '@supabase/supabase-js';

export type TeamLink = { label: string; url: string };
export type TeamDetail = { label: string; value: string };
export type TeamMember = {
  id: string; slug: string; user_id: string | null; name: string; title: string;
  bio: string; responsibilities: string; interests: string; image_url: string;
  social_links: TeamLink[]; extra_details: TeamDetail[];
  published: boolean; sort_order: number; version: number;
};
export const emptyTeamMember = (): TeamMember => ({
  id: '', slug: '', user_id: null, name: '', title: '', bio: '',
  responsibilities: '', interests: '', image_url: '',
  social_links: [], extra_details: [], published: false, sort_order: 0, version: 1,
});
export async function publicTeam(client: SupabaseClient | null) {
  if (!client) return { members: [] as TeamMember[], unavailable: true };
  const { data, error } = await client.from('team_members').select('*')
    .eq('published', true).order('sort_order').order('name').order('id');
  return { members: (data ?? []) as TeamMember[], unavailable: !!error };
}
