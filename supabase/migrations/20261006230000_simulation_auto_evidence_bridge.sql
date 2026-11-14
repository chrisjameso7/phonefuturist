-- Sanitized evidence bridge for Interactive Leaks Auto mode.
-- Raw intelligence tables remain private. This projection exposes only the
-- active claim fields and source metadata needed to build a simulation model.
-- It never exposes private_notes or intelligence audit history.

create or replace function public.simulation_evidence_bundle(p_device_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'device', jsonb_build_object(
      'id', d.id,
      'brand', d.brand,
      'name', d.name,
      'slug', d.slug,
      'category', d.category,
      'lifecycle', d.lifecycle
    ),
    'claims', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'property_key', c.property_key,
          'value', c.value_json,
          'unit', c.unit,
          'provenance', c.provenance,
          'confidence', c.confidence,
          'confidence_reason', c.confidence_reason,
          'sources', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'label', s.label,
                'url', s.url,
                'source_type', s.source_type,
                'published_at', s.published_at,
                'relationship', ce.relationship,
                'note', ce.note
              )
              order by s.published_at desc nulls last, s.created_at desc
            )
            from private.claim_evidence ce
            join private.intelligence_sources s on s.id = ce.source_id
            where ce.claim_id = c.id
          ), '[]'::jsonb)
        )
        order by c.updated_at desc
      )
      from private.device_claims c
      where c.device_id = d.id
        and c.status = 'active'
        and (c.valid_until is null or c.valid_until >= now())
    ), '[]'::jsonb)
  )
  from private.devices d
  where d.slug = p_device_slug
  limit 1;
$$;

revoke all on function public.simulation_evidence_bundle(text)
from public, anon, authenticated;

grant execute on function public.simulation_evidence_bundle(text)
to anon, authenticated;
