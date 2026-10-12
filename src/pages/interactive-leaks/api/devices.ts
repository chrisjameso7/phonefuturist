import type { APIRoute } from 'astro';
import { serverClient, settings } from '../../../lib/supabase';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const client = locals.supabase ?? (settings() ? serverClient(cookies, request) : null);
  if (!client) return json({ error: 'Device search is not configured.' }, 503);

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);

  const { data, error } = await client.rpc('simulation_device_search', { p_query: query });
  if (error) return json({ error: 'Could not search devices.' }, 500);

  return json({ data: Array.isArray(data) ? data : [] });
};
