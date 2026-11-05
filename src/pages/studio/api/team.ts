import type { APIRoute } from 'astro';
import { boundedJson, safeHttps, validUuid } from '../../../lib/editorial';
import { json } from '../../../lib/labs/http';

export const POST: APIRoute = async context => {
  if (!context.locals.access?.roles.includes('admin') || !context.locals.supabase) {
    return json({ error: 'Admin access required.' }, 403);
  }
  try {
    const body = await boundedJson(context.request);
    const client = context.locals.supabase;
    const id = body.id;
    if (id && !validUuid(id)) return json({ error: 'Invalid team member.' }, 400);
    if (id && (!Number.isInteger(body.version) || Number(body.version) < 1)) {
      return json({ error: 'Reload this member before saving.' }, 400);
    }
    if (body.action === 'delete' && validUuid(id)) {
      const { data, error } = await client.from('team_members').delete()
        .eq('id', id).eq('version', body.version).select('id');
      if (error) return json({ error: 'The member could not be removed.' }, 503);
      if (!data?.length) return json({ error: 'This member changed. Reload before removing it.' }, 409);
      return json({ removed: id });
    }
    if (body.action !== 'save' || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return json({ error: 'Invalid team request.' }, 400);
    }
    const source = body.data as Record<string, unknown>;
    const limits = { slug: 80, name: 120, title: 120, bio: 6000, responsibilities: 3000, interests: 2000, image_url: 2000 };
    const data: Record<string, unknown> = {};
    for (const [field, limit] of Object.entries(limits)) {
      if (typeof source[field] !== 'string' || source[field].length > limit) {
        return json({ error: 'Check the ' + field.replaceAll('_', ' ') + ' field.' }, 400);
      }
      data[field] = source[field].trim();
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(data.slug)) || String(data.slug).length < 3 || !data.name || !data.title) {
      return json({ error: 'Enter a name, role and a lowercase profile slug using letters, numbers and hyphens.' }, 400);
    }
    if (data.image_url && !safeHttps(data.image_url)) return json({ error: 'Use an HTTPS photo URL.' }, 400);
    if (source.user_id !== null && !validUuid(source.user_id)) return json({ error: 'Choose an existing account.' }, 400);
    if (typeof source.published !== 'boolean' || !Number.isInteger(source.sort_order) || Number(source.sort_order) < 0 || Number(source.sort_order) > 10000) {
      return json({ error: 'Check publication status and display order.' }, 400);
    }
    for (const [field, valueKey, maximum] of [['social_links', 'url', 12], ['extra_details', 'value', 20]] as const) {
      const items = source[field];
      if (!Array.isArray(items) || items.length > maximum) return json({ error: 'Too many profile details.' }, 400);
      for (const item of items) {
        if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 80 ||
            typeof item[valueKey] !== 'string' || !item[valueKey].trim() || item[valueKey].length > 2000 ||
            (valueKey === 'url' && !safeHttps(item[valueKey]))) {
          return json({ error: 'Enter a label and valid value for every detail. Social links must use HTTPS.' }, 400);
        }
      }
      data[field] = items;
    }
    Object.assign(data, { user_id: source.user_id, published: source.published, sort_order: source.sort_order });
    const query = validUuid(id)
      ? client.from('team_members').update(data).eq('id', id).eq('version', body.version).select().maybeSingle()
      : client.from('team_members').insert(data).select().single();
    const { data: member, error } = await query;
    if (error) {
      if (error.code === '23505') return json({ error: 'That profile slug is already in use.' }, 409);
      return json({ error: 'Check the profile details and try again.' }, error.code === '42501' ? 403 : 400);
    }
    if (!member) return json({ error: 'This member changed. Reload before saving. Your edits are still here.' }, 409);
    return json({ member });
  } catch {
    return json({ error: 'The team request could not be read. Please retry.' }, 400);
  }
};
